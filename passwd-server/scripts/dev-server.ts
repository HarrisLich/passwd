import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from '../src/index';
import { envFromProcess } from '../src/core/env';
import { logger } from '../src/infra/observability/logger';

const env = envFromProcess();
const port = Number(process.env.PORT ?? 8787);

serve(
	{
		fetch: (request) => app.fetch(request, env),
		port
	},
	(info) => {
		logger.info({
			msg: 'passwd-server listening',
			port: info.port,
			auth: `${env.BETTER_AUTH_URL}/api/auth`,
			db: env.TURSO_DATABASE_URL
		});
	}
);
