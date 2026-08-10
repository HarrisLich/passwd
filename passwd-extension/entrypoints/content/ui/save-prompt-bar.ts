import type { ContentScriptContext } from 'wxt/client';
import type { PendingSavePrompt } from '../../../lib/messaging/protocol';

/** Bottom-of-viewport bar offering to save/update a login after a detected submission. Not field-anchored. */
export type SavePromptBarController = {
	show: (prompt: PendingSavePrompt, host: string, onSave: () => void, onDismiss: (scope: 'this-time' | 'session') => void) => void;
	hide: () => void;
};

const PANEL_CSS = `
	.bar { display: none; position: fixed; z-index: 2147483000; left: 50%; bottom: 24px; transform: translateX(-50%);
		background: #1a1a1a; color: #fff; border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,0.28);
		font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 12px 14px;
		align-items: center; gap: 12px; max-width: min(420px, calc(100vw - 48px)); }
	.text { flex: 1; }
	.title { font-weight: 600; margin-bottom: 2px; }
	.subtitle { color: #b8b8b8; font-size: 12px; }
	.actions { display: flex; gap: 6px; flex-shrink: 0; }
	button { border: 1px solid transparent; border-radius: 6px; padding: 6px 10px; font: inherit; cursor: pointer; }
	.save { background: #fff; color: #1a1a1a; }
	.save:hover { background: #eee; }
	.dismiss { background: transparent; color: #b8b8b8; }
	.dismiss:hover { color: #fff; }
`;

/** Defense in depth: even a correctly-triggered prompt shouldn't linger forever if the user just ignores it. */
const AUTO_HIDE_MS = 15_000;

export async function createSavePromptBar(ctx: ContentScriptContext): Promise<SavePromptBarController> {
	let bar!: HTMLElement;
	let titleEl!: HTMLElement;
	let subtitleEl!: HTMLElement;
	let saveBtn!: HTMLButtonElement;
	let dismissBtn!: HTMLButtonElement;
	let autoHideTimer: ReturnType<typeof setTimeout> | undefined;

	const ui = await createShadowRootUi(ctx, {
		name: 'passwd-save-prompt-bar',
		position: 'inline',
		anchor: 'body',
		onMount: (container) => {
			const style = document.createElement('style');
			style.textContent = PANEL_CSS;
			container.appendChild(style);

			bar = document.createElement('div');
			bar.className = 'bar';

			const text = document.createElement('div');
			text.className = 'text';
			titleEl = document.createElement('div');
			titleEl.className = 'title';
			subtitleEl = document.createElement('div');
			subtitleEl.className = 'subtitle';
			text.append(titleEl, subtitleEl);

			const actions = document.createElement('div');
			actions.className = 'actions';
			dismissBtn = document.createElement('button');
			dismissBtn.type = 'button';
			dismissBtn.className = 'dismiss';
			dismissBtn.textContent = 'Not now';
			saveBtn = document.createElement('button');
			saveBtn.type = 'button';
			saveBtn.className = 'save';
			actions.append(dismissBtn, saveBtn);

			bar.append(text, actions);
			container.appendChild(bar);
		}
	});
	ui.mount();

	function hide() {
		bar.style.display = 'none';
		if (autoHideTimer) clearTimeout(autoHideTimer);
	}

	function show(
		prompt: PendingSavePrompt,
		host: string,
		onSave: () => void,
		onDismiss: (scope: 'this-time' | 'session') => void
	) {
		if (autoHideTimer) clearTimeout(autoHideTimer);
		autoHideTimer = setTimeout(hide, AUTO_HIDE_MS);

		if (prompt.mode === 'locked') {
			// Can't save/update without an unlocked vault (also the bootstrapping case: signing up for
			// a passwd account itself, before any vault exists) — the password is still recoverable
			// from the extension popup's generator history, so say so instead of silently doing nothing.
			titleEl.textContent = 'Passwd is locked';
			subtitleEl.textContent = 'Your generated password is saved in the extension’s Generator History — unlock to add it as a login.';
			saveBtn.style.display = 'none';
			dismissBtn.textContent = 'Got it';
			dismissBtn.onclick = () => {
				onDismiss('session');
				hide();
			};
			bar.style.display = 'flex';
			return;
		}

		const isUpdate = prompt.mode === 'update';
		titleEl.textContent = isUpdate ? `Update saved password for ${host}?` : `Save password for ${host}?`;
		subtitleEl.textContent = prompt.username || '(no username)';
		saveBtn.style.display = '';
		saveBtn.textContent = isUpdate ? 'Update' : 'Save';
		saveBtn.onclick = () => {
			onSave();
			hide();
		};
		dismissBtn.textContent = 'Not now';
		dismissBtn.onclick = () => {
			onDismiss('session');
			hide();
		};
		bar.style.display = 'flex';
	}

	return { show, hide };
}
