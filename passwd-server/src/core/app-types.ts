import type { Auth, Session, SessionUser } from '../infra/auth/better-auth';
import type { Db } from '../infra/db/client';
import type { Env } from './env';

export type AppEnv = {
	Bindings: Env;
	Variables: {
		auth: Auth;
		db: Db;
		user: SessionUser | null;
		session: Session | null;
	};
};
