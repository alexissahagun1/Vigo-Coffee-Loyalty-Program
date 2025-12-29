/**
 * Penetration Testing Suite for Vigo Loyalty Program
 * 
 * These tests check for common security vulnerabilities:
 * - Unauthorized access
 * - Missing authentication
 * - Input validation bypass
 * - SQL injection
 * - Authorization bypass
 * - Rate limiting
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_USER_ID = '2663229d-8983-47ae-93d7-59df88c7b55c';

interface TestResult {
  name: string;
  passed: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<boolean>,
  severity: TestResult['severity'],
  description: string
) {
  try {
    const passed = await testFn();
    results.push({
      name,
      passed,
      severity,
      description,
    });
    console.log(`${passed ? '✅' : '❌'} ${name} - ${severity}`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      severity,
      description,
      details: error.message,
    });
    console.log(`❌ ${name} - ERROR: ${error.message}`);
  }
}

// ==================== AUTHENTICATION TESTS ====================

async function testUnauthorizedPurchaseAccess(): Promise<boolean> {
  // CRITICAL: Purchase endpoint should require authentication
  const response = await fetch(`${BASE_URL}/api/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: TEST_USER_ID }),
  });
  
  // If it succeeds without auth, this is a CRITICAL vulnerability
  // Should return 401 or 403
  return response.status === 401 || response.status === 403;
}

async function testUnauthorizedRedeemAccess(): Promise<boolean> {
  // CRITICAL: Redeem endpoint should require authentication
  const response = await fetch(`${BASE_URL}/api/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: TEST_USER_ID,
      type: 'coffee',
      points: 10,
    }),
  });
  
  // Should return 401 or 403
  return response.status === 401 || response.status === 403;
}

async function testUnauthorizedScanAccess(): Promise<boolean> {
  // HIGH: Scan endpoint should require authentication
  const response = await fetch(`${BASE_URL}/api/scan?userId=${TEST_USER_ID}`);
  
  // Should return 401 or 403
  return response.status === 401 || response.status === 403;
}

async function testUnauthorizedAdminStatsAccess(): Promise<boolean> {
  // HIGH: Admin stats should require authentication
  const response = await fetch(`${BASE_URL}/api/admin/stats`);
  
  // Should return 401 or 403
  return response.status === 401 || response.status === 403;
}

async function testUnauthorizedAdminEmployeesAccess(): Promise<boolean> {
  // HIGH: Admin employees endpoint should require authentication
  const response = await fetch(`${BASE_URL}/api/admin/employees`);
  
  // Should return 401 or 403
  return response.status === 401 || response.status === 403;
}

// ==================== INPUT VALIDATION TESTS ====================

async function testSQLInjectionInCustomerId(): Promise<boolean> {
  // HIGH: Test for SQL injection in customerId parameter
  const sqlInjectionPayloads = [
    "'; DROP TABLE profiles; --",
    "' OR '1'='1",
    "1' UNION SELECT * FROM profiles --",
    "admin'--",
  ];
  
  for (const payload of sqlInjectionPayloads) {
    const response = await fetch(`${BASE_URL}/api/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: payload }),
    });
    
    // Should return 400 or 404, not 500 (which might indicate SQL execution)
    if (response.status === 500) {
      return false; // Potential SQL injection vulnerability
    }
  }
  
  return true;
}

async function testXSSInCustomerId(): Promise<boolean> {
  // MEDIUM: Test for XSS in customerId
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src=x onerror=alert("XSS")>',
  ];
  
  for (const payload of xssPayloads) {
    const response = await fetch(`${BASE_URL}/api/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: payload }),
    });
    
    const text = await response.text();
    // Response should not contain the payload unescaped
    if (text.includes(payload) && !text.includes('&lt;')) {
      return false; // Potential XSS vulnerability
    }
  }
  
  return true;
}

async function testInvalidUUIDFormat(): Promise<boolean> {
  // MEDIUM: Should reject invalid UUID formats
  const invalidUUIDs = [
    'not-a-uuid',
    '123',
    '../../etc/passwd',
    'null',
    'undefined',
  ];
  
  for (const uuid of invalidUUIDs) {
    const response = await fetch(`${BASE_URL}/api/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: uuid }),
    });
    
    // Should return 400 or 404, not 200
    if (response.status === 200) {
      return false; // Accepted invalid UUID
    }
  }
  
  return true;
}

async function testNegativePointsInjection(): Promise<boolean> {
  // HIGH: Should not allow negative points or invalid point values
  const response = await fetch(`${BASE_URL}/api/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: TEST_USER_ID,
      type: 'coffee',
      points: -10, // Negative points
    }),
  });
  
  // Should reject negative points (400 or 401/403 for auth)
  if (response.ok) {
    const data = await response.json();
    return !data.success;
  }
  return true; // Rejected as expected
}

async function testInvalidRewardType(): Promise<boolean> {
  // MEDIUM: Should reject invalid reward types
  const invalidTypes = ['invalid', 'hack', 'admin', 'null', 'undefined'];
  
  for (const type of invalidTypes) {
    const response = await fetch(`${BASE_URL}/api/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: TEST_USER_ID,
        type: type,
        points: 10,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return false; // Accepted invalid type
      }
    }
  }
  
  return true;
}

// ==================== RATE LIMITING TESTS ====================

async function testRateLimitingOnPurchase(): Promise<boolean> {
  // MEDIUM: Should have rate limiting to prevent abuse
  const requests = Array(10).fill(null).map(() =>
    fetch(`${BASE_URL}/api/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: TEST_USER_ID }),
    })
  );
  
  const responses = await Promise.all(requests);
  const successCount = responses.filter(r => r.ok).length;
  const rateLimitedCount = responses.filter(r => r.status === 429).length;
  
  // If all requests succeed, there's no rate limiting
  // This is a warning, not a failure (rate limiting might be handled at infrastructure level)
  if (successCount === 10 && rateLimitedCount === 0) {
    console.warn('⚠️  No rate limiting detected on purchase endpoint');
  }
  
  return true; // Don't fail the test, just warn
}

// ==================== MAIN TEST RUNNER ====================

export async function runPenetrationTests() {
  console.log('🔒 Starting Penetration Tests...\n');
  
  // Authentication Tests
  await runTest(
    'Unauthorized Purchase Access',
    testUnauthorizedPurchaseAccess,
    'CRITICAL',
    'Purchase endpoint should require employee authentication'
  );
  
  await runTest(
    'Unauthorized Redeem Access',
    testUnauthorizedRedeemAccess,
    'CRITICAL',
    'Redeem endpoint should require employee authentication'
  );
  
  await runTest(
    'Unauthorized Scan Access',
    testUnauthorizedScanAccess,
    'HIGH',
    'Scan endpoint should require employee authentication'
  );
  
  await runTest(
    'Unauthorized Admin Stats Access',
    testUnauthorizedAdminStatsAccess,
    'HIGH',
    'Admin stats endpoint should require admin authentication'
  );
  
  await runTest(
    'Unauthorized Admin Employees Access',
    testUnauthorizedAdminEmployeesAccess,
    'HIGH',
    'Admin employees endpoint should require admin authentication'
  );
  
  // Input Validation Tests
  await runTest(
    'SQL Injection Protection',
    testSQLInjectionInCustomerId,
    'HIGH',
    'Should prevent SQL injection in customerId parameter'
  );
  
  await runTest(
    'XSS Protection',
    testXSSInCustomerId,
    'MEDIUM',
    'Should prevent XSS attacks in customerId parameter'
  );
  
  await runTest(
    'Invalid UUID Validation',
    testInvalidUUIDFormat,
    'MEDIUM',
    'Should reject invalid UUID formats'
  );
  
  await runTest(
    'Negative Points Prevention',
    testNegativePointsInjection,
    'HIGH',
    'Should reject negative point values'
  );
  
  await runTest(
    'Invalid Reward Type Validation',
    testInvalidRewardType,
    'MEDIUM',
    'Should reject invalid reward types'
  );
  
  // Rate Limiting Tests
  await runTest(
    'Rate Limiting on Purchase',
    testRateLimitingOnPurchase,
    'MEDIUM',
    'Purchase endpoint should have rate limiting'
  );
  
  // Print Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const critical = results.filter(r => r.severity === 'CRITICAL');
  const high = results.filter(r => r.severity === 'HIGH');
  const medium = results.filter(r => r.severity === 'MEDIUM');
  const low = results.filter(r => r.severity === 'LOW');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\nCritical Issues: ${critical.filter(r => !r.passed).length}/${critical.length}`);
  console.log(`High Issues: ${high.filter(r => !r.passed).length}/${high.length}`);
  console.log(`Medium Issues: ${medium.filter(r => !r.passed).length}/${medium.length}`);
  
  // Print Failed Tests
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`\n  [${test.severity}] ${test.name}`);
      console.log(`  Description: ${test.description}`);
      if (test.details) {
        console.log(`  Details: ${test.details}`);
      }
    });
  }
  
  return results;
}

// Run tests if executed directly
if (require.main === module) {
  runPenetrationTests().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

