<script lang="ts">
	import type { VaultItemPlaintext } from '$lib/types/vault-item';

	type Props = {
		initial?: VaultItemPlaintext;
		busy?: boolean;
		submitLabel?: string;
		onsubmit: (data: VaultItemPlaintext) => void | Promise<void>;
		oncancel?: () => void;
	};

	let {
		initial,
		busy = false,
		submitLabel = 'Save item',
		onsubmit,
		oncancel
	}: Props = $props();

	// Parent remounts this form via {#key} when switching create/edit targets.
	let title = $state(initial?.title ?? '');
	let username = $state(initial?.username ?? '');
	let password = $state(initial?.password ?? '');
	let url = $state(initial?.url ?? '');
	let notes = $state(initial?.notes ?? '');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		await onsubmit({
			title: title.trim(),
			username: username.trim(),
			password,
			url: url.trim(),
			notes: notes.trim(),
			kind: 'login'
		});
	}
</script>

<form class="form" onsubmit={handleSubmit}>
	<label>
		<span>Title</span>
		<input required bind:value={title} disabled={busy} placeholder="GitHub" />
	</label>
	<label>
		<span>Username</span>
		<input bind:value={username} disabled={busy} autocomplete="username" />
	</label>
	<label>
		<span>Password</span>
		<input type="password" bind:value={password} disabled={busy} autocomplete="new-password" />
	</label>
	<label>
		<span>URL</span>
		<input type="url" bind:value={url} disabled={busy} placeholder="https://" />
	</label>
	<label>
		<span>Notes</span>
		<textarea rows="3" bind:value={notes} disabled={busy}></textarea>
	</label>

	<div class="actions">
		<button type="submit" class="cta" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
		{#if oncancel}
			<button type="button" class="ghost" onclick={oncancel} disabled={busy}>Cancel</button>
		{/if}
	</div>
</form>

<style>
	.form {
		display: grid;
		gap: var(--space-4);
	}

	label {
		display: grid;
		gap: var(--space-2);
		font-size: 0.9rem;
		color: var(--color-ink);
	}

	input,
	textarea {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius-control);
		padding: 0.65rem 0.75rem;
		font: inherit;
		background: var(--color-paper);
		color: var(--color-ink);
	}

	textarea {
		resize: vertical;
		min-height: 4.5rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: var(--space-2);
	}

	.cta {
		background: var(--color-accent);
		color: var(--color-paper);
		border: none;
		border-radius: var(--radius-control);
		padding: 0.65rem 0.95rem;
		font-family: var(--font-display);
		font-weight: 600;
		cursor: pointer;
	}

	.cta:disabled,
	.ghost:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.ghost {
		border: 1px solid var(--color-rule);
		background: var(--color-paper);
		border-radius: var(--radius-control);
		padding: 0.65rem 0.95rem;
		font-family: var(--font-display);
		cursor: pointer;
		color: var(--color-ink);
	}
</style>
