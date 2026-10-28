async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('ERROR: ADMIN_PASSWORD environment variable is not set.');
    console.error('Please add ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD_HERE to backend/.env');
    process.exit(1);
  }

  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin12@gmail.com',
      password: adminPassword,
    }),
  });
  const loginData = await loginRes.json() as any;
  const token = loginData.data.tokens.accessToken;

  const res = await fetch('http://localhost:4000/api/v1/suggested-questions?documentId=2518bc08-6caa-44e4-b7e6-78ee019fdbc8', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  console.log('STATUS:', res.status);
  const data = await res.json();
  console.log('DATA:', JSON.stringify(data, null, 2));
}
main().catch(console.error);
