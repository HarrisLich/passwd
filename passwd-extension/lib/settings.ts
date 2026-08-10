/** Non-sensitive extension settings (not vault data) — chrome.storage.local, shared by options + content script. */

const AUTOFILL_ENABLED_KEY = 'settings:autofillEnabled';

export async function getAutofillEnabled(): Promise<boolean> {
	const stored = await chrome.storage.local.get(AUTOFILL_ENABLED_KEY);
	const value = stored[AUTOFILL_ENABLED_KEY];
	return typeof value === 'boolean' ? value : true;
}

export async function setAutofillEnabled(enabled: boolean): Promise<void> {
	await chrome.storage.local.set({ [AUTOFILL_ENABLED_KEY]: enabled });
}
