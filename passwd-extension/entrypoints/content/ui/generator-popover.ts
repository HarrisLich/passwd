import type { ContentScriptContext } from 'wxt/client';

/** Floating "use suggested password" popover shown on focus of a new-password field. */
export type GeneratorPopoverController = {
	show: (rect: DOMRect, password: string, onUse: () => void, onRegenerate: () => void) => void;
	hide: () => void;
};

const PANEL_CSS = `
	.panel { display: none; position: fixed; z-index: 2147483000; background: #fff; color: #1a1a1a;
		border: 1px solid #d6d6d6; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.18);
		font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; min-width: 260px; padding: 10px; }
	.label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
	.row { display: flex; align-items: center; gap: 8px; }
	.password { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; flex: 1;
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	button { border: 1px solid #d6d6d6; background: #f7f7f7; border-radius: 6px; padding: 4px 8px;
		font: inherit; cursor: pointer; }
	button:hover { background: #efefef; }
	.use { background: #1a1a1a; color: #fff; border-color: #1a1a1a; width: 100%; margin-top: 8px; padding: 6px 8px; }
	.use:hover { background: #333; }
`;

export async function createGeneratorPopover(ctx: ContentScriptContext): Promise<GeneratorPopoverController> {
	let panel!: HTMLElement;
	let passwordEl!: HTMLElement;
	let regenerateBtn!: HTMLButtonElement;
	let useBtn!: HTMLButtonElement;

	const ui = await createShadowRootUi(ctx, {
		name: 'passwd-generator-popover',
		position: 'inline',
		anchor: 'body',
		onMount: (container) => {
			const style = document.createElement('style');
			style.textContent = PANEL_CSS;
			container.appendChild(style);

			panel = document.createElement('div');
			panel.className = 'panel';

			const label = document.createElement('div');
			label.className = 'label';
			label.textContent = 'Suggested password';

			const row = document.createElement('div');
			row.className = 'row';
			passwordEl = document.createElement('span');
			passwordEl.className = 'password';
			regenerateBtn = document.createElement('button');
			regenerateBtn.type = 'button';
			regenerateBtn.textContent = '↻';
			regenerateBtn.title = 'Generate a different password';
			row.append(passwordEl, regenerateBtn);

			useBtn = document.createElement('button');
			useBtn.type = 'button';
			useBtn.className = 'use';
			useBtn.textContent = 'Use this password';

			panel.append(label, row, useBtn);
			container.appendChild(panel);
		}
	});
	ui.mount();

	function hide() {
		panel.style.display = 'none';
	}

	function show(rect: DOMRect, password: string, onUse: () => void, onRegenerate: () => void) {
		passwordEl.textContent = password;
		regenerateBtn.onclick = (e) => {
			e.preventDefault();
			onRegenerate();
		};
		useBtn.onmousedown = (e) => {
			e.preventDefault();
			onUse();
			hide();
		};
		panel.style.display = 'block';
		panel.style.left = `${rect.left}px`;
		panel.style.top = `${rect.bottom + 4}px`;
		panel.style.minWidth = `${Math.max(rect.width, 260)}px`;
	}

	return { show, hide };
}
