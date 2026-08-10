import { describe, expect, it } from 'vitest';
import { messageSchema } from '../lib/messaging/protocol';

describe('messageSchema', () => {
	it('accepts a valid UNLOCK message', () => {
		const result = messageSchema.safeParse({
			type: 'UNLOCK',
			payload: { email: 'a@b.com', masterPassword: 'x', secretKey: 'y' }
		});
		expect(result.success).toBe(true);
	});

	it('accepts LOCK with an omitted payload', () => {
		expect(messageSchema.safeParse({ type: 'LOCK' }).success).toBe(true);
	});

	it('rejects an unknown message type', () => {
		expect(messageSchema.safeParse({ type: 'DELETE_EVERYTHING', payload: {} }).success).toBe(false);
	});

	it('rejects a malformed payload for a known type', () => {
		expect(messageSchema.safeParse({ type: 'UNLOCK', payload: { email: 'not-an-email' } }).success).toBe(false);
	});

	it('rejects SAVE_LOGIN with a missing required data field', () => {
		const result = messageSchema.safeParse({
			type: 'SAVE_LOGIN',
			payload: { mode: 'create', data: { username: 'a', password: 'b', url: 'c' } }
		});
		expect(result.success).toBe(false);
	});

	it('accepts a well-formed CAPTURE_SUBMISSION message', () => {
		const result = messageSchema.safeParse({
			type: 'CAPTURE_SUBMISSION',
			payload: {
				origin: 'https://example.com',
				url: 'https://example.com/login',
				formKind: 'login',
				username: 'alice',
				password: 'hunter2'
			}
		});
		expect(result.success).toBe(true);
	});

	it('rejects CAPTURE_SUBMISSION with an empty password', () => {
		const result = messageSchema.safeParse({
			type: 'CAPTURE_SUBMISSION',
			payload: {
				origin: 'https://example.com',
				url: 'https://example.com/login',
				formKind: 'login',
				username: 'alice',
				password: ''
			}
		});
		expect(result.success).toBe(false);
	});

	it('rejects the removed CHECK_PENDING_SAVE message type', () => {
		expect(messageSchema.safeParse({ type: 'CHECK_PENDING_SAVE', payload: { origin: 'https://example.com' } }).success).toBe(
			false
		);
	});
});
