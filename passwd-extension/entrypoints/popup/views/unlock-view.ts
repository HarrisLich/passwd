import { sendMessage } from '../../../lib/messaging/client';

/** Sign-in + unlock only (decision 8) — account signup happens in passwd-svelte. */
export function renderUnlockView(root: HTMLElement, onUnlocked: () => void, onShowHistory: () => void): void {
	root.innerHTML = '';

	const header = document.createElement('div');
	header.className = 'header';
	const title = document.createElement('h1');
	title.textContent = 'Passwd';
	header.appendChild(title);
	root.appendChild(header);

	const form = document.createElement('form');
	form.className = 'body';

	const emailLabel = document.createElement('label');
	emailLabel.textContent = 'Email';
	const emailInput = document.createElement('input');
	emailInput.type = 'email';
	emailInput.required = true;
	emailInput.autocomplete = 'username';
	emailLabel.appendChild(emailInput);

	const passwordLabel = document.createElement('label');
	passwordLabel.textContent = 'Master password';
	const passwordInput = document.createElement('input');
	passwordInput.type = 'password';
	passwordInput.required = true;
	passwordInput.autocomplete = 'current-password';
	passwordLabel.appendChild(passwordInput);

	const secretKeyLabel = document.createElement('label');
	secretKeyLabel.textContent = 'Secret Key';
	const secretKeyInput = document.createElement('input');
	secretKeyInput.type = 'text';
	secretKeyInput.required = true;
	secretKeyInput.placeholder = 'A1B2-C3D4-…';
	secretKeyLabel.appendChild(secretKeyInput);

	const errorEl = document.createElement('div');
	errorEl.className = 'error';

	const submitBtn = document.createElement('button');
	submitBtn.type = 'submit';
	submitBtn.className = 'primary';
	submitBtn.textContent = 'Unlock';

	form.append(emailLabel, passwordLabel, secretKeyLabel, errorEl, submitBtn);
	root.appendChild(form);
	emailInput.focus();

	const historyLink = document.createElement('button');
	historyLink.type = 'button';
	historyLink.className = 'icon-btn';
	historyLink.style.margin = '0 14px 14px';
	historyLink.textContent = 'Recent generated passwords →';
	historyLink.addEventListener('click', onShowHistory);
	root.appendChild(historyLink);

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		errorEl.textContent = '';
		submitBtn.disabled = true;
		submitBtn.textContent = 'Unlocking…';

		try {
			const res = await sendMessage<'UNLOCK'>({
				type: 'UNLOCK',
				payload: {
					email: emailInput.value,
					masterPassword: passwordInput.value,
					secretKey: secretKeyInput.value
				}
			});
			if (res.ok) {
				onUnlocked();
				return;
			}
			errorEl.textContent = res.error;
		} catch (err) {
			errorEl.textContent = err instanceof Error ? err.message : 'Unlock failed';
		}
		submitBtn.disabled = false;
		submitBtn.textContent = 'Unlock';
	});
}
