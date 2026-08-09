<script lang="ts">
	import { goto } from '$app/navigation';
	import { registerVaultAccount } from '$lib/modules/auth/register';

	let email = $state('');
	let masterPassword = $state('');
	let confirmPassword = $state('');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let secretKey = $state<string | null>(null);
	let copied = $state(false);

	async function onSubmit(e: Event) {
		e.preventDefault();
		error = null;
		copied = false;

		if (masterPassword.length < 8) {
			error = 'Master password must be at least 8 characters.';
			return;
		}
		if (masterPassword !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}

		busy = true;
		try {
			const result = await registerVaultAccount({ email, masterPassword });
			secretKey = result.secretKey;
			masterPassword = '';
			confirmPassword = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Registration failed';
		} finally {
			busy = false;
		}
	}

	async function copySecret() {
		if (!secretKey) return;
		await navigator.clipboard.writeText(secretKey);
		copied = true;
	}
</script>

<main class="shell">
	<p class="eyebrow">Signup</p>
	{#if !secretKey}
		<h1>Create vault</h1>
		<p class="lede">
			Your master password never leaves this device. We only send a derived auth secret plus public
			KDF salts.
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
					autocomplete="new-password"
					required
					minlength="8"
					bind:value={masterPassword}
					disabled={busy}
				/>
			</label>
			<label>
				<span>Confirm master password</span>
				<input
					type="password"
					autocomplete="new-password"
					required
					minlength="8"
					bind:value={confirmPassword}
					disabled={busy}
				/>
			</label>

			{#if error}
				<p class="error" role="alert">{error}</p>
			{/if}

			<button type="submit" class="cta" disabled={busy}>
				{busy ? 'Deriving keys…' : 'Create vault'}
			</button>
		</form>

		<p class="foot">
			Already have an account? <a href="/auth/unlock">Unlock</a>
		</p>
	{:else}
		<h1>Save your Secret Key</h1>
		<p class="lede">
			This is shown once. Without it, even your master password cannot open the vault on a new device.
		</p>

		<div class="secret" aria-live="polite">
			<code>{secretKey}</code>
			<button type="button" class="ghost" onclick={copySecret}>
				{copied ? 'Copied' : 'Copy Secret Key'}
			</button>
		</div>

		{#if error}
			<p class="error" role="alert">{error}</p>
		{/if}

		<button type="button" class="cta" onclick={() => goto('/vault')}>Continue to vault</button>
	{/if}
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
		max-width: 40ch;
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

	.ghost {
		border: 1px solid var(--color-rule);
		background: var(--color-paper);
		border-radius: var(--radius-control);
		padding: 0.45rem 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		cursor: pointer;
		color: var(--color-ink);
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

	.secret {
		display: grid;
		gap: var(--space-4);
		padding: var(--space-6);
		border: 1px solid var(--color-rule);
		border-radius: var(--radius-panel);
		background: var(--color-paper-2);
		margin-bottom: var(--space-8);
	}

	.secret code {
		font-family: var(--font-mono);
		font-size: 1.05rem;
		letter-spacing: 0.04em;
		color: var(--color-ink);
		overflow-wrap: anywhere;
	}
</style>
