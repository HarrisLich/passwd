import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './core/app-types';
import { createAuth } from './infra/auth/better-auth';
import { createDb } from './infra/db/client';
import { logger } from './infra/observability/logger';
import { healthRoutes } from './app/routes/health';
import { kdfRoutes } from './app/routes/kdf';
import { vaultRoutes } from './app/routes/vault';
import { vaultsRoutes } from './app/routes/vaults';
import { syncRoutes } from './app/routes/sync';
import { identityRoutes } from './app/routes/identity';
import { usersRoutes } from './app/routes/users';
import { groupsRoutes } from './app/routes/groups';
import { IdentityService } from './modules/identity/identity.service';

const app = new Hono<AppEnv>();

app.use(
	'*',
	cors({
		origin: (origin, c) => {
			const allowed = new Set([
				'http://localhost:5173',
				'http://127.0.0.1:5173',
				'http://localhost:8787',
				'http://127.0.0.1:8787'
			]);
			const extensionOrigin = (c.env as Partial<AppEnv['Bindings']>).EXTENSION_ORIGIN;
			if (extensionOrigin) allowed.add(extensionOrigin);
			if (!origin) return 'http://127.0.0.1:5173';
			return allowed.has(origin) ? origin : null;
		},
		allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization'],
		credentials: true
	})
);

app.use('*', async (c, next) => {
	const auth = createAuth(c.env);
	const db = createDb(c.env);
	c.set('auth', auth);
	c.set('db', db);

	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	c.set('user', session?.user ?? null);
	c.set('session', session?.session ?? null);

	const start = Date.now();
	await next();
	logger.info({
		method: c.req.method,
		path: c.req.path,
		status: c.res.status,
		ms: Date.now() - start,
		userId: session?.user?.id
	});
});

app.on(['POST', 'GET'], '/api/auth/*', (c) => {
	return c.get('auth').handler(c.req.raw);
});

app.route('/health', healthRoutes);
app.route('/v1/kdf', kdfRoutes);
app.route('/v1/vault', vaultRoutes);
app.route('/v1/vaults', vaultsRoutes);
app.route('/v1/sync', syncRoutes);
app.route('/v1/identity', identityRoutes);
app.route('/v1/users', usersRoutes);
app.route('/v1/groups', groupsRoutes);

app.get('/v1/me', async (c) => {
	const user = c.get('user');
	if (!user) return c.json({ error: 'unauthorized' }, 401);
	const identity = await IdentityService.getIdentityBundle(c.get('db'), user.id);
	return c.json({
		id: user.id,
		email: user.email,
		name: user.name,
		kdfParams: user.kdfParams,
		hasIdentity: Boolean(identity?.publicKey)
	});
});

app.notFound((c) => c.json({ error: 'not_found' }, 404));

export default app;
