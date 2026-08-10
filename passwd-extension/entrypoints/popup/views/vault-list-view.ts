import { sendMessage } from '../../../lib/messaging/client';
import type { VaultItemSummary } from '../../../lib/messaging/protocol';

export function renderVaultListView(
	root: HTMLElement,
	email: string,
	onLocked: () => void,
	onShowHistory: () => void
): void {
	root.innerHTML = '';

	const header = document.createElement('div');
	header.className = 'header';
	const title = document.createElement('h1');
	title.textContent = email;
	const historyBtn = document.createElement('button');
	historyBtn.type = 'button';
	historyBtn.className = 'icon-btn';
	historyBtn.title = 'Generator history';
	historyBtn.textContent = '🕓';
	historyBtn.addEventListener('click', onShowHistory);
	const lockBtn = document.createElement('button');
	lockBtn.type = 'button';
	lockBtn.className = 'icon-btn';
	lockBtn.textContent = 'Lock';
	lockBtn.addEventListener('click', async () => {
		await sendMessage<'LOCK'>({ type: 'LOCK', payload: {} });
		onLocked();
	});
	header.append(title, historyBtn, lockBtn);
	root.appendChild(header);

	const searchWrap = document.createElement('div');
	searchWrap.className = 'search';
	const searchInput = document.createElement('input');
	searchInput.type = 'text';
	searchInput.placeholder = 'Search';
	searchWrap.appendChild(searchInput);
	root.appendChild(searchWrap);

	const list = document.createElement('ul');
	list.className = 'list';
	root.appendChild(list);

	function renderItems(items: VaultItemSummary[]) {
		list.innerHTML = '';
		if (items.length === 0) {
			const empty = document.createElement('div');
			empty.className = 'empty';
			empty.textContent = 'No items found.';
			list.appendChild(empty);
			return;
		}
		for (const item of items) {
			list.appendChild(renderItem(item));
		}
	}

	function renderItem(item: VaultItemSummary): HTMLLIElement {
		const li = document.createElement('li');
		li.className = 'list-item';

		const text = document.createElement('div');
		text.className = 'item-text';
		const t = document.createElement('div');
		t.className = 'item-title';
		t.textContent = item.title;
		const u = document.createElement('div');
		u.className = 'item-username';
		u.textContent = item.username;
		text.append(t, u);

		const actions = document.createElement('div');
		actions.className = 'item-actions';
		actions.appendChild(copyButton('👤', 'Copy username', item.username));
		actions.appendChild(copyButton('🔑', 'Copy password', item.password));

		li.append(text, actions);
		return li;
	}

	function copyButton(icon: string, label: string, value: string): HTMLButtonElement {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'icon-btn';
		btn.title = label;
		btn.textContent = icon;
		btn.addEventListener('click', () => {
			void navigator.clipboard.writeText(value);
			const original = btn.textContent;
			btn.textContent = '✓';
			setTimeout(() => (btn.textContent = original), 800);
		});
		return btn;
	}

	async function load(query?: string) {
		const res = await sendMessage<'GET_VAULT_ITEMS'>({ type: 'GET_VAULT_ITEMS', payload: { query } });
		renderItems(res.items);
	}

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	searchInput.addEventListener('input', () => {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => void load(searchInput.value), 150);
	});

	void load();
}
