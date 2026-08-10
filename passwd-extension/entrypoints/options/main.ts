import { getApiBase, setApiBase } from '../../lib/api/config';
import { getAutofillEnabled, setAutofillEnabled } from '../../lib/settings';

async function render(root: HTMLElement) {
	const apiBase = await getApiBase();
	const autofillEnabled = await getAutofillEnabled();

	root.innerHTML = '';

	const apiLabel = document.createElement('label');
	const apiSpan = document.createElement('span');
	apiSpan.textContent = 'passwd-server API base URL';
	const apiInput = document.createElement('input');
	apiInput.type = 'text';
	apiInput.value = apiBase;
	apiLabel.append(apiSpan, apiInput);

	const autofillLabel = document.createElement('label');
	autofillLabel.className = 'checkbox';
	const autofillInput = document.createElement('input');
	autofillInput.type = 'checkbox';
	autofillInput.checked = autofillEnabled;
	const autofillSpan = document.createElement('span');
	autofillSpan.textContent = 'Show autofill suggestions on web pages';
	autofillLabel.append(autofillInput, autofillSpan);

	const saveBtn = document.createElement('button');
	saveBtn.type = 'button';
	saveBtn.textContent = 'Save';

	const status = document.createElement('div');
	status.className = 'status';

	saveBtn.addEventListener('click', async () => {
		await setApiBase(apiInput.value);
		await setAutofillEnabled(autofillInput.checked);
		status.textContent = 'Saved. Reload open tabs for autofill changes to take effect.';
	});

	root.append(apiLabel, autofillLabel, saveBtn, status);
}

const root = document.getElementById('app');
if (root) void render(root);
