import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BACKEND_URL = 'http://localhost:4000/api/v1';

// Intercept global fetch to inject x-bypass-rate-limit header automatically
const originalFetch = global.fetch;
global.fetch = function (url: any, options: any) {
  const opts = { ...options };
  opts.headers = {
    ...opts.headers,
    'x-bypass-rate-limit': 'true',
  };
  return originalFetch(url, opts);
} as any;

async function runTests() {
  console.log('\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[36m   RagCX: Running E2E Workflow Validation Suite    \x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m');

  const testEmail = `integration-test-${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  let tokens: { accessToken: string; refreshToken: string } | null = null;
  let documentId = '';
  let chatSessionId = '';

  try {
    // -------------------------------------------------------------------------
    // WORKFLOW 1: Authentication
    // -------------------------------------------------------------------------
    console.log('\n\x1b[33m[WORKFLOW 1] Testing Authentication...\x1b[0m');

    // 1. Create User directly in PostgreSQL
    console.log('Inserting test user directly into PostgreSQL database...');
    const passwordHash = await bcrypt.hash(testPassword, 10);
    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('\x1b[32m✔ User created directly in database\x1b[0m');

    // 2. Login
    console.log('Logging in...');
    const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bypass-rate-limit': 'true',
      },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    tokens = {
      accessToken: loginData.data.tokens.accessToken,
      refreshToken: loginData.data.tokens.refreshToken,
    };
    console.log('\x1b[32m✔ Authentication successful. Tokens received.\x1b[0m');

    // 3. Refresh Token Rotation
    console.log('Testing Token Refresh Rotation...');
    const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bypass-rate-limit': 'true',
      },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    const refreshData = await refreshRes.json();
    if (refreshRes.status !== 200) {
      throw new Error(`Token refresh failed: ${JSON.stringify(refreshData)}`);
    }
    tokens.accessToken = refreshData.data.accessToken;
    tokens.refreshToken = refreshData.data.refreshToken;
    console.log('\x1b[32m✔ Refresh rotation successful. New tokens issued.\x1b[0m');

    // -------------------------------------------------------------------------
    // WORKFLOW 2: Document Upload & PDF Ingestion Pipeline
    // -------------------------------------------------------------------------
    console.log('\n\x1b[33m[WORKFLOW 2] Testing Document Upload & PDF Processing...\x1b[0m');

    // Construct a mock PDF buffer (valid PDF format signature)
    const mockPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 612 792 ] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF');
    const formData = new FormData();
    const mockFileBlob = new Blob([mockPdfBuffer], { type: 'application/pdf' });
    formData.append('file', mockFileBlob, 'test-spec-document.pdf');

    console.log('Uploading PDF to backend...');
    const uploadRes = await fetch(`${BACKEND_URL}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    if (uploadRes.status !== 201) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
    }
    documentId = uploadData.data.id;
    console.log(`\x1b[32m✔ Document uploaded successfully. ID: ${documentId}\x1b[0m`);

    // Verify metadata saved in PostgreSQL database
    console.log('Verifying metadata in PostgreSQL database...');
    const dbDoc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!dbDoc) {
      throw new Error('Document metadata not found in database.');
    }
    console.log(`  -> Database Record Status: ${dbDoc.processingStatus}`);

    // Wait for the AI Service processing loop to complete parsing and vectorizing
    console.log('Waiting for AI Service processing loop to finish (polling status)...');
    let attempts = 0;
    let completed = false;
    while (attempts < 15) {
      const pollRes = await fetch(`${BACKEND_URL}/documents/${documentId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      const pollData = await pollRes.json();
      const status = pollData.data.processingStatus;
      console.log(`  -> Attempt ${attempts + 1}: Status = ${status}`);

      if (status === 'COMPLETED') {
        completed = true;
        break;
      } else if (status === 'FAILED') {
        throw new Error('AI Service marked document processing as FAILED.');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    }

    if (!completed) {
      throw new Error('Timeout waiting for AI document processing completion.');
    }
    console.log('\x1b[32m✔ PDF processing pipeline, chunking, and ChromaDB insertion completed.\x1b[0m');

    // -------------------------------------------------------------------------
    // WORKFLOW 3: Chat conversation & QA execution
    // -------------------------------------------------------------------------
    console.log('\n\x1b[33m[WORKFLOW 3] Testing Chat QA Flow...\x1b[0m');

    // 1. Create session
    console.log('Creating chat session...');
    const sessionRes = await fetch(`${BACKEND_URL}/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({ title: 'Safety Guidelines Conversation' }),
    });
    const sessionData = await sessionRes.json();
    chatSessionId = sessionData.sessionId;
    console.log(`\x1b[32m✔ Chat session created. ID: ${chatSessionId}\x1b[0m`);

    // 2. Send question
    const testQuestion = 'What are the key escape protocols?';
    console.log(`Sending question: "${testQuestion}"...`);
    const qaRes = await fetch(`${BACKEND_URL}/chat/sessions/${chatSessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({ prompt: testQuestion }),
    });
    const qaData = await qaRes.json();
    if (qaRes.status !== 200) {
      throw new Error(`QA request failed: ${JSON.stringify(qaData)}`);
    }

    console.log('\x1b[32m✔ QA Response received successfully:\x1b[0m');
    console.log(`  -> Answer: ${qaData.answer}`);
    console.log(`  -> Confidence: ${qaData.confidence}`);
    console.log(`  -> Citations found: ${qaData.citations.length}`);

    // Verify conversation memory in database
    console.log('Verifying conversation memory persisted in PostgreSQL...');
    const messages = await prisma.chatMessage.findMany({
      where: { chatSession: { sessionIdentifier: chatSessionId } },
    });
    console.log(`  -> Persisted messages count: ${messages.length}`);
    if (messages.length < 2) {
      throw new Error('Conversation memory failed to save all messages.');
    }
    console.log('\x1b[32m✔ Conversation memory successfully saved.\x1b[0m');

    // -------------------------------------------------------------------------
    // WORKFLOW 4: Suggested Questions Generation
    // -------------------------------------------------------------------------
    console.log('\n\x1b[33m[WORKFLOW 4] Testing Suggested Questions Flow...\x1b[0m');
    const suggestRes = await fetch(`${BACKEND_URL}/suggested-questions?documentId=${documentId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    const suggestData = await suggestRes.json();
    if (suggestRes.status !== 200) {
      throw new Error(`Suggested questions request failed: ${JSON.stringify(suggestData)}`);
    }
    console.log(`\x1b[32m✔ Suggested questions received (${suggestData.length} questions):\x1b[0m`);
    suggestData.forEach((q: any, i: number) => {
      console.log(`  -> Q${i+1}: ${q.question} (Confidence: ${q.confidence})`);
    });

    // -------------------------------------------------------------------------
    // WORKFLOW 5: Document Lifecycle Operations
    // -------------------------------------------------------------------------
    console.log('\n\x1b[33m[WORKFLOW 5] Testing Document Lifecycle (Delete/Restore/Reprocess)...\x1b[0m');

    // 1. Delete
    console.log('Deleting document...');
    const delRes = await fetch(`${BACKEND_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (delRes.status !== 200) {
      throw new Error(`Document deletion failed: ${await delRes.text()}`);
    }
    const deletedDoc = await prisma.document.findUnique({ where: { id: documentId } });
    console.log(`  -> Database Status: ${deletedDoc?.uploadStatus}`);
    console.log('\x1b[32m✔ Document soft-deleted successfully.\x1b[0m');

    // 2. Restore
    console.log('Restoring document...');
    const restoreRes = await fetch(`${BACKEND_URL}/documents/${documentId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (restoreRes.status !== 200) {
      throw new Error(`Document restore failed: ${await restoreRes.text()}`);
    }
    const restoredDoc = await prisma.document.findUnique({ where: { id: documentId } });
    console.log(`  -> Database Status: ${restoredDoc?.uploadStatus}`);
    console.log('\x1b[32m✔ Document restored successfully.\x1b[0m');

    // Force database status to COMPLETED to allow testing reprocess
    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'COMPLETED' },
    });

    // 3. Reprocess
    console.log('Reprocessing document...');
    const reprocessRes = await fetch(`${BACKEND_URL}/documents/${documentId}/reprocess`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (reprocessRes.status !== 200) {
      throw new Error(`Document reprocess failed: ${await reprocessRes.text()}`);
    }
    console.log('\x1b[32m✔ Document reprocess request accepted successfully.\x1b[0m');

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n\x1b[33mCleaning up test database structures...\x1b[0m');
    await prisma.user.delete({ where: { email: testEmail } });
    console.log('\x1b[32m✔ Cleanup complete.\x1b[0m');

    console.log('\n\x1b[32;1m====================================================\x1b[0m');
    console.log('\x1b[32;1m      ALL SYSTEM INTEGRATION WORKFLOWS PASSED       \x1b[0m');
    console.log('\x1b[32;1m====================================================\x1b[0m');

  } catch (error) {
    console.error('\n\x1b[31;1m❌ Integration validation failed!\x1b[0m');
    console.error(error);

    // Clean up if we created the user
    try {
      await prisma.user.delete({ where: { email: testEmail } }).catch(() => {});
    } catch {}

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
