# Frontend Documentation — StraughterG OS

## Overview

The frontend is a **Next.js 16 + TypeScript** application with a dark terminal aesthetic. It has two main interfaces:

1. **Content Generation** — Multi-model LLM chat with tone control, format targeting, and viral scoring
2. **Pipeline Dashboard** — Autonomous viral content pipeline management with platform export and adaptive intelligence

## Architecture

```
StraughterG-os/
├── app/
│   ├── page.tsx              # Main page (content generation UI)
│   ├── layout.tsx            # Root layout (fonts, metadata)
│   ├── globals.css           # Tailwind + custom theme
│   └── api/
│       └── chat/
│           └── route.ts      # SSE streaming API route → LLM
│
├── components/
│   ├── PipelineDashboard.tsx # Pipeline management (3 tabs: opportunities, genomes, adaptive)
│   ├── NavSidebar.tsx        # Left navigation (format selection, model switch)
│   ├── ChatPanel.tsx         # Center conversation area
│   └── WorkspaceSidebar.tsx  # Right sidebar (tone sliders, viral scores)
│
└── lib/
    └── utils.ts              # Shared utilities
```

## Content Generation UI

### Multi-Model Routing

The app auto-detects the LLM provider from the model name prefix:

| Prefix | Provider | Example Models |
|--------|----------|---------------|
| `qwen-*` | DashScope (Alibaba) | `qwen-plus`, `qwen-max` |
| `glm-*` | Z.AI (ZhiPu) | `glm-4`, `glm-4-flash` |
| `gpt-*` | OpenAI (or configured base URL) | `gpt-4`, `gpt-3.5-turbo` |

### Tone Engine

4-axis control that injects adjectives into the system prompt:

| Axis | Range | Effect |
|------|-------|--------|
| Casual ↔ Formal | 0–100 | "bro" language vs. "distinguished" language |
| Witty | 0–100 | Humor, wordplay, clever observations |
| Provocative | 0–100 | Bold claims, contrarian takes, hot takes |
| Technical | 0–100 | Jargon, specificity, depth |

### Viral Scoring

The LLM grades its own output via structured JSON:

```json
{
  "virality": 85,
  "hook_strength": 90,
  "readability": 78,
  "emotional_pull": 82
}
```

Scores render as animated gauge bars in the workspace sidebar.

### Quick Actions

One-click content transformations:
- **Rewrite** — Regenerate with same parameters
- **Expand** — Add more detail
- **Shorten** — Compress to essentials
- **Formalize** — Shift tone toward professional
- **Casualize** — Shift tone toward conversational

### Content Templates

8 pre-built templates:
1. Story Thread
2. Listicle
3. POV Hook
4. Comparison
5. Rage Bait
6. News Breakdown
7. Reply Generator
8. Roadmap

## Pipeline Dashboard

The Pipeline Dashboard (`components/PipelineDashboard.tsx`) is the management interface for the autonomous viral content pipeline. It connects to the backend at `NEXT_PUBLIC_API_URL` (default: `http://localhost:8420`).

### Tab 1: Opportunities

Displays ranked content opportunities sorted by composite score.

**Features:**
- **Score badges** — Color-coded: 🟢 ≥75 (green), 🟡 50–74 (yellow), 🔴 <50 (red)
- **Expandable cards** — Click to see full content, score breakdown, and action buttons
- **Platform export** — 🐦 X Thread and 💼 LinkedIn buttons format and copy to clipboard
- **View/Dismiss/Publish** — Track what you've seen and what you've used
- **Regenerate** — Get fresh variants from the same viral genome
- **Hook type badges** — Shows the structural DNA (question, list, story, etc.)

**Bulk Action Bar** (appears when opportunities exist):
- **Dismiss All <50** — One-click cleanup of low-scoring drafts
- **Copy Top 3 as X Threads** — Bulk export top performers
- **Regenerate Top Genomes** — Fresh variants from proven DNA

### Tab 2: Genomes 🧬

Displays extracted viral DNA from outlier posts.

**Features:**
- **Engagement score** — How viral the source post was (0–100%)
- **Hook type + Structural pattern** — What made it work
- **Key phrases** — High-impact phrases from the original
- **Emotional arc** — Trajectory of emotions through the content
- **Opportunity count** — How many variants were generated from this genome
- **Regenerate button** — Create fresh variants from this genome

### Tab 3: Adaptive 🧠

Displays the feedback loop status and trained scorer weights.

**Features:**
- **Published count** — Total content you've published
- **Engagement rate** — Average engagement rate across all published content
- **Tier distribution** — How many viral/above_avg/avg/below_avg performers
- **Active scorer weights** — Bar chart showing current weights (trained vs. default)
- **Train button** — Manually trigger weight training (requires ≥10 records)
- **Top Performers** — Leaderboard of your best-performing content
- **Best Formats** — Which content formats (thread, post, etc.) perform best

### Data Flow

```
Backend (port 8420)
    │
    ├─ GET /pipeline/stats         → Header stats (genomes, opportunities, unseen)
    ├─ GET /pipeline/opportunities → Opportunities tab
    ├─ GET /pipeline/genomes       → Genomes tab
    ├─ GET /feedback/stats         → Adaptive tab
    │
    ├─ POST /pipeline/opportunities/{id}/view    → Mark as viewed
    ├─ POST /pipeline/opportunities/{id}/dismiss  → Dismiss
    ├─ POST /feedback/published                   → Mark as published
    ├─ GET /pipeline/opportunities/{id}/format    → Platform export
    │
    ├─ POST /pipeline/opportunities/dismiss-all   → Bulk dismiss
    ├─ POST /pipeline/opportunities/copy-batch    → Bulk copy formatted
    ├─ POST /pipeline/opportunities/regenerate-batch → Bulk regenerate
    │
    └─ POST /feedback/train              → Train scorer weights
       POST /pipeline/genomes/{id}/regenerate → Regenerate single genome
```

### State Management

The dashboard uses React `useState` + `useCallback` + `useEffect` with a single `fetchAll()` function that hits 4 endpoints in parallel:

```typescript
const [stats, setStats] = useState(null);
const [opportunities, setOpportunities] = useState([]);
const [genomes, setGenomes] = useState([]);
const [feedback, setFeedback] = useState(null);
```

Auto-refreshes every 30 seconds via `setInterval`.

### Components

| Component | Purpose |
|-----------|---------|
| `PipelineDashboard` | Container: tabs, data fetching, state management |
| `OpportunityCard` | Individual opportunity with expand/collapse, actions |
| `GenomeCard` | Individual genome display |
| `FeedbackPanel` | Adaptive intelligence tab content |
| `HookDistribution` | Bar chart of hook type distribution |

### Clipboard Integration

Platform export uses the Clipboard API:

```typescript
const exportContent = useCallback(async (opp, platform) => {
  const res = await fetch(`${BACKEND_URL}/pipeline/opportunities/${opp.id}/format?platform=${platform}`);
  const data = await res.json();
  await navigator.clipboard.writeText(data.copy_ready);
  // Visual feedback: button text changes to "Copied!"
}, []);
```

## Styling

### Design System

- **Font:** JetBrains Mono (monospace) — terminal aesthetic
- **Color scheme:** Dark background with green accent (configurable)
- **Borders:** 1px solid with CSS variable `--border`
- **Cards:** Subtle background with hover states

### CSS Variables

```css
:root {
  --background: #0a0a0a;
  --foreground: #ededed;
  --border: #2a2a2a;
  --accent: #22c55e;  /* green-500 */
}
```

### Responsive

The dashboard is primarily desktop-focused (content management tool). Mobile support is functional but not optimized.

## Environment Variables

```bash
# .env.local

# LLM API keys
AI_API_KEY=*** ZAI_API_KEY=***
*...ackend URL (for Pipeline Dashboard)
NEXT_PUBLIC_API_URL=http://localhost:8420
```

## Development

```bash
# Install dependencies
npm install

# Run dev server (hot reload)
npm run dev

# Build check (TypeScript + Next.js compilation)
npx next build

# Start production server
npm run build && npm start
```

## Adding a New Tab

1. Add the tab name to the `activeTab` union type
2. Add a tab button in the tab bar
3. Add the tab content rendering block
4. If it needs data, add a fetch call in `fetchAll()`

```typescript
// In PipelineDashboard.tsx
const [activeTab, setActiveTab] = useState<'opportunities' | 'genomes' | 'feedback' | 'myNewTab'>('opportunities');

// Tab button
<button onClick={() => setActiveTab('myNewTab')}>
  My Tab
</button>

// Tab content
{activeTab === 'myNewTab' && (
  <MyNewTabComponent data={myData} />
)}
```
