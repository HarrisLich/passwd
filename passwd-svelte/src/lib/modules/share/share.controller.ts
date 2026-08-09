import {
	generateBoxKeyPair,
	openSealedBase64,
	publicKeyFingerprint,
	encodePublicKey,
	sealBytesToBase64,
	sealSymmetricKey,
	type AccessLevel,
	type BoxKeyPair
} from '$lib/infra/crypto';
import { lookupUserByEmail, type PublicUser } from '$lib/infra/api/identity';
import { addGroupMember, createGroup, listGroups } from '$lib/infra/api/groups';
import { grantItemShares, grantVaultShare } from '$lib/infra/api/vaults';
import { getIdentityKeyPair, getUnlockedUserId } from '$lib/stores/vault.svelte';
import type { DecryptedVaultItem } from '$lib/types/vault-item';

function requireIdentity(): BoxKeyPair {
	const kp = getIdentityKeyPair();
	if (!kp) throw new Error('Identity keypair missing');
	return kp;
}

export async function findShareRecipient(email: string): Promise<PublicUser> {
	return lookupUserByEmail(email);
}

/**
 * Share selected items with a user at an access level.
 * Each checked item's key is re-wrapped to their public key client-side.
 */
export async function shareItemsWithUser(input: {
	recipient: PublicUser;
	accessLevel: AccessLevel;
	items: DecryptedVaultItem[];
}): Promise<{ shared: number }> {
	const wraps = [];
	for (const item of input.items) {
		if (!item.itemKey || !item.vaultId) {
			throw new Error(
				`“${item.data.title}” cannot be shared yet — open and save it once to upgrade to item keys`
			);
		}
		wraps.push({
			itemId: item.id,
			itemOwnerId: item.ownerId,
			vaultId: item.vaultId,
			wrappedItemKey: sealSymmetricKey(item.itemKey, input.recipient.publicKey),
			keyVersion: 1
		});
	}

	await grantItemShares({
		recipientType: 'user',
		recipientId: input.recipient.id,
		accessLevel: input.accessLevel,
		wraps
	});

	return { shared: wraps.length };
}

/**
 * Vault-level share: fan-out wraps for selected (or all) items + inheritance metadata.
 */
export async function shareVaultWithUser(input: {
	vaultId: string;
	recipient: PublicUser;
	accessLevel: AccessLevel;
	items: DecryptedVaultItem[];
}): Promise<{ shared: number }> {
	const itemWraps = [];
	for (const item of input.items) {
		if (!item.itemKey || item.vaultId !== input.vaultId) continue;
		itemWraps.push({
			itemId: item.id,
			itemOwnerId: item.ownerId,
			wrappedItemKey: sealSymmetricKey(item.itemKey, input.recipient.publicKey),
			keyVersion: 1
		});
	}

	await grantVaultShare({
		vaultId: input.vaultId,
		recipientType: 'user',
		recipientId: input.recipient.id,
		accessLevel: input.accessLevel,
		itemWraps
	});

	return { shared: itemWraps.length };
}

export async function createShareGroup(name: string) {
	const identity = requireIdentity();
	const groupKp = generateBoxKeyPair();
	const wrappedGroupPrivateKey = sealBytesToBase64(groupKp.secretKey, encodePublicKey(identity.publicKey));
	const group = await createGroup({
		name,
		publicKey: encodePublicKey(groupKp.publicKey),
		fingerprint: publicKeyFingerprint(groupKp.publicKey),
		wrappedGroupPrivateKey
	});
	groupKp.secretKey.fill(0);
	return group;
}

export async function inviteUserToGroup(input: {
	groupId: string;
	memberEmail: string;
	role?: 'member' | 'admin';
}) {
	const identity = requireIdentity();
	const groups = await listGroups();
	const group = groups.find((g) => g.id === input.groupId);
	if (!group) throw new Error('Group not found');

	const groupSk = openSealedBase64(group.wrappedGroupPrivateKey, identity);
	const recipient = await lookupUserByEmail(input.memberEmail);
	const wrappedForMember = sealBytesToBase64(groupSk, recipient.publicKey);
	groupSk.fill(0);

	await addGroupMember({
		groupId: input.groupId,
		userId: recipient.id,
		role: input.role ?? 'member',
		wrappedGroupPrivateKey: wrappedForMember
	});

	return recipient;
}

/**
 * Share selected items with a group (wrap once to group pubkey).
 */
export async function shareItemsWithGroup(input: {
	groupId: string;
	accessLevel: AccessLevel;
	items: DecryptedVaultItem[];
}) {
	const groups = await listGroups();
	const group = groups.find((g) => g.id === input.groupId);
	if (!group) throw new Error('Group not found');

	const wraps = [];
	for (const item of input.items) {
		if (!item.itemKey || !item.vaultId) {
			throw new Error(
				`“${item.data.title}” cannot be shared yet — open and save it once to upgrade to item keys`
			);
		}
		wraps.push({
			itemId: item.id,
			itemOwnerId: item.ownerId,
			vaultId: item.vaultId,
			wrappedItemKey: sealSymmetricKey(item.itemKey, group.publicKey),
			keyVersion: 1
		});
	}

	await grantItemShares({
		recipientType: 'group',
		recipientId: input.groupId,
		accessLevel: input.accessLevel,
		wraps
	});

	return { shared: wraps.length };
}

export function canManageShares(accessLevel: string | undefined): boolean {
	return accessLevel === 'owner' || accessLevel === 'manager';
}

export function currentUserId(): string | null {
	return getUnlockedUserId();
}
