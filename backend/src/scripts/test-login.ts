async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('ERROR: ADMIN_PASSWORD environment variable is not set.');
    console.error('Please add ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD_HERE to backend/.env');
    process.exit(1);
  }

  const res = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin12@gmail.com',
      password: adminPassword,
    }),
  });
  console.log('STATUS:', res.status);
  const data = await res.json();
  console.log('DATA:', JSON.stringify(data, null, 2));
}
main().catch(console.error);
