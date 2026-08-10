import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/infra/db/schema';

/**
 * One-off ops script: full-replace sync between the local dev DB and a
 * production Turso DB. Deliberately NOT a merge — the target is wiped and
 * fully replaced with the source's data. See passwd-server/README.md.
 *
 * Usage:
 *   tsx scripts/db-sync.ts pull        # production -> local (confirms first)
 *   tsx scripts/db-sync.ts push-data   # local -> production (confirms first)
 *   ... --yes / -y                     # skip the interactive confirmation
 */

type Direction = 'pull' | 'push-data';

// Insert order = FK-dependency order (parents before children), read straight off
// passwd-server/src/infra/db/schema.ts. Delete order is the exact reverse. Not relying
// on SQLite/libsql cascade — that requires `PRAGMA foreign_keys = ON` on the connection,
// which isn't guaranteed for a remote Turso session.
const TABLE_ORDER: Array<{ name: string; table: (typeof schema)[keyof typeof schema] }> = [
	{ name: 'user', table: schema.user },
	{ name: 'verification', table: schema.verification },
	{ name: 'session', table: schema.session },
	{ name: 'account', table: schema.account },
	{ name: 'vaults', table: schema.vaults },
	{ name: 'groups', table: schema.groups },
	{ name: 'vaultShares', table: schema.vaultShares },
	{ name: 'vaultItems', table: schema.vaultItems },
	{ name: 'itemShares', table: schema.itemShares },
	{ name: 'groupMembers', table: schema.groupMembers }
];

function connect(url: string, authToken?: string) {
	const client: Client = createClient(authToken ? { url, authToken } : { url });
	return { client, db: drizzle(client, { schema }) };
}

type Endpoint = ReturnType<typeof connect>;

function resolveEndpoints(direction: Direction): {
	source: Endpoint;
	target: Endpoint;
	sourceLabel: string;
	targetLabel: string;
} {
	const local = connect('file:./.data/passwd.db');
	const prodUrl = process.env.PROD_TURSO_DATABASE_URL;
	const prodToken = process.env.PROD_TURSO_AUTH_TOKEN;
	if (!prodUrl || !prodToken) {
		throw new Error(
			'PROD_TURSO_DATABASE_URL and PROD_TURSO_AUTH_TOKEN must be set in passwd-server/.env (see .env.example)'
		);
	}
	const prod = connect(prodUrl, prodToken);

	return direction === 'pull'
		? { source: prod, target: local, sourceLabel: 'PRODUCTION (Turso)', targetLabel: 'local (file:./.data/passwd.db)' }
		: { source: local, target: prod, sourceLabel: 'local (file:./.data/passwd.db)', targetLabel: 'PRODUCTION (Turso)' };
}

async function main() {
	const [, , directionArg, ...rest] = process.argv;
	if (directionArg !== 'pull' && directionArg !== 'push-data') {
		console.error('Usage: tsx scripts/db-sync.ts <pull|push-data> [--yes]');
		process.exit(1);
	}
	const direction: Direction = directionArg;
	const skipConfirm = rest.includes('--yes') || rest.includes('-y');

	const { source, target, sourceLabel, targetLabel } = resolveEndpoints(direction);

	console.log(`\n${direction === 'pull' ? 'PULL' : 'PUSH-DATA'}: ${sourceLabel} -> ${targetLabel}\n`);
	console.log('Source row counts:');
	const rowsByTable = new Map<string, unknown[]>();
	for (const { name, table } of TABLE_ORDER) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const rows = await source.db.select().from(table as any);
		rowsByTable.set(name, rows);
		console.log(`  ${name}: ${rows.length}`);
	}

	console.log(`\nThis will COMPLETELY REPLACE all data in ${targetLabel}.`);

	if (!skipConfirm) {
		const rl = createInterface({ input: process.stdin, output: process.stdout });
		const answer = await rl.question('Type "yes" to continue: ');
		rl.close();
		if (answer.trim().toLowerCase() !== 'yes') {
			console.log('Aborted — no changes made.');
			source.client.close();
			target.client.close();
			process.exit(1);
		}
	}

	const CHUNK_SIZE = 50;

	await target.db.transaction(async (tx) => {
		for (const { name, table } of [...TABLE_ORDER].reverse()) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await tx.delete(table as any);
			console.log(`  deleted all rows from ${name}`);
		}
		for (const { name, table } of TABLE_ORDER) {
			const rows = rowsByTable.get(name) ?? [];
			for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await tx.insert(table as any).values(rows.slice(i, i + CHUNK_SIZE) as any);
			}
			console.log(`  inserted ${rows.length} rows into ${name}`);
		}
	});

	console.log('\nDone.');
	source.client.close();
	target.client.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
