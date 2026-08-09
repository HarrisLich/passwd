<script lang="ts">
	import type { AccessLevel } from '$lib/infra/crypto';
	import type { DecryptedVaultItem } from '$lib/types/vault-item';

	type ShareMode = 'items' | 'vault';
	type ShareAccess = Exclude<AccessLevel, 'owner'>;

	type Props = {
		items: DecryptedVaultItem[];
		vaultId: string | null;
		busy?: boolean;
		onshare: (payload: {
			email: string;
			accessLevel: AccessLevel;
			itemIds: string[];
			mode: ShareMode;
		}) => void | Promise<void>;
		oncreategroup?: (name: string) => void | Promise<void>;
		oninvitetogroup?: (payload: { groupId: string; email: string }) => void | Promise<void>;
		groups?: Array<{ id: string; name: string }>;
	};

	let {
		items,
		vaultId,
		busy = false,
		onshare,
		oncreategroup,
		oninvitetogroup,
		groups = []
	}: Props = $props();

	let email = $state('');
	let accessLevel = $state<ShareAccess>('viewer');
	let mode = $state<ShareMode>('items');
	let selectedIds = $state<string[]>([]);
	let message = $state<string | null>(null);
	let messageTone = $state<'error' | 'status'>('error');

	let groupName = $state('');
	let inviteGroupId = $state('');
	let inviteEmail = $state('');

	const showGroups = $derived(Boolean(oncreategroup || oninvitetogroup));
	const shareableIds = $derived(items.filter((i) => Boolean(i.itemKey)).map((i) => i.id));

	function setMode(next: ShareMode) {
		mode = next;
		message = null;
		if (next === 'vault') {
			selectedIds = [...shareableIds];
		}
	}

	function toggleItem(id: string, checked: boolean) {
		if (mode === 'vault') return;
		if (checked) {
			if (!selectedIds.includes(id)) selectedIds = [...selectedIds, id];
		} else {
			selectedIds = selectedIds.filter((x) => x !== id);
		}
	}

	function isChecked(id: string): boolean {
		if (mode === 'vault') return shareableIds.includes(id);
		return selectedIds.includes(id);
	}

	async function handleShare(e: Event) {
		e.preventDefault();
		message = null;

		const trimmed = email.trim();
		if (!trimmed) {
			messageTone = 'error';
			message = 'Email is required.';
			return;
		}

		const itemIds =
			mode === 'vault'
				? [...shareableIds]
				: selectedIds.filter((id) => shareableIds.includes(id));

		if (mode === 'items' && itemIds.length === 0) {
			messageTone = 'error';
			message = 'Select at least one account to share.';
			return;
		}

		if (mode === 'vault' && !vaultId) {
			messageTone = 'error';
			message = 'No active vault to share.';
			return;
		}

		try {
			await onshare({
				email: trimmed,
				accessLevel,
				itemIds,
				mode
			});
			messageTone = 'status';
			message = 'Access granted.';
			email = '';
		} catch (err) {
			messageTone = 'error';
			message = err instanceof Error ? err.message : 'Could not grant access.';
		}
	}

	async function handleCreateGroup(e: Event) {
		e.preventDefault();
		if (!oncreategroup) return;
		message = null;
		const name = groupName.trim();
		if (!name) {
			messageTone = 'error';
			message = 'Group name is required.';
			return;
		}
		try {
			await oncreategroup(name);
			messageTone = 'status';
			message = `Group “${name}” created.`;
			groupName = '';
		} catch (err) {
			messageTone = 'error';
			message = err instanceof Error ? err.message : 'Could not create group.';
		}
	}

	async function handleInviteToGroup(e: Event) {
		e.preventDefault();
		if (!oninvitetogroup) return;
		message = null;
		const groupId = inviteGroupId;
		const memberEmail = inviteEmail.trim();
		if (!groupId) {
			messageTone = 'error';
			message = 'Choose a group.';
			return;
		}
		if (!memberEmail) {
			messageTone = 'error';
			message = 'Invite email is required.';
			return;
		}
		try {
			await oninvitetogroup({ groupId, email: memberEmail });
			messageTone = 'status';
			message = `Invited ${memberEmail}.`;
			inviteEmail = '';
		} catch (err) {
			messageTone = 'error';
			message = err instanceof Error ? err.message : 'Could not invite to group.';
		}
	}
</script>

<section class="panel" aria-label="Share access">
	<h2>Share access</h2>

	<form class="share-form" onsubmit={handleShare}>
		<label>
			<span>Email</span>
			<input
				type="email"
				bind:value={email}
				disabled={busy}
				placeholder="colleague@example.com"
				autocomplete="email"
			/>
		</label>

		<label>
			<span>Access level</span>
			<select bind:value={accessLevel} disabled={busy}>
				<option value="viewer">Viewer</option>
				<option value="editor">Editor</option>
				<option value="manager">Manager</option>
			</select>
		</label>

		<fieldset class="mode">
			<legend>Share scope</legend>
			<label class="radio">
				<input
					type="radio"
					name="share-mode"
					checked={mode === 'items'}
					disabled={busy}
					onchange={() => setMode('items')}
				/>
				<span>Selected accounts</span>
			</label>
			<label class="radio">
				<input
					type="radio"
					name="share-mode"
					checked={mode === 'vault'}
					disabled={busy || !vaultId}
					onchange={() => setMode('vault')}
				/>
				<span>Whole vault (current items + future)</span>
			</label>
		</fieldset>

		<fieldset class="items">
			<legend>Accounts</legend>
			{#if items.length === 0}
				<p class="hint">No accounts in this vault yet.</p>
			{:else}
				<ul>
					{#each items as item (item.id)}
						{@const canShare = Boolean(item.itemKey)}
						<li>
							<label class="check" class:disabled={!canShare || mode === 'vault'}>
								<input
									type="checkbox"
									checked={isChecked(item.id)}
									disabled={busy || !canShare || mode === 'vault'}
									onchange={(e) =>
										toggleItem(item.id, (e.currentTarget as HTMLInputElement).checked)}
								/>
								<span class="item-text">
									<span class="item-title">{item.data.title}</span>
									<span class="item-sub">{item.data.username || '—'}</span>
									{#if !canShare}
										<span class="item-hint">Save once to enable sharing</span>
									{/if}
								</span>
							</label>
						</li>
					{/each}
				</ul>
			{/if}
		</fieldset>

		{#if message}
			<p class={messageTone === 'error' ? 'error' : 'status'} role="status">{message}</p>
		{/if}

		<button type="submit" class="cta" disabled={busy}>
			{busy ? 'Granting…' : 'Grant access'}
		</button>
	</form>

	{#if showGroups}
		<div class="groups">
			<h3>Groups</h3>

			{#if oncreategroup}
				<form class="row-form" onsubmit={handleCreateGroup}>
					<label class="grow">
						<span>New group</span>
						<input type="text" bind:value={groupName} disabled={busy} placeholder="Team name" />
					</label>
					<button type="submit" class="ghost" disabled={busy}>Create</button>
				</form>
			{/if}

			{#if oninvitetogroup}
				<form class="row-form" onsubmit={handleInviteToGroup}>
					<label>
						<span>Group</span>
						<select bind:value={inviteGroupId} disabled={busy || groups.length === 0}>
							<option value="">Select…</option>
							{#each groups as g (g.id)}
								<option value={g.id}>{g.name}</option>
							{/each}
						</select>
					</label>
					<label class="grow">
						<span>Invite email</span>
						<input
							type="email"
							bind:value={inviteEmail}
							disabled={busy}
							placeholder="member@example.com"
						/>
					</label>
					<button type="submit" class="ghost" disabled={busy || groups.length === 0}>
						Invite
					</button>
				</form>
			{/if}
		</div>
	{/if}
</section>

<style>
	.panel {
		display: grid;
		gap: var(--space-5, 1.25rem);
	}

	h2 {
		margin: 0;
		font-size: 1.35rem;
		font-family: var(--font-display);
	}

	h3 {
		margin: 0 0 var(--space-3);
		font-size: 0.95rem;
		font-family: var(--font-display);
		font-weight: 600;
	}

	.share-form,
	.groups {
		display: grid;
		gap: var(--space-4);
	}

	.groups {
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-rule);
	}

	label,
	.radio,
	.check {
		display: grid;
		gap: var(--space-2);
		font-size: 0.9rem;
		color: var(--color-ink);
	}

	label span:first-child,
	legend {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	input[type='email'],
	input[type='text'],
	select {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius-control);
		padding: 0.65rem 0.75rem;
		font: inherit;
		background: var(--color-paper);
		color: var(--color-ink);
	}

	fieldset {
		border: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--space-3);
	}

	.mode {
		gap: var(--space-2);
	}

	.radio,
	.check {
		grid-template-columns: auto 1fr;
		align-items: start;
		gap: var(--space-3);
		cursor: pointer;
	}

	.check.disabled {
		cursor: default;
		opacity: 0.85;
	}

	.items ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--space-2);
		max-height: 14rem;
		overflow: auto;
	}

	.item-text {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
	}

	.item-title {
		font-family: var(--font-display);
		font-weight: 600;
	}

	.item-sub,
	.item-hint,
	.hint {
		font-size: 0.85rem;
		color: var(--color-muted);
	}

	.item-hint {
		font-family: var(--font-mono);
		font-size: 0.72rem;
	}

	.row-form {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: end;
	}

	.row-form label {
		min-width: 8rem;
	}

	.row-form .grow {
		flex: 1 1 10rem;
	}

	.cta,
	.ghost {
		border-radius: var(--radius-control);
		padding: 0.65rem 0.95rem;
		font-family: var(--font-display);
		font-weight: 600;
		cursor: pointer;
		justify-self: start;
	}

	.cta {
		background: var(--color-accent);
		color: var(--color-paper);
		border: none;
	}

	.cta:disabled,
	.ghost:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.ghost {
		background: var(--color-paper);
		border: 1px solid var(--color-rule);
		color: var(--color-ink);
	}

	.error {
		margin: 0;
		color: oklch(45% 0.18 25);
		font-size: 0.9rem;
	}

	.status {
		margin: 0;
		color: var(--color-accent);
		font-size: 0.9rem;
	}
</style>
