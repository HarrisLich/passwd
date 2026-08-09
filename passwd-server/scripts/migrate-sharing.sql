-- Manual SQLite migration: sharing + item keys (idempotent-ish; fail if re-run partially).

ALTER TABLE `user` ADD COLUMN `public_key` text;
ALTER TABLE `user` ADD COLUMN `encrypted_private_key` text;
ALTER TABLE `user` ADD COLUMN `pubkey_fingerprint` text;

CREATE TABLE IF NOT EXISTS `vaults` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `vaults_owner_idx` ON `vaults` (`owner_id`);

CREATE TABLE IF NOT EXISTS `vault_shares` (
	`vault_id` text NOT NULL,
	`recipient_type` text NOT NULL,
	`recipient_id` text NOT NULL,
	`access_level` text NOT NULL,
	`granted_by` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`vault_id`, `recipient_type`, `recipient_id`),
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `vault_shares_recipient` ON `vault_shares` (`recipient_type`, `recipient_id`);

CREATE TABLE IF NOT EXISTS `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`public_key` text NOT NULL,
	`pubkey_fingerprint` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `groups_owner_idx` ON `groups` (`owner_id`);

CREATE TABLE IF NOT EXISTS `group_members` (
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`wrapped_group_private_key` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`group_id`, `user_id`),
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `group_members_user` ON `group_members` (`user_id`);

CREATE TABLE IF NOT EXISTS `item_shares` (
	`item_id` text NOT NULL,
	`item_owner_id` text NOT NULL,
	`vault_id` text NOT NULL,
	`recipient_type` text NOT NULL,
	`recipient_id` text NOT NULL,
	`wrapped_item_key` text NOT NULL,
	`access_level` text NOT NULL,
	`granted_by` text NOT NULL,
	`key_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`item_owner_id`, `item_id`, `recipient_type`, `recipient_id`),
	FOREIGN KEY (`item_owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `item_shares_recipient` ON `item_shares` (`recipient_type`, `recipient_id`);
CREATE INDEX IF NOT EXISTS `item_shares_vault` ON `item_shares` (`vault_id`);
CREATE INDEX IF NOT EXISTS `item_shares_item` ON `item_shares` (`item_owner_id`, `item_id`);

CREATE TABLE `vault_items_new` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`vault_id` text,
	`envelope_json` text NOT NULL,
	`crypto_mode` text DEFAULT 'legacy_vault_key' NOT NULL,
	`item_type` text DEFAULT 'login' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `vault_items_new` (`id`, `user_id`, `vault_id`, `envelope_json`, `crypto_mode`, `item_type`, `version`, `updated_at`, `deleted_at`)
SELECT `id`, `user_id`, NULL, `envelope_json`, 'legacy_vault_key', 'login', `version`, `updated_at`, `deleted_at`
FROM `vault_items`;

DROP TABLE `vault_items`;
ALTER TABLE `vault_items_new` RENAME TO `vault_items`;
CREATE INDEX `vault_items_user_updated` ON `vault_items` (`user_id`, `updated_at`);
CREATE INDEX `vault_items_vault` ON `vault_items` (`vault_id`);
