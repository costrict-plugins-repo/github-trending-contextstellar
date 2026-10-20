#!/usr/bin/env bash
# ContextStellar — PreToolUse hook
# Scores the prompt before tool execution and injects feedback into Claude's context.
#
# Two modes:
#   Cloud mode (CONTEXTSTELLAR_API_KEY set) — scores via API, feeds RLM flywheel
#   Local mode (no API key) — scores locally via bundled scorer.js, zero config needed
#
# Reads hook input as JSON from stdin.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Read hook input from stdin
INPUT=$(cat)

# ── Cloud mode: use the ContextStellar API ──
if [ -n "${CONTEXTSTELLAR_API_KEY:-}" ]; then
  BASE_URL="${CONTEXTSTELLAR_BASE_URL:-https://contextstellar.com}"

  TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
  TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}')
  SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
  TOOL_USE_ID=$(echo "$INPUT" | jq -r '.tool_use_id // empty' 2>/dev/null || echo "")

  PAYLOAD=$(jq -n \
    --arg sessionId "$SESSION_ID" \
    --arg type "PreToolUse" \
    --arg toolName "$TOOL_NAME" \
    --arg toolUseId "$TOOL_USE_ID" \
    --argjson toolInput "$TOOL_INPUT" \
    '{
      sessionId: $sessionId,
      type: $type,
      toolName: $toolName,
      toolUseId: $toolUseId,
      toolInput: $toolInput
    }')

  RESPONSE=$(curl -s --max-time 4 \
    -X POST "${BASE_URL}/api/v1/hooks/claude-code" \
    -H "Authorization: ${CONTEXTSTELLAR_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" 2>/dev/null || echo '{}')

  DECISION=$(echo "$RESPONSE" | jq -r '.decision // "allow"')
  CONTEXT=$(echo "$RESPONSE" | jq -r '.additionalContext // empty' 2>/dev/null || echo "")

  if [ -n "$CONTEXT" ]; then
    jq -n \
      --arg decision "$DECISION" \
      --arg additionalContext "$CONTEXT" \
      '{ decision: $decision, additionalContext: $additionalContext }'
  fi
  exit 0
fi

# ── Local mode: score locally with bundled scorer.js ──
if command -v node >/dev/null 2>&1; then
  echo "$INPUT" | node "${SCRIPT_DIR}/scorer.js"
fi
