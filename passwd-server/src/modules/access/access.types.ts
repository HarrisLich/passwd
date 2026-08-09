import { z } from 'zod';

export const accessLevelSchema = z.enum(['viewer', 'editor', 'manager', 'owner']);
export type AccessLevel = z.infer<typeof accessLevelSchema>;

export const ACCESS_LEVEL_RANK: Record<AccessLevel, number> = {
	viewer: 1,
	editor: 2,
	manager: 3,
	owner: 4
};

export function hasAccessAtLeast(have: AccessLevel, need: AccessLevel): boolean {
	return ACCESS_LEVEL_RANK[have] >= ACCESS_LEVEL_RANK[need];
}

export const recipientTypeSchema = z.enum(['user', 'group']);
