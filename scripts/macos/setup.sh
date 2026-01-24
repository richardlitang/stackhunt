#!/bin/bash
# ============================================================================
# StackHunt Queue Worker - macOS Setup Script
# ============================================================================
#
# This script sets up the queue worker as a macOS LaunchAgent that:
# - Starts automatically when you log in
# - Runs continuously in the background
# - Restarts if it crashes
# - Logs output to ~/.stackhunt/logs/
# - (Optional) Adds a menu bar status icon via SwiftBar
#
# Usage:
#   ./scripts/macos/setup.sh install    # Install and start the worker
#   ./scripts/macos/setup.sh uninstall  # Stop and remove the worker
#   ./scripts/macos/setup.sh status     # Check if worker is running
#   ./scripts/macos/setup.sh logs       # View recent logs
#   ./scripts/macos/setup.sh restart    # Restart the worker
#   ./scripts/macos/setup.sh menubar    # Install menu bar status icon
#
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLIST_NAME="com.stackhunt.queue-worker"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
LOG_DIR="$HOME/.stackhunt/logs"
SWIFTBAR_PLUGIN="$SCRIPT_DIR/stackhunt.5m.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[StackHunt]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[StackHunt]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[StackHunt]${NC} $1"
}

print_error() {
    echo -e "${RED}[StackHunt]${NC} $1"
}

check_requirements() {
    print_status "Checking requirements..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Install it with: brew install node"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Install it with: brew install node"
        exit 1
    fi

    # Check .env file
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        print_error ".env file not found. Copy .env.example to .env and fill in your values."
        exit 1
    fi

    # Check required env vars
    source "$PROJECT_DIR/.env" 2>/dev/null || true
    if [ -z "$SUPABASE_URL" ] || [ -z "$GEMINI_API_KEY" ]; then
        print_warning ".env file may be missing required variables (SUPABASE_URL, GEMINI_API_KEY, etc.)"
    fi

    print_success "Requirements OK"
}

install_worker() {
    print_status "Installing StackHunt Queue Worker..."

    check_requirements

    # Create logs directory
    mkdir -p "$LOG_DIR"

    # Create LaunchAgents directory if needed
    mkdir -p "$HOME/Library/LaunchAgents"

    # Generate plist with correct paths
    print_status "Generating LaunchAgent configuration..."
    sed -e "s|__WORKING_DIR__|$PROJECT_DIR|g" -e "s|__HOME__|$HOME|g" "$PLIST_SRC" > "$PLIST_DEST"

    # Install npm dependencies if needed
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        print_status "Installing npm dependencies..."
        cd "$PROJECT_DIR" && npm install
    fi

    # Unload if already loaded
    launchctl unload "$PLIST_DEST" 2>/dev/null || true

    # Load the agent
    print_status "Starting worker..."
    launchctl load "$PLIST_DEST"

    print_success "Queue Worker installed and running!"
    echo ""
    echo "  Status:   launchctl list | grep stackhunt"
    echo "  Logs:     tail -f $LOG_DIR/queue-worker.log"
    echo "  Stop:     ./scripts/macos/setup.sh uninstall"
    echo ""
}

uninstall_worker() {
    print_status "Uninstalling StackHunt Queue Worker..."

    if [ -f "$PLIST_DEST" ]; then
        launchctl unload "$PLIST_DEST" 2>/dev/null || true
        rm "$PLIST_DEST"
        print_success "Worker stopped and removed"
    else
        print_warning "Worker was not installed"
    fi
}

show_status() {
    echo ""
    echo "=== StackHunt Queue Worker Status ==="
    echo ""

    if launchctl list | grep -q "$PLIST_NAME"; then
        print_success "Worker is RUNNING"
        echo ""
        launchctl list | grep "$PLIST_NAME"
    else
        print_warning "Worker is NOT running"
    fi

    echo ""
    echo "=== Recent Logs ==="
    if [ -f "$LOG_DIR/queue-worker.log" ]; then
        tail -20 "$LOG_DIR/queue-worker.log" 2>/dev/null || echo "No logs yet"
    else
        echo "No logs yet"
    fi
    echo ""
}

show_logs() {
    if [ -f "$LOG_DIR/queue-worker.log" ]; then
        tail -f "$LOG_DIR/queue-worker.log"
    else
        print_warning "No logs yet. The worker may not have run."
    fi
}

restart_worker() {
    print_status "Restarting worker..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
    sleep 1
    launchctl load "$PLIST_DEST"
    print_success "Worker restarted"
}

install_menubar() {
    print_status "Setting up menu bar status icon..."

    # Save config with project directory
    mkdir -p "$HOME/.stackhunt"
    echo "PROJECT_DIR=$PROJECT_DIR" > "$HOME/.stackhunt/config"
    print_status "Saved config to ~/.stackhunt/config"

    # Check if SwiftBar is installed
    if [ -d "/Applications/SwiftBar.app" ]; then
        print_success "SwiftBar found"
    elif command -v brew &> /dev/null; then
        print_status "Installing SwiftBar via Homebrew..."
        brew install --cask swiftbar
    else
        print_error "SwiftBar not found. Install it with:"
        echo ""
        echo "  brew install --cask swiftbar"
        echo ""
        echo "Or download from: https://github.com/swiftbar/SwiftBar/releases"
        echo ""
        echo "After installing SwiftBar, run this command again."
        exit 1
    fi

    # Find or create SwiftBar plugins directory
    SWIFTBAR_DIR="$HOME/Library/Application Support/SwiftBar/Plugins"
    if [ ! -d "$SWIFTBAR_DIR" ]; then
        # Check common alternative locations
        if [ -d "$HOME/.config/swiftbar" ]; then
            SWIFTBAR_DIR="$HOME/.config/swiftbar"
        else
            mkdir -p "$SWIFTBAR_DIR"
            print_status "Created SwiftBar plugins directory"
        fi
    fi

    # Copy the plugin
    cp "$SWIFTBAR_PLUGIN" "$SWIFTBAR_DIR/"
    chmod +x "$SWIFTBAR_DIR/stackhunt.5m.sh"
    print_success "Menu bar plugin installed to: $SWIFTBAR_DIR"

    # Configure SwiftBar to use this plugins directory
    defaults write com.ameba.SwiftBar PluginDirectory "$SWIFTBAR_DIR"
    print_status "Configured SwiftBar plugins directory"

    # Check if SwiftBar is running
    if ! pgrep -x "SwiftBar" > /dev/null; then
        print_status "Starting SwiftBar..."
        open /Applications/SwiftBar.app 2>/dev/null || open -a SwiftBar 2>/dev/null || true
        sleep 3
    fi

    # Tell SwiftBar to refresh
    if pgrep -x "SwiftBar" > /dev/null; then
        # Trigger a refresh by touching the plugin file
        touch "$SWIFTBAR_DIR/stackhunt.5m.sh"
        print_success "SwiftBar refreshed"
    fi

    print_success "Menu bar icon installed!"
    echo ""
    echo "  Plugin installed to: $SWIFTBAR_DIR/stackhunt.5m.sh"
    echo ""
    echo "  If this is your first time using SwiftBar:"
    echo "    1. SwiftBar will ask you to select a plugins folder"
    echo "    2. Navigate to: ~/Library/Application Support/SwiftBar/Plugins"
    echo "       (Press Cmd+Shift+G and paste the path)"
    echo "    3. Click 'Open'"
    echo ""
    echo "  You should then see a ⚡ icon in your menu bar."
    echo "  Click it to see worker status and quick actions."
    echo ""
    echo "  Icon colors: Green = Running, Red = Crashed, Orange = Stopped"
    echo ""
    echo "  To start SwiftBar at login:"
    echo "    System Settings > General > Login Items > Add SwiftBar"
    echo ""
}

uninstall_menubar() {
    print_status "Removing menu bar icon..."

    SWIFTBAR_DIR="$HOME/Library/Application Support/SwiftBar/Plugins"
    if [ -f "$SWIFTBAR_DIR/stackhunt.5m.sh" ]; then
        rm "$SWIFTBAR_DIR/stackhunt.5m.sh"
        print_success "Menu bar plugin removed"
    else
        print_warning "Menu bar plugin was not installed"
    fi
}

# Main
case "${1:-}" in
    install)
        install_worker
        ;;
    uninstall)
        uninstall_worker
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    restart)
        restart_worker
        ;;
    menubar)
        install_menubar
        ;;
    menubar-uninstall)
        uninstall_menubar
        ;;
    full)
        # Full install: worker + menu bar
        install_worker
        echo ""
        install_menubar
        ;;
    *)
        echo "Usage: $0 {install|uninstall|status|logs|restart|menubar|full}"
        echo ""
        echo "Commands:"
        echo "  install           Install and start the queue worker"
        echo "  uninstall         Stop and remove the queue worker"
        echo "  status            Show current status and recent logs"
        echo "  logs              Follow the log output (Ctrl+C to stop)"
        echo "  restart           Restart the worker"
        echo "  menubar           Install menu bar status icon (requires SwiftBar)"
        echo "  menubar-uninstall Remove menu bar status icon"
        echo "  full              Install worker + menu bar icon"
        exit 1
        ;;
esac
