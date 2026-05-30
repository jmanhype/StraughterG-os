#!/bin/bash

# Research API setup script for StraughterG OS

echo "🔍 Setting up web search for StraughterG OS..."
echo ""
echo "DuckDuckGo scraping is being blocked. Switching to Brave Search API."
echo ""
echo "📝 To get a FREE Brave Search API key (2,000 queries/month):"
echo "   1. Go to: https://api.search.brave.com/register"
echo "   2. Sign up for free account"
echo "   3. Create a new API key"
echo "   4. Copy the key and run:"
echo ""
echo "   echo 'BRAVE_API_KEY=your_key_here' >> .env.local"
echo ""
echo "After adding the key, restart the dev server with: npm run dev"
echo ""
echo "Opening Brave Search registration page..."
open https://api.search.brave.com/register
