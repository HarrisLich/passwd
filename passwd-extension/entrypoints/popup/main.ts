import { sendMessage } from '../../lib/messaging/client';
import { renderUnlockView } from './views/unlock-view';
import { renderVaultListView } from './views/vault-list-view';
import { renderGeneratorHistoryView } from './views/generator-history-view';

async function boot(root: HTMLElement) {
	const state = await sendMessage<'GET_SESSION_STATE'>({ type: 'GET_SESSION_STATE', payload: {} });
	const showHistory = () => renderGeneratorHistoryView(root, () => void boot(root));

	if (state.unlocked && state.email) {
		renderVaultListView(root, state.email, () => void boot(root), showHistory);
	} else {
		renderUnlockView(root, () => void boot(root), showHistory);
	}
}

const root = document.getElementById('app');
if (root) void boot(root);
