const BASE_URL = 'http://localhost:5000';

async function runSystemVerification() {
  console.log('====================================================');
  console.log('🚀 GymSync System Verification Test Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  async function testEndpoint(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`[PASS] ✅ Test ${totalTests}: ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`[FAIL] ❌ Test ${totalTests}: ${name} -> Error: ${err.message}`);
    }
  }

  // 1. Health check
  await testEndpoint('Backend Healthcheck API (GET /)', async () => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
    const text = await res.text();
    if (!text.includes('GymSync API')) throw new Error('Invalid body response');
  });

  // 2. AI Chat Endpoint & Domain Scoping
  await testEndpoint('AI Trainer Greeting & Fitness Scoping (POST /api/ai/chat)', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hi' })
    });
    if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
    const data = await res.json();
    if (!data.content || !data.content.includes('GymSync AI')) throw new Error('Missing greeting content');
  });

  // 3. Store Products Endpoint
  await testEndpoint('Store Products API (GET /api/store/products)', async () => {
    const res = await fetch(`${BASE_URL}/api/store/products`);
    if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Response is not an array');
  });

  // 4. Complaint Submission API
  await testEndpoint('Complaint Submission Engine (POST /api/complaints)', async () => {
    const res = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporterName: 'Automated Test Suite',
        reportedEntityType: 'Gym',
        reportedEntityId: 'test_gym_1',
        reportedEntityTitle: 'Test Gym Center',
        reason: 'Verification Check',
        description: 'Automated verification check by Phase 7 test suite.'
      })
    });
    if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
    const data = await res.json();
    if (!data.complaintId) throw new Error('Missing complaint ID');
  });

  // 5. Protected Admin Stats API
  await testEndpoint('Admin Dashboard Metrics with RBAC (GET /api/admin/stats)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'x-user-name': 'Admin Manager' }
    });
    if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
    const data = await res.json();
    if (typeof data.totalUsers !== 'number') throw new Error('Invalid metrics response');
  });

  // 6. Gym Owner Dashboard API
  await testEndpoint('Gym Owner Control Panel (GET /api/gym-owner/dashboard/testowner)', async () => {
    const res = await fetch(`${BASE_URL}/api/gym-owner/dashboard/testowner`);
    if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
    const data = await res.json();
    if (!data.gym) throw new Error('Missing gym data');
  });

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('====================================================\n');
}

runSystemVerification();
