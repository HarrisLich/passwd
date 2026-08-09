<script lang="ts">
	import { goto } from '$app/navigation';
	import { unlockWithCredentials } from '$lib/modules/unlock/unlock.controller';

	let email = $state('');
	let masterPassword = $state('');
	let secretKey = $state('');
	let busy = $state(false);
	let error = $state<string | null>(null);

	async function onSubmit(e: Event) {
		e.preventDefault();
		error = null;
		busy = true;
		try {
			await unlockWithCredentials({ email, masterPassword, secretKey });
			masterPassword = '';
			secretKey = '';
			await goto('/vault');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unlock failed';
		} finally {
			busy = false;
		}
	}
</script>

<main class="shell">
	<p class="eyebrow">Unlock</p>
	<h1>Open vault</h1>
	<p class="lede">
		Sign in with a derived auth secret, then unlock locally with your master password and Secret Key.
	</p>

	<form class="form" onsubmit={onSubmit}>
		<label>
			<span>Email</span>
			<input type="email" autocomplete="username" required bind:value={email} disabled={busy} />
		</label>
		<label>
			<span>Master password</span>
			<input
				type="password"
				autocomplete="current-password"
				required
				bind:value={masterPassword}
				disabled={busy}
			/>
		</label>
		<label>
			<span>Secret Key</span>
			<input
				type="text"
				autocomplete="off"
				spellcheck="false"
				required
				placeholder="AAAA-BBBBBB-CCCCCC-DDDD"
				bind:value={secretKey}
				disabled={busy}
			/>
		</label>

		{#if error}
			<p class="error" role="alert">{error}</p>
		{/if}

		<button type="submit" class="cta" disabled={busy}>
			{busy ? 'Unlocking…' : 'Unlock vault'}
		</button>
	</form>

	<p class="foot">
		New here? <a href="/auth/signup">Create a vault</a>
	</p>
</main>

<style>
	.shell {
		max-width: 34rem;
		margin: 0 auto;
		padding: var(--space-16) var(--space-6);
	}

	.eyebrow {
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 0.72rem;
		color: var(--color-accent);
		margin: 0 0 var(--space-4);
	}

	h1 {
		font-size: clamp(2rem, 4vw, 2.6rem);
		margin: 0 0 var(--space-4);
		line-height: 1.1;
	}

	.lede {
		margin: 0 0 var(--space-8);
		max-width: 42ch;
	}

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

	input {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius-control);
		padding: 0.65rem 0.75rem;
		font: inherit;
		background: var(--color-paper);
		color: var(--color-ink);
	}

	input:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 1px;
	}

	.cta {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		margin-top: var(--space-2);
		background: var(--color-accent);
		color: var(--color-paper);
		border: none;
		border-radius: var(--radius-control);
		padding: 0.7rem 1rem;
		font-family: var(--font-display);
		font-weight: 600;
		cursor: pointer;
	}

	.cta:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error {
		color: oklch(45% 0.18 25);
		margin: 0;
		font-size: 0.9rem;
	}

	.foot {
		margin-top: var(--space-8);
		font-size: 0.95rem;
	}
</style>
