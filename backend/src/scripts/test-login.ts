async function main() {
  const res = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin12@gmail.com',
      password: 'Admin@12345678',
    }),
  });
  console.log('STATUS:', res.status);
  const data = await res.json();
  console.log('DATA:', JSON.stringify(data, null, 2));
}
main().catch(console.error);
