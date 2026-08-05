async function main() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin12@gmail.com',
      password: 'Admin@12345678',
    }),
  });
  const loginData = await loginRes.json() as any;
  const token = loginData.data.tokens.accessToken;

  // Generate a test session ID
  const sessionId = '12345678-1234-1234-1234-123456789abc';

  console.log('SENDING CHAT MESSAGE TO SESSION:', sessionId);
  const res = await fetch(`http://localhost:4000/api/v1/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'What is the purpose of the Knowledge Pipeline in the CortexCX architecture?',
    }),
  });
  console.log('STATUS:', res.status);
  const data = await res.json();
  console.log('DATA:', JSON.stringify(data, null, 2));
}
main().catch(console.error);
