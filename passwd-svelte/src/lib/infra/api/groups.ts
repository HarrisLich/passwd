import { apiFetch } from '$lib/infra/api/client';

export type GroupMembership = {
	id: string;
	name: string;
	ownerId: string;
	publicKey: string;
	fingerprint: string;
	role: string;
	wrappedGroupPrivateKey: string;
};

export async function listGroups(): Promise<GroupMembership[]> {
	const res = await apiFetch('/v1/groups');
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string }).error ?? 'List groups failed');
	return (data as { groups: GroupMembership[] }).groups;
}

export async function createGroup(input: {
	name: string;
	publicKey: string;
	fingerprint: string;
	wrappedGroupPrivateKey: string;
}): Promise<{ id: string; name: string; publicKey: string }> {
	const res = await apiFetch('/v1/groups', {
		method: 'POST',
		body: JSON.stringify(input)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Create group failed');
	return data as { id: string; name: string; publicKey: string };
}

export async function addGroupMember(input: {
	groupId: string;
	userId: string;
	role?: 'member' | 'admin';
	wrappedGroupPrivateKey: string;
}): Promise<void> {
	const res = await apiFetch(`/v1/groups/${input.groupId}/members`, {
		method: 'POST',
		body: JSON.stringify({
			userId: input.userId,
			role: input.role ?? 'member',
			wrappedGroupPrivateKey: input.wrappedGroupPrivateKey
		})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { message?: string }).message ??
				(data as { error?: string }).error ??
				`Add member failed (${res.status})`
		);
	}
}

export async function fetchGroupPublic(groupId: string): Promise<{
	id: string;
	name: string;
	publicKey: string;
	fingerprint: string;
}> {
	const res = await apiFetch(`/v1/groups/${groupId}`);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Group not found');
	return data as { id: string; name: string; publicKey: string; fingerprint: string };
}
