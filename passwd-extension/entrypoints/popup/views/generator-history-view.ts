import { sendMessage } from '../../../lib/messaging/client';

/**
 * Recall list for passwords generated-but-not-yet-saved. Works whether the
 * vault is locked or unlocked — generator history doesn't need the vault key
 * (lib/generator/history.store.ts), which is exactly the case that matters
 * most: a password generated during signup before an account/vault exists.
 */
export function renderGeneratorHistoryView(root: HTMLElement, onBack: () => void): void {
	root.innerHTML = '';

	const header = document.createElement('div');
	header.className = 'header';
	const backBtn = document.createElement('button');
	backBtn.type = 'button';
	backBtn.className = 'icon-btn';
	backBtn.textContent = '← Back';
	backBtn.addEventListener('click', onBack);
	const title = document.createElement('h1');
	title.textContent = 'Generator history';
	header.append(backBtn, title);
	root.appendChild(header);

	const note = document.createElement('div');
	note.className = 'search';
	note.textContent = 'Kept for 7 days so you can recover a generated password you didn’t get to save.';
	root.appendChild(note);

	const list = document.createElement('ul');
	list.className = 'list';
	root.appendChild(list);

	async function load() {
		const res = await sendMessage<'GET_GENERATOR_HISTORY'>({ type: 'GET_GENERATOR_HISTORY', payload: {} });
		list.innerHTML = '';
		if (res.items.length === 0) {
			const empty = document.createElement('div');
			empty.className = 'empty';
			empty.textContent = 'No recent generated passwords.';
			list.appendChild(empty);
			return;
		}
		for (const entry of res.items) {
			list.appendChild(renderEntry(entry));
		}
	}

	function renderEntry(entry: { id: string; password: string; createdAt: string }): HTMLLIElement {
		const li = document.createElement('li');
		li.className = 'list-item';

		const text = document.createElement('div');
		text.className = 'item-text';
		const pw = document.createElement('div');
		pw.className = 'item-title';
		pw.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
		pw.textContent = entry.password;
		const when = document.createElement('div');
		when.className = 'item-username';
		when.textContent = new Date(entry.createdAt).toLocaleString();
		text.append(pw, when);

		const copyBtn = document.createElement('button');
		copyBtn.type = 'button';
		copyBtn.className = 'icon-btn';
		copyBtn.title = 'Copy password';
		copyBtn.textContent = '🔑';
		copyBtn.addEventListener('click', () => {
			void navigator.clipboard.writeText(entry.password);
			const original = copyBtn.textContent;
			copyBtn.textContent = '✓';
			setTimeout(() => (copyBtn.textContent = original), 800);
		});

		li.append(text, copyBtn);
		return li;
	}

	void load();
}
