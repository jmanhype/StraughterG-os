# StraughterG OS

> AI content engine built by a systems engineer, for systems engineers.

![StraughterG OS](https://img.shields.io/badge/StraughterG%20OS-v1.0-blue?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## What is this?

An AI content generation system with a dark terminal UI, multi-model routing, and built-in viral score analysis.

Inspired by the "Kaize OS" concept that was promised but never shipped. This is the working version.

## Features

- **Multi-model routing** — Qwen (DashScope), Z.AI/GLM, OpenAI — auto-detected by model prefix
- **Tone engine** — 4-axis control (casual↔formal, witty, provocative, technical)
- **Viral scoring** — LLM self-evaluation: virality, hook strength, readability, emotional pull
- **Format control** — posts, threads, articles, replies, hook batches
- **Platform targeting** — X/Twitter, LinkedIn, long-form
- **Quick actions** — rewrite, expand, shorten, formalize, casualize
- **8 content templates** — story thread, listicle, POV hook, comparison, rage bait, news breakdown, reply generator, roadmap
- **Writing system** — lowercase, punchy, no filler, no corporate glaze

## Stack

```
Next.js 16 + TypeScript + Tailwind CSS
OpenAI-compatible API (any provider)
Dark terminal UI — JetBrains Mono, accent theming
```

## Quick Start

```bash
git clone https://github.com/StraughterG/StraughterG-os.git
cd StraughterG-os

npm install

# Configure API keys
cp .env.local.example .env.local
# Edit .env.local with your key(s)

# Run (requires Node 20+)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Configuration

Supports any OpenAI-compatible provider. Edit `.env.local`:

```bash
# Qwen / DashScope (default)
AI_API_KEY=***
AI...N# Z.AI / ZhiPu / GLM
ZAI_API_KEY=***
Z...N```

The app auto-routes to the correct provider based on model name prefix:
- `qwen-*` → DashScope
- `glm-*` → Z.AI
- `gpt-*` → whatever `AI_BASE_URL` is set to

## Architecture

```
┌─────────────────────────────────────────────────┐
│  React Frontend (dark terminal UI)              │
│  ├─ NavSidebar (navigation + clear)             │
│  ├─ ChatPanel (conversation + suggestions)      │
│  └─ WorkspaceSidebar (controls + scores)        │
├─────────────────────────────────────────────────┤
│  System Prompt Builder                          │
│  (tone sliders → prompt injection)              │
│  (format/platform → rules concatenation)        │
├─────────────────────────────────────────────────┤
│  API Route → OpenAI-compatible LLM              │
│  ├─ Qwen (DashScope)                            │
│  ├─ GLM (Z.AI)                                  │
│  └─ GPT-4 (OpenAI)                              │
├─────────────────────────────────────────────────┤
│  Score Parser                                   │
│  (extracts JSON self-evaluation from LLM)       │
│  (renders animated gauge bars)                  │
└─────────────────────────────────────────────────┘
```

**The truth:** it's a well-designed UI over an optimized system prompt. The "viral score" is the LLM grading its own homework via structured JSON output. The tone sliders inject adjectives into the prompt. That's it. And that's powerful enough.

## The Writing System

The core IP is the writing rules embedded in the system prompt:

- lowercase everything (ALL CAPS for emphasis)
- short sentences, no filler
- numbers > words ($5k not five thousand)
- lead with the shock
- one idea per line
- em dashes (—) not hyphens
- never say "unlock" "leverage" "delve" "game-changer"
- POV format for viral hooks
- [ BRACKETS ] for structured data

## Screenshots

Dark terminal aesthetic:
- Monospace font (JetBrains Mono)
- Green accent color scheme
- Right sidebar: model/creativity/tone/scores
- Bottom action bar for quick rewrites
- Left nav: format selection + clear

## Contributing

PRs welcome. Potential additions:
- [ ] Conversation persistence (SQLite/localStorage)
- [ ] X API integration for direct posting
- [ ] Real-time trending topic injection
- [ ] A/B test mode (generate variants, compare scores)
- [ ] Export to markdown/clipboard
- [ ] Analytics dashboard (track post performance)
- [ ] Multi-user support with saved profiles

## Acknowledgments

Concept inspired by [@0x_kaize](https://x.com/0x_kaize)'s viral content system framework. He showed what was possible with optimized prompts and multi-model routing. This is the working implementation.

## License

MIT. Do whatever you want with it.

---

*Built by [@StraughterG](https://x.com/StraughterG) — systems engineer, not an AI influencer.*
