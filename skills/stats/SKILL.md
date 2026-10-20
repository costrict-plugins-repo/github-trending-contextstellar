---
name: stats
description: Show ContextStellar scoring statistics, RLM learning progress, and grade distribution for the current project. Use when the user asks about their scoring stats, prompt quality trends, or RLM weight learning.
---

# ContextStellar Stats

Show scoring statistics and RLM learning progress for the current project.

## What to do

1. Check that `CONTEXTSTELLAR_API_KEY` is set. If not, tell the user to run `/contextstellar:setup`.

2. Fetch the shell stats (lightweight summary):

```bash
curl -s "${CONTEXTSTELLAR_BASE_URL:-https://contextstellar.com}/api/v1/hooks/shell-stats" \
  -H "Authorization: ${CONTEXTSTELLAR_API_KEY}"
```

3. If the user wants detailed stats, also fetch the full stats:

```bash
curl -s "${CONTEXTSTELLAR_BASE_URL:-https://contextstellar.com}/api/v1/hooks/stats?projectId=${CONTEXTSTELLAR_PROJECT_ID}" \
  -H "Authorization: ${CONTEXTSTELLAR_API_KEY}"
```

4. Present the results:

**Quick Summary** (from shell-stats):
- Score: {score} ({grade}) {trend arrow}
- Success Rate: {successRate}%
- RLM Confidence: {rlmConfidence}% ({rlmSamples} samples)
- Total Events: {totalEvents}

**Detailed View** (from full stats, if requested):
- Event counts by type (PreToolUse, PostToolUse, Stop)
- Grade distribution (A+ through F with counts)
- Learned weights vs default weights (show deltas)
- Average latency

5. If RLM confidence is low (< 40%), suggest the user keep using Claude Code to accumulate more samples for better weight learning.

6. If the average score is below B, suggest running `/contextstellar:optimize` for improvement tips.
