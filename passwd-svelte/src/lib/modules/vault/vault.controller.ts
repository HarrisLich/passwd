import {
	decryptJson,
	encryptJson,
	openSealedBase64,
	openSymmetricKey,
	randomBytes,
	sealSymmetricKey,
	decodePublicKey,
	encodePublicKey,
	type AccessLevel,
	type BoxKeyPair,
	type VaultEnvelope
} from '$lib/infra/crypto';
import { deleteVaultItem, syncVault, upsertVaultItem, type SyncItem } from '$lib/infra/api/vault';
import { fetchGroupPublic, listGroups, type GroupMembership } from '$lib/infra/api/groups';
import { listVaultShareRecipients } from '$lib/infra/api/vaults';
import { fetchUserPublic } from '$lib/infra/api/identity';
import {
	getActiveVaultId,
	getIdentityKeyPair,
	getUnlockedUserId,
	getVaultKey
} from '$lib/stores/vault.svelte';
import {
	vaultItemPlaintextSchema,
	type DecryptedVaultItem,
	type VaultItemPlaintext
} from '$lib/types/vault-item';

function requireVaultKey(): Uint8Array {
	const key = getVaultKey();
	if (!key) throw new Error('Vault is locked');
	return key;
}

function requireIdentity(): BoxKeyPair {
	const kp = getIdentityKeyPair();
	if (!kp) throw new Error('Identity keypair missing — unlock again');
	return kp;
}

function requireUserId(): string {
	const id = getUnlockedUserId();
	if (!id) throw new Error('Not signed in');
	return id;
}

async function resolveItemKey(item: SyncItem, groups: GroupMembership[]): Promise<Uint8Array | null> {
	if (item.cryptoMode !== 'item_key') return null;
	if (!item.wrappedItemKey) return null;

	const identity = requireIdentity();

	if (item.shareRecipientType === 'group' && item.shareRecipientId) {
		const group = groups.find((g) => g.id === item.shareRecipientId);
		if (!group) return null;
		const groupSk = openSealedBase64(group.wrappedGroupPrivateKey, identity);
		const groupKp: BoxKeyPair = {
			publicKey: decodePublicKey(group.publicKey),
			secretKey: groupSk
		};
		try {
			return openSymmetricKey(item.wrappedItemKey, groupKp);
		} finally {
			groupSk.fill(0);
		}
	}

	return openSymmetricKey(item.wrappedItemKey, identity);
}

export async function loadDecryptedVault(): Promise<DecryptedVaultItem[]> {
	const vaultKey = requireVaultKey();
	requireIdentity();
	const userId = requireUserId();
	const [{ items }, groups] = await Promise.all([syncVault(null), listGroups()]);
	const out: DecryptedVaultItem[] = [];

	for (const item of items) {
		if (item.deletedAt) continue;
		try {
			let data: VaultItemPlaintext;
			let itemKey: Uint8Array | null = null;

			if (item.cryptoMode === 'item_key') {
				itemKey = await resolveItemKey(item, groups);
				if (!itemKey) continue;
				data = vaultItemPlaintextSchema.parse(decryptJson(item.envelope, itemKey));
			} else {
				data = vaultItemPlaintextSchema.parse(decryptJson(item.envelope, vaultKey));
			}

			out.push({
				id: item.id,
				ownerId: item.ownerId ?? userId,
				vaultId: item.vaultId,
				version: item.version,
				updatedAt: item.updatedAt,
				accessLevel: item.accessLevel ?? (item.ownerId === userId ? 'owner' : 'viewer'),
				cryptoMode: item.cryptoMode,
				itemKey,
				data
			});
		} catch {
			// Skip items that fail to decrypt rather than crashing the list.
		}
	}

	out.sort((a, b) => a.data.title.localeCompare(b.data.title));
	return out;
}

async function buildRecipientWraps(
	itemKey: Uint8Array,
	vaultId: string,
	ownerId: string
): Promise<
	Array<{
		recipientType: 'user' | 'group';
		recipientId: string;
		wrappedItemKey: string;
		accessLevel: AccessLevel;
		keyVersion: number;
	}>
> {
	const identity = requireIdentity();
	const ownerPublicKey =
		ownerId === requireUserId()
			? encodePublicKey(identity.publicKey)
			: (await fetchUserPublic(ownerId)).publicKey;

	const wraps: Array<{
		recipientType: 'user' | 'group';
		recipientId: string;
		wrappedItemKey: string;
		accessLevel: AccessLevel;
		keyVersion: number;
	}> = [
		{
			recipientType: 'user',
			recipientId: ownerId,
			wrappedItemKey: sealSymmetricKey(itemKey, ownerPublicKey),
			accessLevel: 'owner',
			keyVersion: 1
		}
	];

	const recipients = await listVaultShareRecipients(vaultId);
	for (const r of recipients) {
		if (r.recipientType === 'user' && r.recipientId === ownerId) continue;
		let publicKey: string;
		if (r.recipientType === 'user') {
			publicKey = (await fetchUserPublic(r.recipientId)).publicKey;
		} else {
			publicKey = (await fetchGroupPublic(r.recipientId)).publicKey;
		}
		wraps.push({
			recipientType: r.recipientType,
			recipientId: r.recipientId,
			wrappedItemKey: sealSymmetricKey(itemKey, publicKey),
			accessLevel: (r.accessLevel as AccessLevel) || 'viewer',
			keyVersion: 1
		});
	}

	return wraps;
}

export async function saveVaultItem(input: {
	id?: string;
	version?: number;
	ownerId?: string;
	vaultId?: string | null;
	itemKey?: Uint8Array | null;
	cryptoMode?: string;
	data: VaultItemPlaintext;
}): Promise<DecryptedVaultItem> {
	const vaultKey = requireVaultKey();
	const userId = requireUserId();
	const data = vaultItemPlaintextSchema.parse(input.data);
	const id = input.id ?? crypto.randomUUID();
	const version = (input.version ?? 0) + 1;
	const updatedAt = new Date().toISOString();
	const ownerId = input.ownerId ?? userId;
	const vaultId = input.vaultId ?? getActiveVaultId();

	// Prefer item-key mode for owned items in a vault.
	const useItemKey = ownerId === userId && Boolean(vaultId);

	if (useItemKey && vaultId) {
		const itemKey = input.itemKey ? new Uint8Array(input.itemKey) : randomBytes(32);
		const envelope: VaultEnvelope = encryptJson(data, itemKey);
		const keyWraps = await buildRecipientWraps(itemKey, vaultId, ownerId);

		await upsertVaultItem({
			id,
			ownerId,
			vaultId,
			envelope,
			cryptoMode: 'item_key',
			itemType: data.kind,
			version,
			updatedAt,
			keyWraps
		});

		return {
			id,
			ownerId,
			vaultId,
			version,
			updatedAt,
			accessLevel: 'owner',
			cryptoMode: 'item_key',
			itemKey,
			data
		};
	}

	// Legacy / shared edit path (re-encrypt with existing item key if present).
	if (input.itemKey && input.cryptoMode === 'item_key' && vaultId) {
		const itemKey = new Uint8Array(input.itemKey);
		const envelope: VaultEnvelope = encryptJson(data, itemKey);
		await upsertVaultItem({
			id,
			ownerId,
			vaultId,
			envelope,
			cryptoMode: 'item_key',
			itemType: data.kind,
			version,
			updatedAt
		});
		return {
			id,
			ownerId,
			vaultId,
			version,
			updatedAt,
			accessLevel: 'editor',
			cryptoMode: 'item_key',
			itemKey,
			data
		};
	}

	const envelope: VaultEnvelope = encryptJson(data, vaultKey);
	await upsertVaultItem({
		id,
		ownerId,
		vaultId: vaultId ?? undefined,
		envelope,
		cryptoMode: 'legacy_vault_key',
		itemType: data.kind,
		version,
		updatedAt
	});

	return {
		id,
		ownerId,
		vaultId: vaultId ?? null,
		version,
		updatedAt,
		accessLevel: 'owner',
		cryptoMode: 'legacy_vault_key',
		itemKey: null,
		data
	};
}

export async function removeVaultItem(id: string): Promise<void> {
	requireVaultKey();
	await deleteVaultItem(id);
}
