import { messageSchema, type ExtensionMessage, type ExtensionMessageType, type ResponseOf } from './protocol';

/**
 * Single call site for popup/content → background messages. Validates the
 * outbound message against the shared schema before handing it to
 * chrome.runtime, so a malformed call fails fast on the sender side instead
 * of silently reaching the router's rejection path.
 */
export async function sendMessage<T extends ExtensionMessageType>(
	message: Extract<ExtensionMessage, { type: T }>
): Promise<ResponseOf<T>> {
	const parsed = messageSchema.parse(message);
	return (await chrome.runtime.sendMessage(parsed)) as ResponseOf<T>;
}

/** Same as sendMessage but targets a specific tab's content script instead of the background. */
export async function sendTabMessage<T extends ExtensionMessageType>(
	tabId: number,
	message: Extract<ExtensionMessage, { type: T }>
): Promise<ResponseOf<T>> {
	const parsed = messageSchema.parse(message);
	return (await chrome.tabs.sendMessage(tabId, parsed)) as ResponseOf<T>;
}
