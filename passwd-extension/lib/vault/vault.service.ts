import { z } from 'zod';
import {
	decryptJson,
	encryptJson,
	openSymmetricKey,
	randomBytes,
	sealSymmetricKey,
	encodePublicKey,
	type AccessLevel,
	type VaultEnvelope
} from '../crypto';
import { deleteVaultItem, syncVault, upsertVaultItem, type SyncItem, type KeyWrap } from '../api/vault';
import { listVaultShareRecipients } from '../api/vaults';
import { fetchUserPublic } from '../api/identity';
import { getActiveVaultId, getIdentityKeyPair, getUnlockedUserId, getVaultKey } from '../session/session.store';
import { sameRegistrableDomain } from './domain-match';
import type { SuggestionItem, VaultItemSummary } from '../messaging/protocol';

/** Port of passwd-svelte's src/lib/types/vault-item.ts. */
const vaultItemPlaintextSchema = z.object({
	title: z.string().min(1).max(200),
	username: z.string().max(500).default(''),
	password: z.string().max(2000).default(''),
	url: z.string().max(2000).default(''),
	notes: z.string().max(10_000).default(''),
	kind: z.enum(['login', 'note']).default('login')
});
type VaultItemPlaintext = z.infer<typeof vaultItemPlaintextSchema>;

type DecryptedVaultItem = {
	id: string;
	ownerId: string;
	vaultId: string | null;
	version: number;
	updatedAt: string;
	accessLevel: AccessLevel | string;
	cryptoMode: string;
	itemKey: Uint8Array | null;
	data: VaultItemPlaintext;
};

function requireVaultKey(): Uint8Array {
	const key = getVaultKey();
	if (!key) throw new Error('Vault is locked');
	return key;
}

function requireIdentity() {
	const kp = getIdentityKeyPair();
	if (!kp) throw new Error('Identity keypair missing — unlock again');
	return kp;
}

function requireUserId(): string {
	const id = getUnlockedUserId();
	if (!id) throw new Error('Not signed in');
	return id;
}

/** Group-shared items are not resolvable from the extension (no groups.ts/API here) — they're skipped, not corrupted. */
async function resolveItemKey(item: SyncItem): Promise<Uint8Array | null> {
	if (item.cryptoMode !== 'item_key') return null;
	if (!item.wrappedItemKey) return null;
	if (item.shareRecipientType === 'group') return null;
	const identity = requireIdentity();
	return openSymmetricKey(item.wrappedItemKey, identity);
}

let cachedItems: DecryptedVaultItem[] | null = null;

export function invalidateCache(): void {
	cachedItems = null;
}

/** Port of passwd-svelte's vault.controller.ts loadDecryptedVault, with an in-memory cache since suggestions/fills query this on every field focus. */
async function loadDecryptedVault(forceRefresh = false): Promise<DecryptedVaultItem[]> {
	if (cachedItems && !forceRefresh) return cachedItems;

	const vaultKey = requireVaultKey();
	requireIdentity();
	const userId = requireUserId();
	const { items } = await syncVault(null);
	const out: DecryptedVaultItem[] = [];

	for (const item of items) {
		if (item.deletedAt) continue;
		try {
			let data: VaultItemPlaintext;
			let itemKey: Uint8Array | null = null;

			if (item.cryptoMode === 'item_key') {
				itemKey = await resolveItemKey(item);
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
	cachedItems = out;
	return out;
}

/** Wraps a freshly-created item key for the owner + any existing 'user' share recipients on the vault. */
async function buildRecipientWraps(itemKey: Uint8Array, vaultId: string, ownerId: string): Promise<KeyWrap[]> {
	const identity = requireIdentity();
	const wraps: KeyWrap[] = [
		{
			recipientType: 'user',
			recipientId: ownerId,
			wrappedItemKey: sealSymmetricKey(itemKey, encodePublicKey(identity.publicKey)),
			accessLevel: 'owner',
			keyVersion: 1
		}
	];

	const recipients = await listVaultShareRecipients(vaultId);
	for (const r of recipients) {
		if (r.recipientType !== 'user' || r.recipientId === ownerId) continue;
		const publicKey = (await fetchUserPublic(r.recipientId)).publicKey;
		wraps.push({
			recipientType: 'user',
			recipientId: r.recipientId,
			wrappedItemKey: sealSymmetricKey(itemKey, publicKey),
			accessLevel: (r.accessLevel as AccessLevel) || 'viewer',
			keyVersion: 1
		});
	}

	return wraps;
}

/** Port of passwd-svelte's vault.controller.ts saveVaultItem, trimmed to the extension's create/update paths (no group shares). */
async function saveVaultItem(input: {
	id?: string;
	version?: number;
	itemKey?: Uint8Array | null;
	cryptoMode?: string;
	data: VaultItemPlaintext;
}): Promise<DecryptedVaultItem> {
	const vaultKeyBytes = requireVaultKey();
	const userId = requireUserId();
	const data = vaultItemPlaintextSchema.parse(input.data);
	const id = input.id ?? crypto.randomUUID();
	const version = (input.version ?? 0) + 1;
	const updatedAt = new Date().toISOString();
	const vaultId = getActiveVaultId();

	if (input.itemKey && input.cryptoMode === 'item_key' && vaultId) {
		// Update: reuse the existing item key so other members' key wraps stay valid — no rewrap needed.
		const itemKey = new Uint8Array(input.itemKey);
		const envelope: VaultEnvelope = encryptJson(data, itemKey);
		await upsertVaultItem({
			id,
			ownerId: userId,
			vaultId,
			envelope,
			cryptoMode: 'item_key',
			itemType: data.kind,
			version,
			updatedAt
		});
		invalidateCache();
		return { id, ownerId: userId, vaultId, version, updatedAt, accessLevel: 'owner', cryptoMode: 'item_key', itemKey, data };
	}

	if (vaultId) {
		const itemKey = randomBytes(32);
		const envelope: VaultEnvelope = encryptJson(data, itemKey);
		const keyWraps = await buildRecipientWraps(itemKey, vaultId, userId);
		await upsertVaultItem({
			id,
			ownerId: userId,
			vaultId,
			envelope,
			cryptoMode: 'item_key',
			itemType: data.kind,
			version,
			updatedAt,
			keyWraps
		});
		invalidateCache();
		return { id, ownerId: userId, vaultId, version, updatedAt, accessLevel: 'owner', cryptoMode: 'item_key', itemKey, data };
	}

	const envelope: VaultEnvelope = encryptJson(data, vaultKeyBytes);
	await upsertVaultItem({
		id,
		ownerId: userId,
		envelope,
		cryptoMode: 'legacy_vault_key',
		itemType: data.kind,
		version,
		updatedAt
	});
	invalidateCache();
	return {
		id,
		ownerId: userId,
		vaultId: null,
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
	invalidateCache();
}

/** Same-registrable-domain matching (decision 5, widened) — path-restricted / "anywhere" rules are still future work. */
function findMatchesForOrigin(origin: string, items: DecryptedVaultItem[]): DecryptedVaultItem[] {
	return items.filter((item) => {
		if (item.data.kind !== 'login' || !item.data.url) return false;
		return sameRegistrableDomain(origin, item.data.url);
	});
}

function toSummary(item: DecryptedVaultItem): VaultItemSummary {
	return {
		id: item.id,
		title: item.data.title,
		username: item.data.username,
		password: item.data.password,
		url: item.data.url,
		updatedAt: item.updatedAt
	};
}

function matchesQuery(item: DecryptedVaultItem, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return [item.data.title, item.data.username, item.data.url].some((field) => field.toLowerCase().includes(q));
}

export async function getVaultItems(query?: string): Promise<VaultItemSummary[]> {
	const items = await loadDecryptedVault();
	const filtered = query ? items.filter((item) => matchesQuery(item, query)) : items;
	return filtered.map(toSummary);
}

export async function getSuggestionsForOrigin(origin: string): Promise<SuggestionItem[]> {
	const items = await loadDecryptedVault();
	return findMatchesForOrigin(origin, items).map((item) => ({
		id: item.id,
		title: item.data.title,
		username: item.data.username,
		url: item.data.url
	}));
}

export async function fillLogin(
	origin: string,
	itemId: string
): Promise<{ username: string; password: string } | { error: string }> {
	const items = await loadDecryptedVault();
	const item = findMatchesForOrigin(origin, items).find((i) => i.id === itemId);
	if (!item) return { error: 'No matching credential for this origin' };
	return { username: item.data.username, password: item.data.password };
}

/** Used by save-detection to decide create vs update and to fetch the existing item key for a safe update. */
export async function findExistingLoginForOrigin(
	origin: string,
	username: string
): Promise<{ id: string; version: number; itemKey: Uint8Array | null; cryptoMode: string } | null> {
	const items = await loadDecryptedVault();
	const existing = findMatchesForOrigin(origin, items).find(
		(item) => item.data.username.toLowerCase() === username.toLowerCase()
	);
	if (!existing) return null;
	return { id: existing.id, version: existing.version, itemKey: existing.itemKey, cryptoMode: existing.cryptoMode };
}

export async function saveLogin(input: {
	mode: 'create' | 'update';
	itemId?: string;
	data: { title: string; username: string; password: string; url: string };
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
	try {
		const plaintext: VaultItemPlaintext = {
			title: input.data.title,
			username: input.data.username,
			password: input.data.password,
			url: input.data.url,
			notes: '',
			kind: 'login'
		};

		if (input.mode === 'update' && input.itemId) {
			const items = await loadDecryptedVault();
			const existing = items.find((item) => item.id === input.itemId);
			if (!existing) return { ok: false, error: 'Item not found' };
			const saved = await saveVaultItem({
				id: existing.id,
				version: existing.version,
				itemKey: existing.itemKey,
				cryptoMode: existing.cryptoMode,
				data: plaintext
			});
			return { ok: true, id: saved.id };
		}

		const saved = await saveVaultItem({ data: plaintext });
		return { ok: true, id: saved.id };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
	}
}
