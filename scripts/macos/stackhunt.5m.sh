#!/bin/bash
# <bitbar.title>StackHunt Queue Worker</bitbar.title>
# <bitbar.version>v1.0</bitbar.version>
# <bitbar.author>StackHunt</bitbar.author>
# <bitbar.desc>Monitor and control the StackHunt queue worker</bitbar.desc>
# <swiftbar.hideAbout>true</swiftbar.hideAbout>
# <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>
# <swiftbar.hideLastUpdated>false</swiftbar.hideLastUpdated>
# <swiftbar.hideDisablePlugin>true</swiftbar.hideDisablePlugin>
# <swiftbar.hideSwiftBar>true</swiftbar.hideSwiftBar>

# ============================================================================
# StackHunt Menu Bar Plugin for SwiftBar
# ============================================================================
# Shows worker status in the menu bar with quick actions.
# Refreshes every 5 minutes (configurable via filename: stackhunt.5m.sh)
#
# Install SwiftBar: brew install --cask swiftbar
# Copy this file to your SwiftBar plugins folder
# ============================================================================

PLIST_NAME="com.stackhunt.queue-worker"
LOG_FILE="$HOME/.stackhunt/logs/queue-worker.log"
PLIST_FILE="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
CONFIG_FILE="$HOME/.stackhunt/config"

# Get project directory from config or plist
get_project_dir() {
    # First check config file
    if [ -f "$CONFIG_FILE" ]; then
        PROJECT=$(grep "^PROJECT_DIR=" "$CONFIG_FILE" 2>/dev/null | cut -d'=' -f2-)
        if [ -n "$PROJECT" ] && [ -d "$PROJECT" ]; then
            echo "$PROJECT"
            return
        fi
    fi
    # Fall back to parsing plist
    if [ -f "$PLIST_FILE" ]; then
        PROJECT=$(grep -A1 "WorkingDirectory" "$PLIST_FILE" 2>/dev/null | tail -1 | sed 's/.*<string>\(.*\)<\/string>.*/\1/')
        if [ -n "$PROJECT" ] && [ -d "$PROJECT" ]; then
            echo "$PROJECT"
            return
        fi
    fi
    echo ""
}

PROJECT_DIR=$(get_project_dir)

# Get worker status
get_status() {
    if ! [ -f "$PLIST_FILE" ]; then
        echo "not_installed"
        return
    fi

    STATUS_LINE=$(launchctl list 2>/dev/null | grep "$PLIST_NAME")
    if [ -z "$STATUS_LINE" ]; then
        echo "stopped"
        return
    fi

    PID=$(echo "$STATUS_LINE" | awk '{print $1}')
    if [ "$PID" != "-" ]; then
        echo "running"
    else
        echo "crashed"
    fi
}

STATUS=$(get_status)

# Menu bar icon based on status
case $STATUS in
    running)
        echo "⚡| sfcolor=systemGreen"
        ;;
    crashed)
        echo "⚡| sfcolor=systemRed"
        ;;
    stopped)
        echo "⚡| sfcolor=systemOrange"
        ;;
    *)
        echo "⚡| sfcolor=systemGray"
        ;;
esac

echo "---"

# Header
echo "StackHunt Queue Worker | size=14 font=SF Pro"
echo "---"

# Status details
case $STATUS in
    running)
        PID=$(launchctl list | grep "$PLIST_NAME" | awk '{print $1}')
        echo "✅ Running | color=systemGreen sfimage=checkmark.circle.fill"
        echo "   PID: $PID | size=11 color=systemGray"
        ;;
    crashed)
        EXIT_CODE=$(launchctl list | grep "$PLIST_NAME" | awk '{print $2}')
        echo "❌ Crashed | color=systemRed sfimage=xmark.circle.fill"
        echo "   Exit code: $EXIT_CODE | size=11 color=systemGray"
        ;;
    stopped)
        echo "⏸️ Stopped | color=systemOrange sfimage=pause.circle.fill"
        ;;
    *)
        echo "⚪ Not Installed | color=systemGray sfimage=questionmark.circle"
        ;;
esac

echo "---"

# Last activity from logs
if [ -f "$LOG_FILE" ]; then
    # Last run timestamp
    LAST_RUN=$(grep "Queue Worker -" "$LOG_FILE" 2>/dev/null | tail -1 | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' | head -1)
    if [ -n "$LAST_RUN" ]; then
        # Convert to readable format
        READABLE_DATE=$(echo "$LAST_RUN" | sed 's/T/ at /')
        echo "📅 Last run: $READABLE_DATE | size=12"
    fi

    # Last result summary
    LAST_RESULT=$(grep "Results:" "$LOG_FILE" 2>/dev/null | tail -1 | sed 's/.*Results: //')
    if [ -n "$LAST_RESULT" ]; then
        echo "📊 $LAST_RESULT | size=12"
    fi

    # Next run (if running continuously)
    if [ "$STATUS" = "running" ]; then
        echo "⏰ Next run: ~6h interval | size=11 color=systemGray"
    fi
else
    echo "📋 No logs yet | size=12 color=systemGray"
fi

echo "---"

# Quick Actions
echo "Actions | sfimage=gear"

if [ "$STATUS" = "running" ]; then
    echo "--🔄 Restart Worker | bash=/bin/bash param1=-c param2='launchctl kickstart -k gui/$(id -u)/$PLIST_NAME 2>/dev/null || (launchctl unload \"$PLIST_FILE\" 2>/dev/null; launchctl load \"$PLIST_FILE\")' terminal=false refresh=true"
    echo "--⏹️ Stop Worker | bash=/bin/launchctl param1=unload param2=$PLIST_FILE terminal=false refresh=true"
else
    echo "--▶️ Start Worker | bash=/bin/launchctl param1=load param2=$PLIST_FILE terminal=false refresh=true"
fi

if [ -n "$PROJECT_DIR" ]; then
    echo "--🏃 Run Once Now | bash=/bin/bash param1=-c param2='cd \"$PROJECT_DIR\" && npm run queue:worker -- --once' terminal=true"
fi

echo "---"

# Logs
echo "Logs | sfimage=doc.text"
echo "--📋 View Recent (100 lines) | bash=/usr/bin/tail param1=-100 param2=$LOG_FILE terminal=true"
echo "--📋 Follow Live | bash=/usr/bin/tail param1=-f param2=$LOG_FILE terminal=true"
echo "--📂 Open Logs Folder | bash=/usr/bin/open param1=$(dirname $LOG_FILE) terminal=false"

echo "---"

# Configuration
echo "Settings | sfimage=slider.horizontal.3"
if [ -n "$PROJECT_DIR" ]; then
    echo "--📁 Open Project Folder | bash=/usr/bin/open param1=$PROJECT_DIR terminal=false"
fi
echo "--⚙️ Edit LaunchAgent | bash=/usr/bin/open param1=-a param2=TextEdit param3=$PLIST_FILE terminal=false"

echo "---"
echo "Refresh | refresh=true sfimage=arrow.clockwise"
