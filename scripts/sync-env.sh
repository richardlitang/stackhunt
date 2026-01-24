#!/bin/bash
# ============================================================================
# Environment Variable Sync Script
# ============================================================================
#
# Syncs environment variables between Vercel, GitHub, and local .env files.
#
# Usage:
#   ./scripts/sync-env.sh pull     # Pull from Vercel to local .env
#   ./scripts/sync-env.sh push     # Push local .env to Vercel
#   ./scripts/sync-env.sh status   # Show what's configured where
#
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Required env vars for the queue worker
REQUIRED_VARS=(
    "SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "GEMINI_API_KEY"
    "SERPER_API_KEY"
)

# Optional env vars
OPTIONAL_VARS=(
    "DISCORD_WEBHOOK_URL"
    "QUEUE_WEBHOOK_SECRET"
)

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

check_var() {
    local var_name=$1
    local source=$2

    case $source in
        "local")
            if [ -f "$PROJECT_DIR/.env" ]; then
                value=$(grep "^${var_name}=" "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
                if [ -n "$value" ] && [ "$value" != "" ]; then
                    echo -e "  ${GREEN}✓${NC} $var_name"
                    return 0
                fi
            fi
            echo -e "  ${RED}✗${NC} $var_name"
            return 1
            ;;
        "github")
            if gh secret list 2>/dev/null | grep -q "^${var_name}"; then
                echo -e "  ${GREEN}✓${NC} $var_name"
                return 0
            fi
            echo -e "  ${RED}✗${NC} $var_name"
            return 1
            ;;
        "vercel")
            if vercel env ls 2>/dev/null | grep -q "^${var_name}"; then
                echo -e "  ${GREEN}✓${NC} $var_name"
                return 0
            fi
            echo -e "  ${RED}✗${NC} $var_name"
            return 1
            ;;
    esac
}

show_status() {
    print_header "Environment Variable Status"

    echo -e "${YELLOW}Required Variables:${NC}"
    echo ""

    printf "%-30s %-10s %-10s %-10s\n" "Variable" "Local" "GitHub" "Vercel"
    printf "%-30s %-10s %-10s %-10s\n" "--------" "-----" "------" "------"

    for var in "${REQUIRED_VARS[@]}"; do
        local_status="${RED}✗${NC}"
        github_status="${RED}✗${NC}"
        vercel_status="${RED}✗${NC}"

        # Check local
        if [ -f "$PROJECT_DIR/.env" ]; then
            value=$(grep "^${var}=" "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
            if [ -n "$value" ] && [ "$value" != "" ]; then
                local_status="${GREEN}✓${NC}"
            fi
        fi

        # Check GitHub
        if command -v gh &> /dev/null && gh secret list 2>/dev/null | grep -q "^${var}"; then
            github_status="${GREEN}✓${NC}"
        fi

        # Check Vercel
        if command -v vercel &> /dev/null && vercel env ls 2>/dev/null | grep -q "${var}"; then
            vercel_status="${GREEN}✓${NC}"
        fi

        printf "%-30s %-10b %-10b %-10b\n" "$var" "$local_status" "$github_status" "$vercel_status"
    done

    echo ""
    echo -e "${YELLOW}Optional Variables:${NC}"
    echo ""

    for var in "${OPTIONAL_VARS[@]}"; do
        local_status="${YELLOW}-${NC}"

        if [ -f "$PROJECT_DIR/.env" ]; then
            value=$(grep "^${var}=" "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
            if [ -n "$value" ] && [ "$value" != "" ]; then
                local_status="${GREEN}✓${NC}"
            fi
        fi

        printf "%-30s %-10b\n" "$var" "$local_status"
    done

    echo ""
}

pull_from_vercel() {
    print_header "Pulling from Vercel"

    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}Error: Vercel CLI not installed${NC}"
        echo "Install with: npm i -g vercel"
        exit 1
    fi

    # Check if linked
    if [ ! -d "$PROJECT_DIR/.vercel" ]; then
        echo "Linking to Vercel project..."
        cd "$PROJECT_DIR" && vercel link --yes
    fi

    # Pull env vars
    echo "Pulling environment variables..."
    cd "$PROJECT_DIR" && vercel env pull .env.vercel --yes

    # Merge with existing .env (keep local values that aren't in Vercel)
    if [ -f "$PROJECT_DIR/.env" ]; then
        echo "Merging with existing .env..."
        # Create temp file with Vercel vars
        grep -v "^#" .env.vercel | grep "=" > .env.vercel.clean 2>/dev/null || true

        # Add local vars that aren't in Vercel
        while IFS= read -r line; do
            var_name=$(echo "$line" | cut -d'=' -f1)
            if ! grep -q "^${var_name}=" .env.vercel.clean 2>/dev/null; then
                echo "$line" >> .env.vercel.clean
            fi
        done < <(grep -v "^#" "$PROJECT_DIR/.env" | grep "=")

        # Copy merged file
        mv .env.vercel.clean "$PROJECT_DIR/.env"
        rm -f .env.vercel
    else
        mv .env.vercel "$PROJECT_DIR/.env"
    fi

    echo -e "${GREEN}Done!${NC}"
}

push_to_vercel() {
    print_header "Pushing to Vercel"

    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}Error: Vercel CLI not installed${NC}"
        exit 1
    fi

    if [ ! -f "$PROJECT_DIR/.env" ]; then
        echo -e "${RED}Error: No .env file found${NC}"
        exit 1
    fi

    echo "This will push the following variables to Vercel:"
    echo ""

    # Show what will be pushed
    for var in "${REQUIRED_VARS[@]}" "${OPTIONAL_VARS[@]}"; do
        value=$(grep "^${var}=" "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
        if [ -n "$value" ] && [ "$value" != "" ]; then
            echo "  - $var"
        fi
    done

    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi

    # Push each var
    for var in "${REQUIRED_VARS[@]}" "${OPTIONAL_VARS[@]}"; do
        value=$(grep "^${var}=" "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
        if [ -n "$value" ] && [ "$value" != "" ]; then
            echo "  Setting $var..."
            echo "$value" | vercel env add "$var" production --yes 2>/dev/null || true
            echo "$value" | vercel env add "$var" preview --yes 2>/dev/null || true
            echo "$value" | vercel env add "$var" development --yes 2>/dev/null || true
        fi
    done

    echo -e "${GREEN}Done!${NC}"
}

# Main
case "${1:-status}" in
    pull)
        pull_from_vercel
        ;;
    push)
        push_to_vercel
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {pull|push|status}"
        echo ""
        echo "Commands:"
        echo "  pull    Pull env vars from Vercel"
        echo "  push    Push local .env to Vercel"
        echo "  status  Show what's configured where"
        exit 1
        ;;
esac
