import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { JwtService } from '../modules/auth/jwt/jwt.service.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const BACKEND_URL = 'http://localhost:4000/api/v1';

async function runSecurityTests() {
  console.log('\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[36m    RagCX: Running Security Validation Suite        \x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m');

  const testEmail = `sec-test-${Date.now()}@example.com`;
  const testPassword = 'SecSecurePassword123!';
  let tokens: { accessToken: string; refreshToken: string } | null = null;
  let hasFailed = false;

  try {
    // -------------------------------------------------------------------------
    // 1. Authentication & JWT Hardening
    // -------------------------------------------------------------------------
    console.log('\n\x1b[33m[SEC-1] Auditing Authentication Boundaries...\x1b[0m');

    // Test request with missing authorization header
    console.log('Testing missing Auth Header on protected endpoint...');
    const resNoAuth = await fetch(`${BACKEND_URL}/documents`, { method: 'GET' });
    if (resNoAuth.status === 401) {
      console.log('\x1b[32m✔ Correctly rejected missing token with HTTP 401\x1b[0m');
    } else {
      console.log(`\x1b[31m❌ Vulnerability: Access allowed without token: Status ${resNoAuth.status}\x1b[0m`);
      hasFailed = true;
    }

    // Test request with malformed JWT
    console.log('Testing malformed JWT token...');
    const resBadJwt = await fetch(`${BACKEND_URL}/documents`, {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    if (resBadJwt.status === 401) {
      console.log('\x1b[32m✔ Correctly rejected malformed token with HTTP 401\x1b[0m');
    } else {
      console.log(`\x1b[31m❌ Vulnerability: Accepted malformed token: Status ${resBadJwt.status}\x1b[0m`);
      hasFailed = true;
    }

    // Seed test users
    console.log('Seeding normal and admin users...');
    const passwordHash = await bcrypt.hash(testPassword, 10);
    const standardUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        role: 'USER', // Standard user without upload permissions
        isActive: true,
      },
    });

    const jwtService = new JwtService();
    const sessionId = uuidv4();
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: standardUser.id,
        userAgent: 'sec-test',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        hashedRefreshToken: uuidv4(),
      }
    });

    const standardAccessToken = await jwtService.signAccessToken({
      sub: standardUser.id,
      email: standardUser.email,
      role: standardUser.role,
      sessionId,
    });

    tokens = {
      accessToken: standardAccessToken,
      refreshToken: 'dummy-refresh-token',
    };

    // -------------------------------------------------------------------------
    // 2. Authorization & Role Guards
    // -------------------------------------------------------------------------
    console.log('\n\x1b[33m[SEC-2] Auditing Role & Permission Guards...\x1b[0m');

    // Standard user attempting to upload file (should be blocked by role guards)
    console.log('Testing standard user accessing Admin-only PDF upload endpoint...');
    const mockPdfBuffer = Buffer.from('%PDF-1.4\n...');
    const formData = new FormData();
    const mockFileBlob = new Blob([mockPdfBuffer], { type: 'application/pdf' });
    formData.append('file', mockFileBlob, 'secret-doc.pdf');

    const resUploadForbidden = await fetch(`${BACKEND_URL}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: formData,
    });
    // Check if it returns 403 Forbidden or 401 Unauthorized
    if (resUploadForbidden.status === 403 || resUploadForbidden.status === 401) {
      console.log(`\x1b[32m✔ Correctly blocked standard user from upload with HTTP ${resUploadForbidden.status}\x1b[0m`);
    } else {
      console.log(`\x1b[31m❌ Vulnerability: Role bypass allowed standard user upload: Status ${resUploadForbidden.status}\x1b[0m`);
      hasFailed = true;
    }

    // -------------------------------------------------------------------------
    // 3. File Upload Extensions & Content Security
    // -------------------------------------------------------------------------
    console.log('\n\x1b[33m[SEC-3] Auditing Ingestion Filter Guards...\x1b[0m');

    // Create an Admin user to test upload validation
    const adminEmail = `admin-sec-test-${Date.now()}@example.com`;
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    const adminSessionId = uuidv4();
    await prisma.session.create({
      data: {
        id: adminSessionId,
        userId: adminUser.id,
        userAgent: 'sec-test',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        hashedRefreshToken: uuidv4(),
      }
    });

    const adminToken = await jwtService.signAccessToken({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      sessionId: adminSessionId,
    });

    // Upload illegal extension/mime-type (.txt as text/plain)
    console.log('Testing upload of unsupported file extension (.txt)...');
    const txtFormData = new FormData();
    txtFormData.append('file', new Blob(['illegal data'], { type: 'text/plain' }), 'evil-script.txt');

    const resIllegalUpload = await fetch(`${BACKEND_URL}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: txtFormData,
    });
    const illegalData = await resIllegalUpload.json();
    if (resIllegalUpload.status === 400) {
      console.log('\x1b[32m✔ Correctly rejected illegal extension with HTTP 400\x1b[0m');
    } else {
      console.log(`\x1b[31m❌ Vulnerability: Allowed unsupported file types: Status ${resIllegalUpload.status}\x1b[0m`);
      hasFailed = true;
    }

    // -------------------------------------------------------------------------
    // 4. SQL Injection Injection Testing
    // -------------------------------------------------------------------------
    console.log('\n\x1b[33m[SEC-4] Auditing SQL Injection Resistance...\x1b[0m');

    // Run SQL Injection payload in route params
    console.log("Testing SQL injection payload: \"' OR '1'='1\" on document fetch...");
    const resSqlInjection = await fetch(`${BACKEND_URL}/documents/'%20OR%20'1'='1`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const sqlResText = await resSqlInjection.text();
    if (resSqlInjection.status === 404 || resSqlInjection.status === 400) {
      console.log('\x1b[32m✔ Safe parameterization verified (endpoint returned clean error)\x1b[0m');
    } else {
      console.log(`\x1b[31m❌ Vulnerability: Unsafe parsing or raw execution: Status ${resSqlInjection.status}\x1b[0m`);
      console.log('Response Body:', sqlResText);
      hasFailed = true;
    }

    // -------------------------------------------------------------------------
    // 5. Rate Limiting verification
    // -------------------------------------------------------------------------
    console.log('\n\x1b[33m[SEC-5] Auditing Rate Limiting Shields...\x1b[0m');
    console.log('Flooding authentication login endpoint with multiple requests...');
    let limitReached = false;
    for (let i = 0; i < 22; i++) {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'wrong-password' }),
      });
      if (res.status === 429) {
        limitReached = true;
        break;
      }
    }
    if (limitReached) {
      console.log('\x1b[32m✔ Rate limiter successfully activated with HTTP 429 Too Many Requests\x1b[0m');
    } else {
      console.log('\x1b[31m❌ Vulnerability: Rate Limiting did not trigger under flood conditions\x1b[0m');
      hasFailed = true;
    }

    // Cleanup
    console.log('\nCleaning up database resources...');
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, adminEmail] } },
    });

    console.log('\n\x1b[36m====================================================\x1b[0m');
    if (hasFailed) {
      console.log('\x1b[31;1m      SECURITY VALIDATION FAILED COMPLIANCE         \x1b[0m');
      console.log('\x1b[36m====================================================\x1b[0m');
      process.exit(1);
    } else {
      console.log('\x1b[32;1m      ALL SECURITY VALIDATION TESTS PASSED          \x1b[0m');
      console.log('\x1b[36m====================================================\x1b[0m');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n\x1b[31m❌ Security testing execution failed!\x1b[0m');
    console.error(error);
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail] } },
    }).catch(() => {});
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSecurityTests();
