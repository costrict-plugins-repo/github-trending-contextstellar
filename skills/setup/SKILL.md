---
name: setup
description: Set up ContextStellar cloud mode for RLM learning and dashboards. Use when the user wants to configure an API key, connect their project, or upgrade from local-only scoring.
disable-model-invocation: true
---

# ContextStellar Setup

The plugin works out of the box in **local mode** — scoring runs locally with zero config.

This command upgrades to **cloud mode** for RLM adaptive weight learning, team dashboards, and cross-session analytics.

## What to do

1. **Check current mode:**
   - If `CONTEXTSTELLAR_API_KEY` is set → already in cloud mode, test connectivity
   - If not set → explain that local mode is active and working, then offer cloud upgrade

2. **Explain the two modes:**
   - **Local mode** (current): Scoring runs on your machine via bundled scorer.js. Zero network calls. No signup needed.
   - **Cloud mode** (optional): Scores via API with learned weights. Enables RLM flywheel, `/contextstellar:stats`, `/contextstellar:optimize`, and the web dashboard.

3. **If the user wants cloud mode, guide them:**
   - Go to https://contextstellar.com/connect
   - Create a project (if they don't have one)
   - Generate an API key (starts with `cs_live_`)
   - Copy the Project ID

4. **Set environment variables.** Tell the user to add these to their shell profile or `.env`:

```bash
export CONTEXTSTELLAR_API_KEY="cs_live_your_key_here"
export CONTEXTSTELLAR_PROJECT_ID="your_project_id_here"
# Optional: custom instance URL (defaults to https://contextstellar.com)
# export CONTEXTSTELLAR_BASE_URL="https://your-instance.contextstellar.com"
```

5. **Verify connectivity:**

```bash
curl -s "${CONTEXTSTELLAR_BASE_URL:-https://contextstellar.com}/api/v1/hooks/shell-stats" \
  -H "Authorization: ${CONTEXTSTELLAR_API_KEY}"
```

If you get a JSON response with `score`, `grade`, etc., cloud mode is active.

6. **Confirm:** After setup, the user gets:
   - Automatic RLM weight learning (improves after ~100 events)
   - `/contextstellar:stats` — scoring dashboard in terminal
   - `/contextstellar:optimize` — pattern-based recommendations
   - Web dashboard at contextstellar.com/dashboard/mission-control
