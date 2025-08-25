#!/bin/bash

# Fantdev Trading Bot - Cloudflare Integration Setup Script
# This script helps set up the complete integration between Cloudflare Worker and Admin Server

set -e

echo "🚀 Fantdev Trading Bot - Integration Setup"
echo "=========================================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your actual values."
fi

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun runtime not found. Please install it first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Check if wrangler is available
if ! command -v bunx &> /dev/null || ! bunx --package wrangler wrangler --version &> /dev/null; then
    echo "⚠️  Wrangler not found. Installing..."
    bun add -D wrangler@latest
fi

echo ""
echo "📋 Available Setup Commands:"
echo ""
echo "1. Install Dependencies:"
echo "   bun install"
echo ""
echo "2. Create Cloudflare KV Namespace:"
echo "   bun run worker:kv:create"
echo "   (Update wrangler.toml with the returned namespace ID)"
echo ""
echo "3. Set Cloudflare Secrets:"
echo "   bunx --package wrangler wrangler secret put BOT_TOKEN"
echo "   bunx --package wrangler wrangler secret put WEBHOOK_SECRET"
echo ""
echo "4. Test Worker Locally:"
echo "   bun run worker:dev"
echo ""
echo "5. Deploy Worker to Cloudflare:"
echo "   bun run worker:deploy"
echo ""
echo "6. Start Admin Server (in another terminal):"
echo "   python3 websocket_admin_server.py"
echo ""
echo "7. Test Full Integration:"
echo "   bun run dev:all"
echo ""
echo "🔧 Manual Configuration Required:"
echo ""
echo "1. Edit .env file with your actual values:"
echo "   - BOT_TOKEN (from @BotFather)"
echo "   - ADMIN_CHAT_ID (your admin chat ID)"
echo "   - WEBHOOK_SECRET (generate a secure secret)"
echo ""
echo "2. Update wrangler.toml after creating KV namespace:"
echo "   - Replace YOUR_KV_NAMESPACE_ID with actual ID"
echo "   - Replace YOUR_KV_PREVIEW_ID with actual preview ID"
echo ""
echo "3. Set Telegram webhook (after deploying worker):"
echo "   curl -X POST \"https://api.telegram.org/bot\$BOT_TOKEN/setWebhook\" \\"
echo "        -H \"Content-Type: application/json\" \\"
echo "        -d '{\"url\": \"https://your-worker.workers.dev/webhook\", \"secret_token\": \"your-webhook-secret\"}'"
echo ""

# Ask user what they want to do
read -p "What would you like to do? (1-7, or 'q' to quit): " choice

case $choice in
    1)
        echo "📦 Installing dependencies..."
        bun install
        echo "✅ Dependencies installed!"
        ;;
    2)
        echo "🗄️  Creating KV namespace..."
        bun run worker:kv:create
        echo ""
        echo "📝 Please update wrangler.toml with the namespace IDs above"
        ;;
    3)
        echo "🔑 Setting up secrets..."
        echo "Enter your Telegram Bot Token:"
        bunx --package wrangler wrangler secret put BOT_TOKEN
        echo "Enter your webhook secret (generate a secure random string):"
        bunx --package wrangler wrangler secret put WEBHOOK_SECRET
        ;;
    4)
        echo "🧪 Starting Worker in development mode..."
        bun run worker:dev
        ;;
    5)
        echo "🚀 Deploying Worker to Cloudflare..."
        bun run worker:deploy
        ;;
    6)
        echo "🖥️  Starting Admin Server..."
        python3 websocket_admin_server.py
        ;;
    7)
        echo "🚀 Starting full development environment..."
        bun run dev:all
        ;;
    q)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "✅ Done! Check the output above for any next steps."
echo ""
echo "📚 For more help, check:"
echo "   - README.md"
echo "   - CLAUDE.md"
echo "   - .env.example"