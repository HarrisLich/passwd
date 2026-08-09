import { prepareSignup } from '../../passwd-crypto/src/index.ts';

async function main() {
	const email = `ui-test-${Date.now()}@example.com`;
	const master = 'ui-master-password-ok';
	const material = await prepareSignup(master);

	const res = await fetch('http://127.0.0.1:8787/api/auth/sign-up/email', {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
		body: JSON.stringify({
			email,
			password: material.authPassword,
			name: 'UI Test',
			kdfParams: JSON.stringify(material.kdfParams)
		})
	});
	const body = (await res.json()) as { user?: { email?: string; kdfParams?: string } };
	console.log('signup', res.status, body.user?.email, Boolean(body.user?.kdfParams));

	const kdf = await fetch(`http://127.0.0.1:8787/v1/kdf/params?email=${encodeURIComponent(email)}`);
	console.log('kdf', kdf.status, await kdf.json());

	const front = await fetch('http://127.0.0.1:5173/auth/signup');
	console.log('frontend signup page', front.status);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
