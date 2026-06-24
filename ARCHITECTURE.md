# StraughterG-OS → Eden Evolution: Architecture Document

## Executive Summary

Transform StraughterG-os from a **content generation tool** into a **personal creator intelligence platform** that autonomously discovers what's working, learns your voice, and generates high-performing content — all for $0/month using existing self-hosted infrastructure.

## Current State (v1.0)

```
┌─────────────────────────────────────────────┐
│  StraughterG-os (Next.js 16 + React 19)     │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Chat UI  │  │ Workspace│  │  History   │ │
│  │ + Actions│  │  Sidebar │  │  Sessions  │ │
│  └────┬─────┘  └────┬─────┘  └───────────┘ │
│       │              │                       │
│  ┌────┴──────────────┴────────────────────┐ │
│  │  /api/chat/route.ts                    │ │
│  │  • OpenAI-compatible proxy             │ │
│  │  • System prompt builder (6 tones)     │ │
│  │  • Viral scoring (LLM self-grade)      │ │
│  │  • Zhipu web search research           │ │
│  │  • Qwen + Z.AI/GLM providers           │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**What it does well:** Generate content with tone/format control and self-graded quality scores.

**What's missing:** No data ingestion, no trend detection, no voice learning, no post database, no creator tracking, no autonomous research loops.

## Target State (Eden-like Platform)

```
┌──────────────────────────────────────────────────────────────────┐
│                    StraughterG-os Frontend (Next.js)              │
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────┐ ┌──────┐ ┌────────────┐  │
│  │ Chat │ │Feed  │ │Voice │ │Boards │ │Ideas │ │ Analytics  │  │
│  │Engine│ │      │ │Panel │ │       │ │      │ │ Dashboard  │  │
│  └──┬───┘ └──┬───┘ └──┬───┘ └───┬───┘ └──┬───┘ └─────┬──────┘  │
│     └────────┴────────┴─────────┴────────┴───────────┘          │
│                              │ REST                              │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                   SGOS Backend (Python/FastAPI)                   │
│                              │                                   │
│  ┌───────────┐ ┌────────────┴──┐ ┌─────────────┐ ┌───────────┐  │
│  │ Ingestion │ │   Research    │ │   Voice     │ │ Repurpose │  │
│  │ Workers   │ │   Engine      │ │   Profile   │ │ Pipeline  │  │
│  └─────┬─────┘ └───────┬───────┘ └──────┬──────┘ └─────┬─────┘  │
│        │               │                │               │        │
│  ┌─────┴───────────────┴────────────────┴───────────────┴─────┐  │
│  │                    SQLite + FTS5                            │  │
│  │  posts │ creators │ trends │ voice_profiles │ boards        │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                   External Sources (Free Tier)                    │
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────────┐ ┌─────────┐ ┌────────────────┐  │
│  │Reddit│ │ X/   │ │ YouTube  │ │Substack │ │  Firecrawl     │  │
│  │ JSON │ │ xurl │ │ Data API │ │  RSS    │ │  (3090 server) │  │
│  └──────┘ └──────┘ └──────────┘ └─────────┘ └────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Architecture Decisions (with Rationale)

### 1. Backend: Python/FastAPI (separate service)
**Why not Node.js API routes?**
- Python has numpy (vector math), feedparser (RSS), better NLP libraries
- Embedding models run natively in Python (sentence-transformers)
- Can run on 3090 server for GPU-accelerated embeddings
- FastAPI is async, fast, auto-docs via OpenAPI

**Trade-off:** Adds HTTP hop between frontend and backend. Mitigated by LAN connection.

### 2. Database: SQLite + FTS5 (not Postgres)
**Why?**
- Zero operational cost (no server to run)
- FTS5 gives full-text search out of the box
- Handles millions of rows fine for single-user
- Embeddings stored as serialized numpy arrays (BLOB)
- Cosine similarity computed in Python (fast enough for <100k vectors)

**When to upgrade:** If post count exceeds 500k OR if multi-user support is needed → migrate to Postgres + pgvector.

### 3. Ingestion: Free APIs Only
| Source | Method | Rate Limit | Cost |
|--------|--------|-----------|------|
| Reddit | JSON endpoint (`/hot.json`) | ~60 req/min | $0 |
| X/Twitter | xurl CLI + Super Grok | Unlimited | $0 |
| YouTube | Data API v3 | 10k units/day | $0 |
| Substack | RSS feeds | Unlimited | $0 |
| Web | Firecrawl (3090) | Unlimited | $0 |
| SearXNG | Self-hosted (3090) | Unlimited | $0 |

### 4. Outlier Detection: Z-Score (not ML)
**Method:** For each subreddit/creator, maintain rolling 30-day mean + stddev of engagement.
```
z_score = (post_engagement - subreddit_mean) / subreddit_stddev
outlier = z_score > 2.0  (top ~2.5% of posts)
```

**Why not Isolation Forest / ML?** Overkill for MVP. Z-score is:
- Interpretable ("this post got 3× normal engagement")
- Fast (O(1) per post after stats are computed)
- Zero training data needed
- Can upgrade to ML later if needed

### 5. Voice Profile: LLM-Extracted Style Card (not embeddings)
**Method:** Feed user's past 100-200 tweets through LLM → extract structured style rules → inject into system prompt.

**Why not few-shot retrieval?**
- A well-crafted style prompt is MORE effective than example-based mimicry
- No embedding infrastructure needed for MVP
- Easy to inspect and edit ("my voice card says I use short sentences — that's right")
- Integrates directly with existing tone engine in systemPrompt.ts

### 6. Autonomous Loop: Hermes Cron Jobs
**Why not a dedicated scheduler (Celery, BullMQ)?**
- Hermes cron already exists and works
- Delivers results directly to user's chat
- Can chain: scrape → score → generate → deliver
- Zero additional infrastructure

## Phased Roadmap

### Phase 1: Research Engine ← BUILDING NOW
**Deliverable:** Automated daily research pipeline that discovers outliers in your niche.

- [x] Architecture document (this file)
- [ ] Python/FastAPI backend (`/Users/speed/sgos-backend/`)
- [ ] SQLite database with posts + creators + FTS5
- [ ] Reddit ingestion worker (5 AI subreddits)
- [ ] Outlier scoring (z-score based)
- [ ] API: `GET /outliers`, `GET /trends`, `POST /ingest`
- [ ] Hermes cron: daily scrape + score + deliver brief

**Value:** Know what's working BEFORE you write. 10x the relevance of random generation.

### Phase 2: Voice Intelligence
- [ ] Pull user's tweets via xurl
- [ ] LLM style extraction → voice card
- [ ] Inject voice card into systemPrompt.ts
- [ ] Voice panel in StraughterG-os settings
- [ ] Daily brief cron: outliers + voice-aware generation

### Phase 3: Multi-Platform Ingestion
- [ ] X/Twitter ingestion (xurl + search)
- [ ] YouTube ingestion (Data API v3)
- [ ] Substack ingestion (RSS)
- [ ] Firecrawl for niche blogs
- [ ] Cross-platform trend correlation

### Phase 4: Intelligence Layer
- [ ] Local embedding model (bge-small on 3090)
- [ ] Vector search across all posts
- [ ] Topic clustering
- [ ] Creator tracking (follow specific accounts)
- [ ] Competitive analysis

### Phase 5: Distribution
- [ ] Repurposing pipeline (one post → 5 formats)
- [ ] Autopost via xurl
- [ ] Carousel generation (text + image)
- [ ] Content scheduling
- [ ] Performance tracking

## API Contract (Phase 1)

```
BASE_URL: http://localhost:8420

GET /health
  → { "status": "ok", "posts_count": N, "last_ingest": "ISO8601" }

GET /outliers?platform=reddit&hours=24&limit=10
  → [
      {
        "id": "...",
        "platform": "reddit",
        "subreddit": "StableDiffusion",
        "title": "...",
        "content": "...",
        "score": 1543,
        "z_score": 4.2,
        "author": "...",
        "url": "...",
        "created_at": "ISO8601",
        "comment_count": 89
      }
    ]

GET /trends?platform=reddit&days=7
  → [
      {
        "topic": "LoRA training",
        "mention_count": 23,
        "growth_rate": 2.3,
        "top_posts": [...]
      }
    ]

POST /ingest
  → { "status": "ok", "posts_added": N, "posts_updated": M }

GET /stats
  → {
      "total_posts": N,
      "platforms": { "reddit": N },
      "subreddits": { "StableDiffusion": N },
      "last_ingest": "ISO8601",
      "outliers_24h": N
    }
```

## Data Model (Phase 1)

```sql
CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    subreddit TEXT,
    title TEXT,
    content TEXT,
    author TEXT,
    url TEXT,
    score INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    z_score REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    ingested_at TEXT NOT NULL,
    embedding BLOB,
    UNIQUE(platform, platform_id)
);

CREATE TABLE sub_stats (
    subreddit TEXT PRIMARY KEY,
    mean_score REAL,
    stddev_score REAL,
    sample_size INTEGER,
    last_updated TEXT
);

CREATE TABLE creators (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    followed BOOLEAN DEFAULT FALSE,
    avg_score REAL,
    post_count INTEGER DEFAULT 0,
    UNIQUE(platform, username)
);

CREATE VIRTUAL TABLE posts_fts USING fts5(
    title, content, subreddit, author,
    content=posts, content_rowid=rowid
);
```

## Reflexion: What Could Go Wrong?

1. **Reddit rate limiting:** 60 req/min is generous but if we scrape 50 subs × 5 pages = 250 requests. Solution: stagger requests with 2s delay, cache aggressively, only scrape once per day.

2. **Z-score cold start:** New subreddits have no baseline. Solution: seed with initial 100 posts, compute stats from that batch. First day won't have good outliers.

3. **SQLite concurrency:** FastAPI is async but SQLite isn't great with concurrent writes. Solution: single writer pattern, use WAL mode, writes only during ingestion (reads are fine concurrent).

4. **Frontend integration complexity:** Adding a research feed to existing Next.js app. Solution: new API route that proxies to Python backend, new component that fetches and displays outliers. Minimal coupling.

5. **Voice profile accuracy:** LLM-extracted style might miss nuances. Solution: allow manual editing of voice card, iterate based on output quality.

## Cost Analysis: $0/month

| Component | Cost | Why |
|-----------|------|-----|
| SQLite | $0 | Local file |
| Python backend | $0 | Runs on existing hardware |
| Reddit API | $0 | Public JSON endpoints |
| SearXNG | $0 | Self-hosted on 3090 |
| Firecrawl | $0 | Self-hosted on 3090 |
| LLM generation | $0 | Aliyun/Qwen free tier |
| Hermes cron | $0 | Built into Hermes |
| Embeddings (Phase 4) | $0 | Local model on 3090 |

**Total monthly cost: $0**

The only thing we're spending is electricity for the 3090 server, which is already running.
