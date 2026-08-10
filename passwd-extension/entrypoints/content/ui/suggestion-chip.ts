import type { ContentScriptContext } from 'wxt/client';
import type { SuggestionItem } from '../../../lib/messaging/protocol';

/**
 * A single floating panel (not one per field) that repositions itself under
 * whichever username/password field is currently focused. Appears only on
 * focus (a user gesture) — never fills anything until the user clicks an item.
 */
export type SuggestionChipController = {
	show: (rect: DOMRect, items: SuggestionItem[], onSelect: (id: string) => void) => void;
	hide: () => void;
};

const PANEL_CSS = `
	.panel { display: none; position: fixed; z-index: 2147483000; background: #fff; color: #1a1a1a;
		border: 1px solid #d6d6d6; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.18);
		font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; min-width: 220px; overflow: hidden; }
	.list { list-style: none; margin: 0; padding: 4px; max-height: 260px; overflow-y: auto; }
	.item { padding: 8px 10px; border-radius: 6px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
	.item:hover { background: #f2f2f2; }
	.title { font-weight: 600; }
	.username { color: #666; font-size: 12px; }
`;

export async function createSuggestionChip(ctx: ContentScriptContext): Promise<SuggestionChipController> {
	let panel!: HTMLElement;
	let list!: HTMLElement;

	const ui = await createShadowRootUi(ctx, {
		name: 'passwd-suggestion-chip',
		position: 'inline',
		anchor: 'body',
		onMount: (container) => {
			const style = document.createElement('style');
			style.textContent = PANEL_CSS;
			container.appendChild(style);
			panel = document.createElement('div');
			panel.className = 'panel';
			list = document.createElement('ul');
			list.className = 'list';
			panel.appendChild(list);
			container.appendChild(panel);
		}
	});
	ui.mount();

	function hide() {
		panel.style.display = 'none';
	}

	function show(rect: DOMRect, items: SuggestionItem[], onSelect: (id: string) => void) {
		if (items.length === 0) {
			hide();
			return;
		}
		list.replaceChildren();
		for (const item of items) {
			const li = document.createElement('li');
			li.className = 'item';
			const title = document.createElement('span');
			title.className = 'title';
			title.textContent = item.title;
			const username = document.createElement('span');
			username.className = 'username';
			username.textContent = item.username;
			li.append(title, username);
			li.addEventListener('mousedown', (e) => {
				e.preventDefault(); // keep focus on the field so the fill's blur/change events fire naturally
				onSelect(item.id);
				hide();
			});
			list.appendChild(li);
		}
		panel.style.display = 'block';
		panel.style.left = `${rect.left}px`;
		panel.style.top = `${rect.bottom + 4}px`;
		panel.style.minWidth = `${Math.max(rect.width, 220)}px`;
	}

	return { show, hide };
}
