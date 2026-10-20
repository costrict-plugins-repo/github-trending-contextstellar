---
name: optimize
description: Analyze recent prompt patterns and suggest optimizations. Use when the user wants to improve their prompting patterns, reduce token costs, or see what the RLM flywheel has learned about their project.
---

# Optimize Prompts

Analyze the user's recent scoring patterns and provide actionable optimization recommendations.

## What to do

1. Fetch the full stats to understand current scoring patterns:

```bash
curl -s "${CONTEXTSTELLAR_BASE_URL:-https://contextstellar.com}/api/v1/hooks/stats?projectId=${CONTEXTSTELLAR_PROJECT_ID}" \
  -H "Authorization: ${CONTEXTSTELLAR_API_KEY}"
```

2. Analyze the response and build a report:

**Grade Distribution Analysis**:
- If most grades are C/D/F: focus on structural clarity and specificity
- If most grades are B: focus on cache-friendliness and token utilization
- If most grades are A/A+: congratulate and show what's working

**RLM Learned Weights** (if available):
- Compare learned weights to defaults
- Highlight which dimensions the RLM has up-weighted (these matter most for this project)
- Highlight which dimensions were down-weighted (these matter less)

3. Provide specific recommendations based on the weakest dimensions:

**Token Utilization** (if low):
- Remove politeness phrases ("please", "could you", "I'd like you to")
- Cut filler words ("basically", "actually", "just", "really")
- Eliminate redundancy (saying the same thing twice)

**Structural Clarity** (if low):
- Add XML tags to delimit sections (`<context>`, `<instructions>`, `<output_format>`)
- Use numbered lists for multi-step instructions
- Add headers for long prompts

**Specificity** (if low):
- Add concrete numbers ("return top 5" not "return some")
- Specify output format explicitly ("respond in JSON with fields: ...")
- Include examples of expected output

**Content Density** (if low):
- Reduce repeated phrases
- Increase vocabulary diversity
- Remove n-gram repetition

**Cache-Friendliness** (if low):
- Move static content (system prompt, examples) before dynamic content (user message)
- Remove timestamps, dates, and UUIDs from the beginning of prompts
- Group volatile data at the end

4. If `$ARGUMENTS` contains a prompt, score it and show before/after with specific edits.

5. End with the user's trend direction and encourage continued improvement.
