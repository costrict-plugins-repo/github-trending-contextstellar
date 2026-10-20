# ContextStellar — Claude Code Plugin

Real-time prompt scoring and context engineering optimization for Claude Code.

Every tool use is automatically scored across 5 dimensions. **Works instantly with zero configuration** — no API key, no signup, no network required.

## Quick Start

```bash
# Install from marketplace
/plugin install contextstellar

# Or test locally
claude --plugin-dir ./claude-code-plugin
```

That's it. The plugin starts scoring immediately using the bundled local scorer.

### Optional: Cloud Mode

For RLM adaptive weight learning and team dashboards, connect to the ContextStellar API:

```bash
export CONTEXTSTELLAR_API_KEY="cs_live_your_key_here"
export CONTEXTSTELLAR_PROJECT_ID="your_project_id_here"
```

Get credentials at [contextstellar.com/connect](https://contextstellar.com/connect).

## How It Works

### Two Modes

| Mode | Config needed | Scoring | RLM Learning | Stats/Dashboard |
|------|--------------|---------|--------------|-----------------|
| **Local** (default) | None | Bundled scorer.js | No | No |
| **Cloud** | API key | Server-side + learned weights | Yes | Yes |

### Automatic Scoring (Hooks)

The plugin hooks into every tool use:

- **PreToolUse** — Scores the prompt before execution. Injects a scoring summary (grade, dimension breakdown, tips) into Claude's context so it can self-improve.
- **PostToolUse** *(cloud only)* — Reports success/failure outcomes back to ContextStellar for RLM weight learning.
- **Stop** *(cloud only)* — Captures session-end metrics (total tokens, cost).

Scored tools: `Bash`, `Write`, `Edit`, `Agent`, `NotebookEdit`.

### Skills (Commands)

| Command | Description | Requires API Key |
|---------|-------------|-----------------|
| `/contextstellar:setup` | Configure API key and project ID | No |
| `/contextstellar:score <prompt>` | Manually score a prompt | No (local) / Optional (cloud) |
| `/contextstellar:stats` | View scoring stats and RLM progress | Yes |
| `/contextstellar:optimize` | Get optimization recommendations | Yes |

### Scoring Dimensions

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| Token Utilization | 25% | Filler, politeness, intensifiers, redundancy |
| Structural Clarity | 23% | XML tags, lists, headers, code blocks |
| Specificity | 20% | Numbers, format keywords, examples, constraints |
| Content Density | 17% | Lexical diversity, n-gram repetition |
| Cache-Friendliness | 15% | Volatile data positioning, timestamps, UUIDs |

### RLM Flywheel (Cloud Mode)

Weights are defaults initially. As you use Claude Code, the plugin reports outcomes (success/failure) alongside scores. After 100+ events, ContextStellar learns which dimensions matter most for *your* project and adjusts weights automatically.

Check progress with `/contextstellar:stats`.

## Privacy

- **Local mode**: All scoring happens on your machine. Zero network calls. Nothing leaves your system.
- **Cloud mode**: Raw prompt text is **never stored** — only SHA-256 hashes. stderr truncated to 200 chars.
- No API key or user content is ever logged.

## Requirements

- Claude Code 1.0.33+
- Node.js (for local scorer — already present if you're using Claude Code)
- `jq` and `curl` (for cloud mode only)

## Plugin Structure

```
claude-code-plugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── skills/
│   ├── score/SKILL.md       # /contextstellar:score
│   ├── stats/SKILL.md       # /contextstellar:stats
│   ├── setup/SKILL.md       # /contextstellar:setup
│   └── optimize/SKILL.md    # /contextstellar:optimize
├── hooks/
│   └── hooks.json           # PreToolUse, PostToolUse, Stop
├── scripts/
│   ├── pre-tool-use.sh      # Scoring hook (local or cloud)
│   ├── post-tool-use.sh     # Outcome reporting (cloud only)
│   ├── session-stop.sh      # Session end (cloud only)
│   └── scorer.js            # Bundled local scorer (zero deps)
└── README.md
```

## License

MIT
