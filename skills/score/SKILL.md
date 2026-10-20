---
name: score
description: Score a prompt for context engineering quality. Use when the user asks to score, analyze, or optimize a prompt, or when reviewing prompt quality before sending to an LLM.
---

# Score Prompt

Score the provided prompt text for context engineering quality using the ContextStellar scoring API.

## What to do

1. Take the prompt text from `$ARGUMENTS`. If no arguments provided, ask the user to paste or describe the prompt they want scored.

2. Call the ContextStellar hooks endpoint to score the prompt:

```bash
curl -s -X POST "${CONTEXTSTELLAR_BASE_URL:-https://contextstellar.com}/api/v1/hooks/claude-code" \
  -H "Authorization: ${CONTEXTSTELLAR_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"manual-score-$(date +%s)\",
    \"type\": \"PreToolUse\",
    \"toolName\": \"ManualScore\",
    \"toolInput\": { \"content\": $(echo "$PROMPT_TEXT" | jq -Rs .) }
  }"
```

3. Present the results clearly:
   - **Overall Score** and **Grade** (A+ through F)
   - **Dimension Breakdown** — show each of the 5 dimensions with their individual scores
   - **Tips** — list the actionable optimization suggestions
   - **Token Count** and potential **Token Savings**

4. If the score is below B (< 70), proactively suggest specific improvements the user can make.

## Scoring Dimensions

| Dimension | What It Measures |
|-----------|-----------------|
| Token Utilization (25%) | Waste: politeness, filler, intensifiers, redundancy |
| Structural Clarity (23%) | XML tags, lists, headers, code blocks, imperative keywords |
| Specificity (20%) | Numbers, format keywords, role assignment, examples, constraints |
| Content Density (17%) | Lexical diversity, n-gram repetition |
| Cache-Friendliness (15%) | Timestamps, UUIDs, date refs, volatile data positioning |

## Grade Scale

- **A+** (90+): Excellent — production-ready prompt
- **A** (80-89): Great — minor optimizations possible
- **B** (70-79): Good — some waste patterns detected
- **C** (60-69): Fair — significant optimization opportunity
- **D** (50-59): Poor — major restructuring recommended
- **F** (<50): Failing — fundamental issues
