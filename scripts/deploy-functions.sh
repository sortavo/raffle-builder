#!/bin/bash
# Deploy Supabase Edge Functions
# Usage: ./scripts/deploy-functions.sh

set -e

PROJECT_REF="xnwqrgumstikdmsxtame"

echo "🚀 Deploying Supabase Edge Functions..."

# Check if logged in
if ! supabase functions list --project-ref "$PROJECT_REF" &>/dev/null; then
  echo "❌ Not logged in to Supabase. Run: supabase login"
  exit 1
fi

# Deploy all functions
echo "📦 Deploying all functions..."
supabase functions deploy --project-ref "$PROJECT_REF"

echo "✅ All functions deployed successfully!"
echo ""
echo "Deployed functions:"
supabase functions list --project-ref "$PROJECT_REF"
