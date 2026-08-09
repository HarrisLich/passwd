<script lang="ts">
	import type { DecryptedVaultItem } from '$lib/types/vault-item';

	type Props = {
		item: DecryptedVaultItem;
		onedit: () => void;
		ondelete: () => void | Promise<void>;
	};

	let { item, onedit, ondelete }: Props = $props();
	let reveal = $state(false);
	let copied = $state<string | null>(null);

	async function copy(label: string, value: string) {
		if (!value) return;
		await navigator.clipboard.writeText(value);
		copied = label;
		window.setTimeout(() => {
			if (copied === label) copied = null;
		}, 1500);
	}
</script>

<article class="detail">
	<header>
		<h2>{item.data.title}</h2>
		<p class="meta">Updated {new Date(item.updatedAt).toLocaleString()}</p>
	</header>

	<dl>
		<div class="row">
			<dt>Username</dt>
			<dd>
				<span>{item.data.username || '—'}</span>
				{#if item.data.username}
					<button type="button" class="linkish" onclick={() => copy('user', item.data.username)}>
						{copied === 'user' ? 'Copied' : 'Copy'}
					</button>
				{/if}
			</dd>
		</div>
		<div class="row">
			<dt>Password</dt>
			<dd>
				<span class="mono">{reveal ? item.data.password || '—' : '••••••••'}</span>
				<button type="button" class="linkish" onclick={() => (reveal = !reveal)}>
					{reveal ? 'Hide' : 'Show'}
				</button>
				{#if item.data.password}
					<button type="button" class="linkish" onclick={() => copy('pass', item.data.password)}>
						{copied === 'pass' ? 'Copied' : 'Copy'}
					</button>
				{/if}
			</dd>
		</div>
		{#if item.data.url}
			<div class="row">
				<dt>URL</dt>
				<dd>
					<a href={item.data.url} target="_blank" rel="noreferrer">{item.data.url}</a>
				</dd>
			</div>
		{/if}
		{#if item.data.notes}
			<div class="row">
				<dt>Notes</dt>
				<dd class="notes">{item.data.notes}</dd>
			</div>
		{/if}
	</dl>

	<div class="actions">
		<button type="button" class="cta" onclick={onedit}>Edit</button>
		<button type="button" class="danger" onclick={ondelete}>Delete</button>
	</div>
</article>

<style>
	.detail {
		display: grid;
		gap: var(--space-6);
	}

	header h2 {
		margin: 0;
		font-size: 1.6rem;
	}

	.meta {
		margin: var(--space-2) 0 0;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	dl {
		margin: 0;
		display: grid;
		gap: var(--space-4);
	}

	.row {
		display: grid;
		gap: var(--space-1);
	}

	dt {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	dd {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: baseline;
		color: var(--color-ink);
	}

	.mono {
		font-family: var(--font-mono);
	}

	.notes {
		white-space: pre-wrap;
	}

	.linkish {
		border: none;
		background: none;
		padding: 0;
		color: var(--color-accent);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.actions {
		display: flex;
		gap: var(--space-3);
	}

	.cta,
	.danger {
		border-radius: var(--radius-control);
		padding: 0.6rem 0.9rem;
		font-family: var(--font-display);
		font-weight: 600;
		cursor: pointer;
	}

	.cta {
		background: var(--color-accent);
		color: var(--color-paper);
		border: none;
	}

	.danger {
		background: var(--color-paper);
		border: 1px solid oklch(70% 0.12 25);
		color: oklch(40% 0.16 25);
	}
</style>
