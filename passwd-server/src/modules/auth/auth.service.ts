/**
 * Session auth is owned by Better Auth (`/api/auth/*`).
 *
 * Client contract (zero-knowledge):
 * - `password` = client-derived auth secret (from Argon2id auth path), NOT the master password
 * - `kdfParams` = public JSON (salts + Argon2 params) stored on `user.kdf_params`
 *
 * Endpoints:
 * - POST /api/auth/sign-up/email
 * - POST /api/auth/sign-in/email
 * - GET  /api/auth/get-session
 * - POST /api/auth/sign-out
 * - GET  /v1/me  (session-gated profile + kdfParams)
 */
export const AuthService = {
	endpoints: {
		signUp: '/api/auth/sign-up/email',
		signIn: '/api/auth/sign-in/email',
		session: '/api/auth/get-session',
		signOut: '/api/auth/sign-out',
		me: '/v1/me'
	}
};
