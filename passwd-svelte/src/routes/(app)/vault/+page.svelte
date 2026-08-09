<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import SharePanel from '$lib/components/vault/SharePanel.svelte';
	import VaultItemDetail from '$lib/components/vault/VaultItemDetail.svelte';
	import VaultItemForm from '$lib/components/vault/VaultItemForm.svelte';
	import { listGroups } from '$lib/infra/api/groups';
	import type { AccessLevel } from '$lib/infra/crypto';
	import { fetchMe } from '$lib/infra/auth/session';
	import {
		createShareGroup,
		findShareRecipient,
		inviteUserToGroup,
		shareItemsWithGroup,
		shareItemsWithUser,
		shareVaultWithUser
	} from '$lib/modules/share/share.controller';
	import {
		loadDecryptedVault,
		removeVaultItem,
		saveVaultItem
	} from '$lib/modules/vault/vault.controller';
	import {
		getActiveVaultId,
		getUnlockedEmail,
		isVaultUnlocked,
		lockVault
	} from '$lib/stores/vault.svelte';
	import type { DecryptedVaultItem, VaultItemPlaintext } from '$lib/types/vault-item';

	let email = $state<string | null>(null);
	let ready = $state(false);
	let items = $state<DecryptedVaultItem[]>([]);
	let groups = $state<Array<{ id: string; name: string }>>([]);
	let selectedId = $state<string | null>(null);
	let mode = $state<'list' | 'create' | 'edit' | 'share'>('list');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let query = $state('');

	const selected = $derived(items.find((i) => i.id === selectedId) ?? null);
	const vaultId = $derived(getActiveVaultId());
	const filtered = $derived(
		items.filter((item) => {
			const q = query.trim().toLowerCase();
			if (!q) return true;
			return (
				item.data.title.toLowerCase().includes(q) ||
				item.data.username.toLowerCase().includes(q) ||
				item.data.url.toLowerCase().includes(q)
			);
		})
	);

	async function refreshGroups() {
		const list = await listGroups();
		groups = list.map((g) => ({ id: g.id, name: g.name }));
	}

	async function refresh() {
		items = await loadDecryptedVault();
		try {
			await refreshGroups();
		} catch {
			// Groups are optional for vault browse; share panel can retry.
		}
		if (selectedId && !items.some((i) => i.id === selectedId)) {
			selectedId = null;
			if (mode !== 'share' && mode !== 'create') mode = 'list';
		}
	}

	onMount(async () => {
		if (!isVaultUnlocked()) {
			await goto(resolve('/auth/unlock'));
			return;
		}
		email = getUnlockedEmail();
		try {
			const me = await fetchMe();
			if (!me) {
				// Keep vault key — session cookie issue shouldn't look like a failed unlock.
				error =
					'Session cookie missing. Use http://127.0.0.1:5173 (not localhost) and try unlock again.';
				ready = true;
				return;
			}
			email = me.email;
			await refresh();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load vault';
		}
		ready = true;
	});

	function onLock() {
		lockVault();
		goto(resolve('/auth/unlock'));
	}

	async function onCreate(data: VaultItemPlaintext) {
		busy = true;
		error = null;
		try {
			const saved = await saveVaultItem({ data });
			await refresh();
			selectedId = saved.id;
			mode = 'list';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save item';
		} finally {
			busy = false;
		}
	}

	async function onUpdate(data: VaultItemPlaintext) {
		if (!selected) return;
		busy = true;
		error = null;
		try {
			const saved = await saveVaultItem({
				id: selected.id,
				version: selected.version,
				data,
				ownerId: selected.ownerId,
				vaultId: selected.vaultId,
				itemKey: selected.itemKey,
				cryptoMode: selected.cryptoMode
			});
			await refresh();
			selectedId = saved.id;
			mode = 'list';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not update item';
		} finally {
			busy = false;
		}
	}

	async function onDelete() {
		if (!selected) return;
		if (!confirm(`Delete “${selected.data.title}”?`)) return;
		busy = true;
		error = null;
		try {
			await removeVaultItem(selected.id);
			selectedId = null;
			await refresh();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not delete item';
		} finally {
			busy = false;
		}
	}

	async function onShare(payload: {
		email: string;
		accessLevel: AccessLevel;
		itemIds: string[];
		mode: 'items' | 'vault';
	}) {
		busy = true;
		error = null;
		try {
			const recipient = await findShareRecipient(payload.email);
			const chosen = items.filter((i) => payload.itemIds.includes(i.id));
			if (payload.mode === 'vault') {
				const id = getActiveVaultId();
				if (!id) throw new Error('No active vault');
				await shareVaultWithUser({
					vaultId: id,
					recipient,
					accessLevel: payload.accessLevel,
					items: chosen.length > 0 ? chosen : items
				});
			} else {
				await shareItemsWithUser({
					recipient,
					accessLevel: payload.accessLevel,
					items: chosen
				});
			}
			await refresh();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not grant access';
			throw err;
		} finally {
			busy = false;
		}
	}

	async function onCreateGroup(name: string) {
		busy = true;
		error = null;
		try {
			const group = await createShareGroup(name);
			// Fan-out current item keys so the new group can decrypt existing shareable items.
			const shareable = items.filter((i) => Boolean(i.itemKey));
			if (shareable.length > 0) {
				await shareItemsWithGroup({
					groupId: group.id,
					accessLevel: 'viewer',
					items: shareable
				});
			}
			await refreshGroups();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not create group';
			throw err;
		} finally {
			busy = false;
		}
	}

	async function onInviteToGroup(payload: { groupId: string; email: string }) {
		busy = true;
		error = null;
		try {
			await inviteUserToGroup({
				groupId: payload.groupId,
				memberEmail: payload.email
			});
			await refreshGroups();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not invite to group';
			throw err;
		} finally {
			busy = false;
		}
	}
</script>

{#if ready}
	<main class="shell">
		<header class="top">
			<div>
				<p class="eyebrow">Vault</p>
				<h1>Items</h1>
				<p class="lede">
					Signed in as <strong>{email}</strong>. Ciphertext syncs; plaintext stays on this device.
				</p>
			</div>
			<div class="top-actions">
				<button type="button" class="cta" onclick={() => (mode = 'create')}>New item</button>
				<button type="button" class="ghost" onclick={() => (mode = 'share')}>Share</button>
				<button type="button" class="ghost" onclick={onLock}>Lock</button>
			</div>
		</header>

		{#if error}
			<p class="error" role="alert">{error}</p>
		{/if}

		<div class="layout" class:share-open={mode === 'share'}>
			<section class="list-pane" aria-label="Vault items">
				<label class="search">
					<span class="sr">Search</span>
					<input type="search" placeholder="Search titles, users, URLs" bind:value={query} />
				</label>

				{#if filtered.length === 0}
					<p class="empty">No items yet. Create your first login.</p>
				{:else}
					<ul>
						{#each filtered as item (item.id)}
							<li>
								<button
									type="button"
									class:active={item.id === selectedId && mode !== 'create' && mode !== 'share'}
									onclick={() => {
										selectedId = item.id;
										mode = 'list';
									}}
								>
									<span class="title-row">
										<span class="title">{item.data.title}</span>
										{#if item.accessLevel !== 'owner'}
											<span class="badge">shared</span>
										{/if}
									</span>
									<span class="sub">{item.data.username || item.data.url || 'Login'}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="detail-pane" aria-label="Item detail">
				{#if mode === 'create'}
					<h2>New login</h2>
					{#key 'create'}
						<VaultItemForm
							busy={busy}
							submitLabel="Encrypt & save"
							onsubmit={onCreate}
							oncancel={() => (mode = 'list')}
						/>
					{/key}
				{:else if mode === 'edit' && selected}
					<h2>Edit {selected.data.title}</h2>
					{#key selected.id}
						<VaultItemForm
							initial={selected.data}
							busy={busy}
							submitLabel="Save changes"
							onsubmit={onUpdate}
							oncancel={() => (mode = 'list')}
						/>
					{/key}
				{:else if selected}
					<VaultItemDetail
						item={selected}
						onedit={() => (mode = 'edit')}
						ondelete={onDelete}
					/>
				{:else}
					<p class="empty pane-empty">Select an item or create a new one.</p>
				{/if}
			</section>

			{#if mode === 'share'}
				<section class="share-pane" aria-label="Share access">
					<SharePanel
						{items}
						{vaultId}
						busy={busy}
						{groups}
						onshare={onShare}
						oncreategroup={onCreateGroup}
						oninvitetogroup={onInviteToGroup}
					/>
				</section>
			{/if}
		</div>
	</main>
{/if}

<style>
	.shell {
		max-width: 960px;
		margin: 0 auto;
		padding: var(--space-12) var(--space-6) var(--space-16);
	}

	.shell:has(.share-open) {
		max-width: 1200px;
	}

	.top {
		display: flex;
		justify-content: space-between;
		gap: var(--space-6);
		align-items: flex-start;
		margin-bottom: var(--space-8);
		flex-wrap: wrap;
	}

	.eyebrow {
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 0.72rem;
		color: var(--color-accent);
		margin: 0 0 var(--space-3);
	}

	h1 {
		font-size: clamp(2rem, 4vw, 2.6rem);
		margin: 0 0 var(--space-3);
	}

	h2 {
		margin: 0 0 var(--space-6);
		font-size: 1.35rem;
	}

	.lede {
		margin: 0;
		max-width: 46ch;
	}

	.top-actions {
		display: flex;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.cta,
	.ghost {
		border-radius: var(--radius-control);
		padding: 0.65rem 0.95rem;
		font-family: var(--font-display);
		font-weight: 600;
		cursor: pointer;
	}

	.cta {
		background: var(--color-accent);
		color: var(--color-paper);
		border: none;
	}

	.ghost {
		background: var(--color-paper);
		border: 1px solid var(--color-rule);
		color: var(--color-ink);
	}

	.error {
		color: oklch(45% 0.18 25);
		margin: 0 0 var(--space-6);
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.2fr);
		gap: var(--space-6);
		align-items: start;
	}

	.layout.share-open {
		grid-template-columns: minmax(0, 0.85fr) minmax(0, 1fr) minmax(0, 1.15fr);
	}

	.list-pane,
	.detail-pane,
	.share-pane {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius-panel);
		padding: var(--space-5, 1.25rem);
		background: var(--color-paper);
		min-width: 0;
	}

	.search input {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid var(--color-rule);
		border-radius: var(--radius-control);
		padding: 0.6rem 0.75rem;
		font: inherit;
		margin-bottom: var(--space-4);
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--space-2);
	}

	li button {
		width: 100%;
		text-align: left;
		border: 1px solid transparent;
		border-radius: var(--radius-control);
		background: transparent;
		padding: 0.7rem 0.75rem;
		cursor: pointer;
		display: grid;
		gap: 0.15rem;
	}

	li button:hover,
	li button.active {
		border-color: var(--color-rule);
		background: var(--color-paper-2);
	}

	li button.active {
		border-color: color-mix(in oklch, var(--color-accent) 45%, var(--color-rule));
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}

	.title {
		font-family: var(--font-display);
		font-weight: 600;
		color: var(--color-ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.badge {
		flex: 0 0 auto;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-accent);
		border: 1px solid color-mix(in oklch, var(--color-accent) 40%, var(--color-rule));
		border-radius: var(--radius-control);
		padding: 0.1rem 0.35rem;
	}

	.sub {
		font-size: 0.85rem;
		color: var(--color-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.empty {
		color: var(--color-muted);
		margin: var(--space-4) 0 0;
	}

	.pane-empty {
		margin: var(--space-8) 0;
	}

	@media (max-width: 960px) {
		.layout.share-open {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (max-width: 768px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
