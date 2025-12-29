#!/bin/bash

# Security Testing Script for Vigo Loyalty Program
# This script runs penetration tests and security checks

set -e

echo "🔒 Starting Security Tests..."
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
TEST_USER_ID="2663229d-8983-47ae-93d7-59df88c7b55c"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local severity="$3"
    
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} [${severity}]"
        ((TESTS_FAILED++))
        return 1
    fi
}

# ==================== AUTHENTICATION TESTS ====================

echo "🔐 Authentication Tests"
echo "----------------------"

# Test 1: Purchase endpoint without authentication
run_test \
    "Purchase endpoint requires auth" \
    "curl -s -X POST ${BASE_URL}/api/purchase -H 'Content-Type: application/json' -d '{\"customerId\":\"${TEST_USER_ID}\"}' | grep -q '401\|403\|error' || [ \$(curl -s -o /dev/null -w '%{http_code}' -X POST ${BASE_URL}/api/purchase -H 'Content-Type: application/json' -d '{\"customerId\":\"${TEST_USER_ID}\"}') -eq 401 ] || [ \$(curl -s -o /dev/null -w '%{http_code}' -X POST ${BASE_URL}/api/purchase -H 'Content-Type: application/json' -d '{\"customerId\":\"${TEST_USER_ID}\"}') -eq 403 ]" \
    "CRITICAL"

# Test 2: Redeem endpoint without authentication
run_test \
    "Redeem endpoint requires auth" \
    "curl -s -X POST ${BASE_URL}/api/redeem -H 'Content-Type: application/json' -d '{\"customerId\":\"${TEST_USER_ID}\",\"type\":\"coffee\",\"points\":10}' | grep -q '401\|403\|error' || [ \$(curl -s -o /dev/null -w '%{http_code}' -X POST ${BASE_URL}/api/redeem -H 'Content-Type: application/json' -d '{\"customerId\":\"${TEST_USER_ID}\",\"type\":\"coffee\",\"points\":10}') -eq 401 ] || [ \$(curl -s -o /dev/null -w '%{http_code}' -X POST ${BASE_URL}/api/redeem -H 'Content-Type: application/json' -d '{\"customerId\":\"${TEST_USER_ID}\",\"type\":\"coffee\",\"points\":10}') -eq 403 ]" \
    "CRITICAL"

# Test 3: Scan endpoint without authentication
run_test \
    "Scan endpoint requires auth" \
    "[ \$(curl -s -o /dev/null -w '%{http_code}' ${BASE_URL}/api/scan?userId=${TEST_USER_ID}) -eq 401 ] || [ \$(curl -s -o /dev/null -w '%{http_code}' ${BASE_URL}/api/scan?userId=${TEST_USER_ID}) -eq 403 ]" \
    "HIGH"

# Test 4: Admin stats without authentication
run_test \
    "Admin stats requires auth" \
    "[ \$(curl -s -o /dev/null -w '%{http_code}' ${BASE_URL}/api/admin/stats) -eq 401 ] || [ \$(curl -s -o /dev/null -w '%{http_code}' ${BASE_URL}/api/admin/stats) -eq 403 ]" \
    "HIGH"

# ==================== INPUT VALIDATION TESTS ====================

echo ""
echo "🛡️  Input Validation Tests"
echo "-------------------------"

# Test 5: SQL Injection attempt
run_test \
    "SQL Injection protection" \
    "[ \$(curl -s -o /dev/null -w '%{http_code}' -X POST ${BASE_URL}/api/purchase -H 'Content-Type: application/json' -d '{\"customerId\":\"'\'' OR '\''1'\''='\''1\"}') -ne 500 ]" \
    "HIGH"

# Test 6: Invalid UUID format
run_test \
    "Invalid UUID rejection" \
    "[ \$(curl -s -o /dev/null -w '%{http_code}' -X POST ${BASE_URL}/api/purchase -H 'Content-Type: application/json' -d '{\"customerId\":\"not-a-uuid\"}') -ne 200 ]" \
    "MEDIUM"

# Test 7: Missing required fields
run_test \
    "Missing customerId rejection" \
    "[ \$(curl -s -o /dev/null -w '%{http_code}' -X POST ${BASE_URL}/api/purchase -H 'Content-Type: application/json' -d '{}') -eq 400 ] || [ \$(curl -s -o /dev/null -w '%{http_code}' -X POST ${BASE_URL}/api/purchase -H 'Content-Type: application/json' -d '{}') -eq 401 ]" \
    "MEDIUM"

# Test 8: Invalid reward type
run_test \
    "Invalid reward type rejection" \
    "[ \$(curl -s -o /dev/null -w '%{http_code}' -X POST ${BASE_URL}/api/redeem -H 'Content-Type: application/json' -d '{\"customerId\":\"${TEST_USER_ID}\",\"type\":\"invalid\",\"points\":10}') -ne 200 ]" \
    "MEDIUM"

# ==================== SUMMARY ====================

echo ""
echo "=============================="
echo "📊 Test Summary"
echo "=============================="
echo -e "${GREEN}✅ Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}❌ Failed: ${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All security tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some security tests failed. Please review the issues above.${NC}"
    exit 1
fi

