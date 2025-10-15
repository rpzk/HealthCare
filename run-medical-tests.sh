#!/bin/bash
# Quick Test Runner for Medical Records API
# Usage: bash run-tests.sh [basic|advanced|all]

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://localhost:3000"
TIMEOUT=30
TEST_TYPE="${1:-basic}"

# Functions
print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

check_server() {
  print_info "Checking if server is running on $SERVER_URL..."
  for i in $(seq 1 $TIMEOUT); do
    if curl -s "$SERVER_URL/api/health" > /dev/null 2>&1; then
      print_success "Server is ready!"
      return 0
    fi
    if [ $((i % 5)) -eq 0 ]; then
      echo -n "."
    fi
    sleep 1
  done
  
  print_error "Server not responding after $TIMEOUT seconds"
  echo ""
  echo "Make sure to start the server:"
  echo -e "${YELLOW}  npm run dev${NC}"
  exit 1
}

run_basic_tests() {
  print_header "Running Basic Medical Records Tests"
  
  if [ -f "test-medical-records.js" ]; then
    node test-medical-records.js
  else
    print_error "test-medical-records.js not found"
    exit 1
  fi
}

run_advanced_tests() {
  print_header "Running Advanced Medical Records Tests"
  
  if [ -f "test-medical-records-advanced.ts" ]; then
    npx tsx test-medical-records-advanced.ts
  else
    print_error "test-medical-records-advanced.ts not found"
    exit 1
  fi
}

run_all_tests() {
  run_basic_tests
  run_advanced_tests
}

show_usage() {
  echo "Medical Records API Test Runner"
  echo ""
  echo "Usage: bash run-tests.sh [command]"
  echo ""
  echo "Commands:"
  echo "  basic       - Run basic integration tests (default)"
  echo "  advanced    - Run advanced validation tests"
  echo "  all         - Run all tests"
  echo "  help        - Show this help message"
  echo ""
  echo "Examples:"
  echo "  bash run-tests.sh basic"
  echo "  bash run-tests.sh advanced"
  echo "  bash run-tests.sh all"
}

# Main script
print_header "Medical Records API - Test Suite"

case "$TEST_TYPE" in
  "basic")
    check_server
    run_basic_tests
    ;;
  "advanced")
    check_server
    run_advanced_tests
    ;;
  "all")
    check_server
    run_basic_tests
    run_advanced_tests
    ;;
  "help"|"-h"|"--help")
    show_usage
    ;;
  *)
    print_error "Unknown command: $TEST_TYPE"
    show_usage
    exit 1
    ;;
esac

print_header "Test Execution Complete"
print_success "All tests completed successfully!"
