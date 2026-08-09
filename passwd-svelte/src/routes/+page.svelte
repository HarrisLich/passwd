<script lang="ts">
	import { onMount } from 'svelte';

	let commandOpen = $state(false);
	let typed = $state('');
	const demoLine = 'encrypt(item, K_vault) → xchacha20poly1305';

	onMount(() => {
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduce) {
			typed = demoLine;
			return;
		}
		let i = 0;
		const id = window.setInterval(() => {
			i += 1;
			typed = demoLine.slice(0, i);
			if (i >= demoLine.length) window.clearInterval(id);
		}, 28);
		return () => window.clearInterval(id);
	});

	function onKeydown(e: KeyboardEvent) {
		const meta = e.metaKey || e.ctrlKey;
		if (meta && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			commandOpen = !commandOpen;
		}
		if (e.key === 'Escape') commandOpen = false;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="page">
	<header class="nav">
		<a class="wordmark" href="/">Passwd</a>
		<nav aria-label="Primary">
			<a href="/auth/signup">Signup</a>
			<a href="/auth/unlock">Unlock</a>
			<a href="#trust">Trust model</a>
		</nav>
		<div class="nav-actions">
			<button type="button" class="cmd" onclick={() => (commandOpen = true)}>
				<span>Search</span>
				<kbd>⌘K</kbd>
			</button>
			<a class="cta" href="/auth/signup">Create vault</a>
		</div>
	</header>

	<section class="hero" aria-labelledby="hero-title">
		<div class="hero-copy">
			<p class="eyebrow">Zero-knowledge vault</p>
			<h1 id="hero-title">Your server can burn. Your passwords should not.</h1>
			<p class="lede">
				Passwd encrypts every item on the device with Argon2id and XChaCha20-Poly1305. The API only
				ever stores ciphertext blobs.
			</p>
			<div class="cta-row">
				<a class="cta" href="/auth/signup">Create vault</a>
				<a class="ghost" href="#trust">Read the trust model</a>
			</div>
		</div>
		<figure class="code-card" aria-label="Client-side encrypt demo">
			<div class="window-bar">
				<span class="dots" aria-hidden="true"></span>
				<span class="file">vault.ts</span>
				<span class="chip">local only</span>
			</div>
			<pre><code><span class="tok-muted">// master password never leaves the client</span>
<span class="tok-key">const</span> K_vault = <span class="tok-fn">derive</span>(password, secretKey);
<span class="tok-accent">{typed}</span><span class="caret" aria-hidden="true">▮</span></code></pre>
		</figure>
	</section>

	<section id="trust" class="band">
		<p class="eyebrow">Trust model</p>
		<h2>Session auth is not vault unlock.</h2>
		<p>
			Login proves who you are to the sync API. Unlock derives <code>K_vault</code> in memory. If those
			two ever collapse into one key, stop and redesign.
		</p>
	</section>

	<footer class="footer">
		<p>Passwd keeps the key on your side of the wire.</p>
		<a href="/auth/signup">Create vault →</a>
	</footer>
</div>

{#if commandOpen}
	<div
		class="palette-backdrop"
		role="presentation"
		onclick={() => (commandOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (commandOpen = false)}
	>
		<div
			class="palette"
			role="dialog"
			aria-modal="true"
			aria-label="Command palette"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<p class="palette-label">Jump</p>
			<a href="/auth/signup" onclick={() => (commandOpen = false)}>Create vault</a>
			<a href="/auth/unlock" onclick={() => (commandOpen = false)}>Unlock</a>
			<a href="#trust" onclick={() => (commandOpen = false)}>Trust model</a>
		</div>
	</div>
{/if}

<style>
	.page {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.nav {
		display: flex;
		align-items: center;
		gap: var(--space-6);
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--color-rule);
		background: color-mix(in oklch, var(--color-paper) 88%, transparent);
		backdrop-filter: blur(8px);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.wordmark {
		font-family: var(--font-display);
		font-weight: 600;
		color: var(--color-ink);
		text-decoration: none;
		letter-spacing: -0.03em;
	}

	.nav nav {
		display: flex;
		gap: var(--space-4);
		flex: 1;
	}

	.nav a {
		font-size: 0.95rem;
		text-decoration: none;
		white-space: nowrap;
	}

	.nav-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.cmd {
		display: inline-flex;
		align-items: center;
		gap: var(--space-3);
		border: 1px solid var(--color-rule);
		background: var(--color-paper);
		border-radius: var(--radius-control);
		padding: 0.4rem 0.65rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-muted);
		cursor: pointer;
	}

	.cmd kbd {
		border: 1px solid var(--color-rule);
		border-radius: 4px;
		padding: 0.1rem 0.35rem;
	}

	.cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--color-accent);
		color: var(--color-paper);
		text-decoration: none;
		border-radius: var(--radius-control);
		padding: 0.55rem 0.9rem;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.95rem;
		white-space: nowrap;
	}

	.cta:hover {
		color: var(--color-paper);
		filter: brightness(1.05);
	}

	.ghost {
		font-family: var(--font-display);
		font-weight: 500;
		white-space: nowrap;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
		gap: var(--space-12);
		align-items: center;
		padding: var(--space-16) var(--space-6) var(--space-24);
		max-width: 1120px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}

	.eyebrow {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 var(--space-4);
	}

	.hero h1 {
		font-size: clamp(2.4rem, 5vw, 3.75rem);
		line-height: 1.05;
		font-weight: 600;
		margin: 0 0 var(--space-6);
		max-width: 14ch;
	}

	.lede {
		max-width: 38ch;
		margin: 0 0 var(--space-8);
		font-size: 1.05rem;
	}

	.cta-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		align-items: center;
	}

	.code-card {
		margin: 0;
		background: var(--color-graphite);
		color: var(--color-graphite-ink);
		border: 1px solid color-mix(in oklch, var(--color-accent) 35%, var(--color-graphite));
		border-radius: var(--radius-panel);
		box-shadow: 0 1px 2px oklch(20% 0.02 260 / 0.25);
		overflow: hidden;
		min-width: 0;
	}

	.window-bar {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid oklch(35% 0.02 260);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.dots {
		width: 2.2rem;
		height: 0.55rem;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			oklch(55% 0.02 260) 0 28%,
			transparent 28% 36%,
			oklch(55% 0.02 260) 36% 64%,
			transparent 64% 72%,
			oklch(55% 0.02 260) 72% 100%
		);
	}

	.file {
		flex: 1;
		color: oklch(75% 0.02 250);
	}

	.chip {
		color: var(--color-accent);
	}

	pre {
		margin: 0;
		padding: var(--space-6);
		overflow: auto;
		font-family: var(--font-mono);
		font-size: 0.85rem;
		line-height: 1.7;
	}

	.tok-muted {
		color: oklch(65% 0.02 250);
	}
	.tok-key {
		color: oklch(78% 0.04 250);
	}
	.tok-fn {
		color: var(--color-accent);
	}
	.tok-accent {
		color: oklch(88% 0.04 210);
	}
	.caret {
		color: var(--color-accent);
	}

	.band {
		background: var(--color-graphite);
		color: var(--color-graphite-ink);
		padding: var(--space-16) var(--space-6);
	}

	.band .eyebrow {
		color: var(--color-accent);
	}

	.band h2 {
		color: var(--color-graphite-ink);
		font-size: clamp(1.8rem, 3vw, 2.6rem);
		max-width: 18ch;
		margin: 0 0 var(--space-4);
	}

	.band p {
		max-width: 52ch;
		margin: 0;
	}

	.band code {
		font-family: var(--font-mono);
		color: var(--color-accent);
	}

	.footer {
		margin-top: auto;
		padding: var(--space-12) var(--space-6);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		align-items: baseline;
		justify-content: space-between;
		border-top: 1px solid var(--color-rule);
	}

	.footer p {
		font-family: var(--font-display);
		font-size: 1.35rem;
		color: var(--color-ink);
		margin: 0;
		max-width: 22ch;
	}

	.palette-backdrop {
		position: fixed;
		inset: 0;
		background: oklch(20% 0.02 258 / 0.35);
		display: grid;
		place-items: start center;
		padding-top: 12vh;
		z-index: 50;
	}

	.palette {
		width: min(420px, calc(100vw - 2rem));
		background: var(--color-paper);
		border: 1px solid var(--color-rule);
		border-radius: var(--radius-panel);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.palette-label {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 var(--space-2);
	}

	.palette a {
		text-decoration: none;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-control);
		border: 1px solid transparent;
	}

	.palette a:hover {
		border-color: var(--color-rule);
		background: var(--color-paper-2);
	}

	@media (max-width: 768px) {
		.nav {
			flex-wrap: wrap;
		}
		.nav nav {
			order: 3;
			width: 100%;
			overflow-x: auto;
		}
		.hero {
			grid-template-columns: minmax(0, 1fr);
			padding-top: var(--space-12);
		}
		.hero h1 {
			max-width: none;
		}
	}
</style>
