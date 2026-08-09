import { relations, sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Better Auth core tables + Passwd vault / sharing metadata.
 * Server stores ciphertext and wrapped keys only — never plaintext vault/item keys.
 */

export const accessLevelEnum = ['viewer', 'editor', 'manager', 'owner'] as const;
export type AccessLevel = (typeof accessLevelEnum)[number];

export const recipientTypeEnum = ['user', 'group'] as const;
export type RecipientType = (typeof recipientTypeEnum)[number];

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
	image: text('image'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
	/** Public KDF params JSON (salts, memory, iterations). Not secret key material. */
	kdfParams: text('kdf_params').notNull(),
	/** X25519 public key (base64) for sealed-box wrapping. */
	publicKey: text('public_key'),
	/** Private key envelope encrypted with master-derived vault key. */
	encryptedPrivateKey: text('encrypted_private_key'),
	pubkeyFingerprint: text('pubkey_fingerprint')
});

export const session = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		token: text('token').notNull().unique(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = sqliteTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
		refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
		scope: text('scope'),
		/** Better Auth password hash of client-derived auth password — not the master password. */
		password: text('password'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = sqliteTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const vaults = sqliteTable(
	'vaults',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		ownerId: text('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => [index('vaults_owner_idx').on(table.ownerId)]
);

/** Vault-level grant — drives inheritance when new items are added. */
export const vaultShares = sqliteTable(
	'vault_shares',
	{
		vaultId: text('vault_id')
			.notNull()
			.references(() => vaults.id, { onDelete: 'cascade' }),
		recipientType: text('recipient_type').notNull(),
		recipientId: text('recipient_id').notNull(),
		accessLevel: text('access_level').notNull(),
		grantedBy: text('granted_by')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: text('created_at').notNull()
	},
	(table) => [
		primaryKey({
			columns: [table.vaultId, table.recipientType, table.recipientId]
		}),
		index('vault_shares_recipient').on(table.recipientType, table.recipientId)
	]
);

/**
 * Items: ciphertext only.
 * cryptoMode: legacy_vault_key | item_key
 * Legacy rows decrypt with personal K_vault; item_key rows need item_shares wrap.
 */
export const vaultItems = sqliteTable(
	'vault_items',
	{
		id: text('id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		vaultId: text('vault_id').references(() => vaults.id, { onDelete: 'cascade' }),
		envelopeJson: text('envelope_json').notNull(),
		cryptoMode: text('crypto_mode').notNull().default('legacy_vault_key'),
		itemType: text('item_type').notNull().default('login'),
		version: integer('version').notNull().default(1),
		updatedAt: text('updated_at').notNull(),
		deletedAt: text('deleted_at')
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.id] }),
		index('vault_items_user_updated').on(table.userId, table.updatedAt),
		index('vault_items_vault').on(table.vaultId)
	]
);

/** Per-item wrapped keys — the sharing table. */
export const itemShares = sqliteTable(
	'item_shares',
	{
		itemId: text('item_id').notNull(),
		itemOwnerId: text('item_owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		vaultId: text('vault_id')
			.notNull()
			.references(() => vaults.id, { onDelete: 'cascade' }),
		recipientType: text('recipient_type').notNull(),
		recipientId: text('recipient_id').notNull(),
		wrappedItemKey: text('wrapped_item_key').notNull(),
		accessLevel: text('access_level').notNull(),
		grantedBy: text('granted_by')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		keyVersion: integer('key_version').notNull().default(1),
		createdAt: text('created_at').notNull()
	},
	(table) => [
		primaryKey({
			columns: [table.itemOwnerId, table.itemId, table.recipientType, table.recipientId]
		}),
		index('item_shares_recipient').on(table.recipientType, table.recipientId),
		index('item_shares_vault').on(table.vaultId),
		index('item_shares_item').on(table.itemOwnerId, table.itemId)
	]
);

export const groups = sqliteTable(
	'groups',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		ownerId: text('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		publicKey: text('public_key').notNull(),
		pubkeyFingerprint: text('pubkey_fingerprint').notNull(),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => [index('groups_owner_idx').on(table.ownerId)]
);

export const groupMembers = sqliteTable(
	'group_members',
	{
		groupId: text('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default('member'),
		/** Group private key sealed to this member's public key. */
		wrappedGroupPrivateKey: text('wrapped_group_private_key').notNull(),
		createdAt: text('created_at').notNull()
	},
	(table) => [
		primaryKey({ columns: [table.groupId, table.userId] }),
		index('group_members_user').on(table.userId)
	]
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	vaultItems: many(vaultItems),
	ownedVaults: many(vaults)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] })
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] })
}));

export const vaultsRelations = relations(vaults, ({ one, many }) => ({
	owner: one(user, { fields: [vaults.ownerId], references: [user.id] }),
	shares: many(vaultShares),
	items: many(vaultItems)
}));

export const vaultItemsRelations = relations(vaultItems, ({ one }) => ({
	user: one(user, { fields: [vaultItems.userId], references: [user.id] }),
	vault: one(vaults, { fields: [vaultItems.vaultId], references: [vaults.id] })
}));

export const schema = {
	user,
	session,
	account,
	verification,
	vaults,
	vaultShares,
	vaultItems,
	itemShares,
	groups,
	groupMembers
};
