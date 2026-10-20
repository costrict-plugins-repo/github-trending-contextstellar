#!/usr/bin/env bash
# ContextStellar — Stop hook
# Reports session-end metrics (total tokens, cost) for analytics.
# Reads hook input as JSON from stdin.

set -euo pipefail

# Skip if no API key configured
if [ -z "${CONTEXTSTELLAR_API_KEY:-}" ]; then
  exit 0
fi

BASE_URL="${CONTEXTSTELLAR_BASE_URL:-https://contextstellar.com}"

# Read hook input from stdin
INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
STOP_REASON=$(echo "$INPUT" | jq -r '.stop_reason // "user"')
TOTAL_TOKENS=$(echo "$INPUT" | jq -r '.total_tokens_used // 0' 2>/dev/null || echo "0")
TOTAL_COST=$(echo "$INPUT" | jq -r '.total_cost_usd // 0' 2>/dev/null || echo "0")

# Build the payload
PAYLOAD=$(jq -n \
  --arg sessionId "$SESSION_ID" \
  --arg type "Stop" \
  --arg stopReason "$STOP_REASON" \
  --argjson totalTokensUsed "$TOTAL_TOKENS" \
  --argjson totalCostUsd "$TOTAL_COST" \
  '{
    sessionId: $sessionId,
    type: $type,
    stopReason: $stopReason,
    totalTokensUsed: $totalTokensUsed,
    totalCostUsd: $totalCostUsd
  }')

# Send to ContextStellar API (fire-and-forget)
curl -s --max-time 4 \
  -X POST "${BASE_URL}/api/v1/hooks/claude-code" \
  -H "Authorization: ${CONTEXTSTELLAR_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" >/dev/null 2>&1 || true
