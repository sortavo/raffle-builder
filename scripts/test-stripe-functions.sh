#!/bin/bash
#
# Automated Stripe Edge Functions Test Runner
#
# Usage: ./scripts/test-stripe-functions.sh [options]
#
# Options:
#   --unit       Run unit tests only (no Stripe CLI needed)
#   --webhook    Run webhook tests with Stripe CLI
#   --e2e        Run full E2E tests (requires test user)
#   --all        Run all tests
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     SORTAVO - Stripe Edge Functions Test Suite            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for required tools
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"

    if ! command -v deno &> /dev/null; then
        echo -e "${RED}✗ Deno is not installed. Install from https://deno.land${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Deno installed$(deno --version | head -1)${NC}"

    if [ "$1" == "--webhook" ] || [ "$1" == "--all" ]; then
        if ! command -v stripe &> /dev/null; then
            echo -e "${YELLOW}⚠ Stripe CLI not installed. Webhook tests will be skipped.${NC}"
            echo "  Install from: https://stripe.com/docs/stripe-cli"
        else
            echo -e "${GREEN}✓ Stripe CLI installed${NC}"
        fi
    fi
}

# Run unit tests with Deno
run_unit_tests() {
    echo ""
    echo -e "${BLUE}━━━ Running Unit Tests ━━━${NC}"

    cd "$PROJECT_DIR"

    # Create .env.local if it doesn't exist
    if [ ! -f "supabase/functions/tests/.env.local" ]; then
        echo -e "${YELLOW}Creating .env.local from .env...${NC}"
        cat > supabase/functions/tests/.env.local << EOF
SUPABASE_URL=https://xnwqrgumstikdmsxtame.supabase.co
SUPABASE_ANON_KEY=$(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d '=' -f2 | tr -d '"')
EOF
    fi

    deno test \
        --allow-net \
        --allow-env \
        --allow-read \
        supabase/functions/tests/stripe-functions.test.ts
}

# Run webhook tests with Stripe CLI
run_webhook_tests() {
    echo ""
    echo -e "${BLUE}━━━ Running Webhook Tests with Stripe CLI ━━━${NC}"

    if ! command -v stripe &> /dev/null; then
        echo -e "${YELLOW}Skipping: Stripe CLI not installed${NC}"
        return
    fi

    # Check if logged in to Stripe
    if ! stripe config --list &> /dev/null; then
        echo -e "${YELLOW}Please login to Stripe CLI first: stripe login${NC}"
        return
    fi

    echo -e "${YELLOW}Testing webhook events...${NC}"

    WEBHOOK_URL="https://xnwqrgumstikdmsxtame.supabase.co/functions/v1/stripe-webhook"

    # Test various webhook events
    events=(
        "customer.subscription.created"
        "customer.subscription.updated"
        "invoice.payment_succeeded"
        "invoice.payment_failed"
        "customer.subscription.deleted"
    )

    for event in "${events[@]}"; do
        echo -e "${YELLOW}Triggering: $event${NC}"
        stripe trigger "$event" --override "customer:email=test@sortavo.com" 2>&1 | head -5
        echo ""
    done
}

# Print test summary
print_summary() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Test Suite Complete${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review any failed tests above"
    echo "  2. Check Stripe Dashboard for webhook logs"
    echo "  3. Check Supabase Edge Function logs"
    echo ""
    echo "Dashboard URLs:"
    echo "  Stripe: https://dashboard.stripe.com/test/webhooks"
    echo "  Supabase: https://supabase.com/dashboard/project/xnwqrgumstikdmsxtame/functions"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Main
case "${1:-}" in
    --unit)
        check_requirements
        run_unit_tests
        ;;
    --webhook)
        check_requirements --webhook
        run_webhook_tests
        ;;
    --all)
        check_requirements --all
        run_unit_tests
        run_webhook_tests
        ;;
    *)
        check_requirements
        run_unit_tests
        ;;
esac

print_summary
