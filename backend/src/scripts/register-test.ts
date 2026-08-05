import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BACKEND_URL = 'http://localhost:4000/api/v1';

async function runRegisterTests() {
  console.log('\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[36m    RagCX: Running Registration Integration Tests   \x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m');

  const testEmail = `reg-test-${Date.now()}@example.com`;
  const testPassword = 'RegSecurePassword123!';

  try {
    // 1. Submit invalid registration payload (Passwords do not match)
    console.log('Testing registration with mismatched passwords...');
    const resMismatch = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        confirmPassword: 'DifferentPassword123!',
      }),
    });
    const dataMismatch = await resMismatch.json();
    if (resMismatch.status === 400) {
      console.log('\x1b[32m✔ Correctly rejected mismatched passwords with HTTP 400\x1b[0m');
    } else {
      console.log(`\x1b[31m❌ Failure: Expected HTTP 400 for password mismatch, got: ${resMismatch.status}\x1b[0m`);
      process.exit(1);
    }

    // 2. Submit valid registration payload
    console.log('Testing successful registration...');
    const resRegister = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      }),
    });
    const dataRegister = await resRegister.json();
    if (resRegister.status === 201) {
      console.log('\x1b[32m✔ Registration successful. HTTP 201 received.\x1b[0m');
      console.log(`  -> User ID: ${dataRegister.data.id}`);
      console.log(`  -> Default Assigned Role: ${dataRegister.data.role}`);
      if (dataRegister.data.role !== 'USER') {
        console.log(`\x1b[31m❌ Failure: Expected default role to be USER, got: ${dataRegister.data.role}\x1b[0m`);
        process.exit(1);
      }
    } else {
      console.log(`\x1b[31m❌ Failure: Registration failed with status: ${resRegister.status}\x1b[0m`);
      console.log(JSON.stringify(dataRegister));
      process.exit(1);
    }

    // 3. Attempt duplicate registration with same email
    console.log('Testing duplicate registration check...');
    const resDuplicate = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      }),
    });
    const dataDuplicate = await resDuplicate.json();
    if (resDuplicate.status === 400 && dataDuplicate.error.code === 'EMAIL_ALREADY_IN_USE') {
      console.log('\x1b[32m✔ Correctly blocked duplicate registration with EMAIL_ALREADY_IN_USE\x1b[0m');
    } else {
      console.log(`\x1b[31m❌ Failure: Expected HTTP 400 duplicate block, got: ${resDuplicate.status}\x1b[0m`);
      console.log(JSON.stringify(dataDuplicate));
      process.exit(1);
    }

    // 4. Verify login using registered credentials
    console.log('Testing login with newly registered credentials...');
    const resLogin = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bypass-rate-limit': 'true',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const dataLogin = await resLogin.json();
    if (resLogin.status === 200) {
      console.log('\x1b[32m✔ Login successful with registered credentials\x1b[0m');
    } else {
      console.log(`\x1b[31m❌ Failure: Login failed with status: ${resLogin.status}\x1b[0m`);
      console.log(JSON.stringify(dataLogin));
      process.exit(1);
    }

    // Cleanup
    console.log('Cleaning up registration test user...');
    await prisma.user.delete({ where: { email: testEmail } });

    console.log('\x1b[32;1m\n✔ ALL REGISTRATION TESTS PASSED SUCCESSFULLY\x1b[0m');
    console.log('\x1b[36m====================================================\x1b[0m');
    process.exit(0);

  } catch (error) {
    console.error('\x1b[31m❌ Registration testing execution failed!\x1b[0m');
    console.error(error);
    await prisma.user.delete({ where: { email: testEmail } }).catch(() => {});
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRegisterTests();
