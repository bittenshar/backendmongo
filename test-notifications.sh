#!/bin/bash

# 📱 NOTIFICATION TESTING SCRIPT
# This script helps you test notifications on your device

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║         📱 NOTIFICATION TESTING ASSISTANT                          ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

USER_ID="693ea01e54d3374df909ec22"
SERVER_URL="http://localhost:3000"

echo "📌 Configuration:"
echo "   User ID: $USER_ID"
echo "   Server: $SERVER_URL"
echo ""

# Function to test connection
test_server() {
    echo "🔍 Testing server connection..."
    if timeout 3 bash -c "</dev/tcp/localhost/3000" 2>/dev/null; then
        echo "✅ Server is running on port 3000"
        return 0
    else
        echo "❌ Server is NOT running on port 3000"
        echo "   Start with: npm start"
        return 1
    fi
}

# Function to check tokens
check_tokens() {
    echo ""
    echo "🔑 Checking registered tokens for user..."
    curl -s "$SERVER_URL/api/notification/tokens/$USER_ID" | jq '.' 2>/dev/null || {
        echo "❌ Failed to retrieve tokens. Make sure server is running."
    }
}

# Function to send test notification
send_test() {
    echo ""
    echo "📤 Sending single test notification..."
    curl -s -X POST "$SERVER_URL/api/notification/test" \
        -H "Content-Type: application/json" \
        -d "{\"userId\": \"$USER_ID\"}" | jq '.'
}

# Function to send all notifications
send_all() {
    echo ""
    echo "📤 Sending ALL 19 notifications..."
    echo "⏳ This will take about 10 seconds..."
    echo ""
    
    curl -s -X POST "$SERVER_URL/api/notification/test-all" \
        -H "Content-Type: application/json" \
        -d "{\"userId\": \"$USER_ID\"}" | jq '.summary'
    
    echo ""
    echo "📱 Check your phone for all notifications!"
}

# Function to show menu
show_menu() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                    WHAT DO YOU WANT TO DO?                         ║"
    echo "╠════════════════════════════════════════════════════════════════════╣"
    echo "║  1️⃣  Check registered tokens                                       ║"
    echo "║  2️⃣  Send single test notification                               ║"
    echo "║  3️⃣  Send ALL 19 notifications                                   ║"
    echo "║  4️⃣  Show setup instructions                                     ║"
    echo "║  5️⃣  Exit                                                         ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
}

# Function to show setup instructions
show_setup() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                    ⚙️  SETUP INSTRUCTIONS                          ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "YOUR APP NEEDS TO:"
    echo ""
    echo "1️⃣  INITIALIZE FIREBASE"
    echo "   - Install Firebase SDK"
    echo "   - Initialize on app startup"
    echo "   - Request notification permission"
    echo ""
    echo "2️⃣  GET FCM TOKEN"
    echo "   - Call messaging().getToken()"
    echo "   - You'll get a token like: eZUttMITQ1aqQGCR9fYgrT:APA91..."
    echo ""
    echo "3️⃣  REGISTER TOKEN"
    echo "   - POST /api/notification/register-token"
    echo "   - Send: { token, deviceType, deviceId }"
    echo ""
    echo "4️⃣  LISTEN FOR NOTIFICATIONS"
    echo "   - Foreground: messaging().onMessage()"
    echo "   - Background: messaging().setBackgroundMessageHandler()"
    echo ""
    echo "📖 Full guide: See FCM_SETUP_GUIDE.js"
    echo ""
}

# Main loop
test_server || exit 1

while true; do
    show_menu
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1) check_tokens ;;
        2) send_test ;;
        3) send_all ;;
        4) show_setup ;;
        5) echo "👋 Goodbye!"; exit 0 ;;
        *) echo "❌ Invalid choice. Please try again." ;;
    esac
done
