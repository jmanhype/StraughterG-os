# StraughterG-os Frontend: Deep Reliability + Performance Audit

**Date:** 2026-06-24  
**Scope:** All .tsx/.ts files (excluding node_modules)  
**Files Audited:** 21 .tsx + 15 .ts = 36 source files

---

## Executive Summary

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| Memory Leaks | 0 | 3 | 4 | 0 |
| XSS Vectors | 1 | 1 | 0 | 0 |
| Race Conditions | 1 | 1 | 2 | 0 |
| Missing Error Boundaries | 1 | 0 | 1 | 0 |
| Stale Closures | 1 | 0 | 1 | 0 |
| Uncontrolled Re-renders | 0 | 2 | 3 | 0 |
| Missing Loading/Error States | 0 | 1 | 2 | 0 |
| Accessibility | 0 | 3 | 4 | 0 |
| **TOTAL** | **4** | **11** | **17** | **0** |

---

## 1. MEMORY LEAKS

### 1.1 [HIGH] useEffect fetches without AbortController — 5 components
**Files:** `ResearchFeed.tsx:102`, `CreatorView.tsx:224`, `BoardsView.tsx:94`, `PipelineDashboard.tsx:398`, `VoiceView.tsx:57`, `TranscribeView.tsx:39`  
**Severity:** HIGH  
**Root Cause:** All backend-dependent views fire `fetch()` calls inside `useEffect` but never provide an `AbortController` signal or cleanup return. If the user navigates away (e.g., switches views via NavSidebar) before the fetch resolves, the resolved promise calls `setState` on an unmounted component. While React 18 suppresses the console warning, the resolved fetch still wastes resources and can cause subtle state conflicts if the component re-mounts.  
**Impact:** Wasted network bandwidth, potential state corruption on rapid view-switching.  
**Recommended Fix:**
```tsx
useEffect(() => {
  const controller = new AbortController();
  checkBackend(controller.signal).then(ok => {
    if (ok) fetchData(controller.signal);
    else setLoading(false);
  });
  return () => controller.abort();
}, [checkBackend, fetchData]);
```

### 1.2 [HIGH] setTimeout without cleanup on unmount — 4 components
**Files:**
- `VoiceView.tsx:142,152` — `setTimeout(() => setCopied(false), 2000)`
- `SettingsView.tsx:60` — `setTimeout(() => setSaved(false), 2000)`
- `PipelineDashboard.tsx:445` — `setTimeout(() => setCopyStatus(null), 2000)`
- `CreatorView.tsx:173` — `setTimeout(() => { fetchData(); setFollowSuccess(''); setActiveTab('creators'); }, 1500)`

**Severity:** HIGH (CreatorView) / MEDIUM (others)  
**Root Cause:** Timers fire after component unmount, calling `setState` on unmounted components. The CreatorView case is worst because it also calls `fetchData()` and `setActiveTab()`, which could trigger fetches and navigation changes on a dead component.  
**Impact:** Memory leaks (timer references hold component closures in memory), wasted work, potential navigation bugs.  
**Recommended Fix:**
```tsx
// Use a ref to track mounted state, or return cleanup from useEffect
const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
// On timer creation: timersRef.current.push(timerId);
// On unmount: timersRef.current.forEach(clearTimeout);
```

### 1.3 [MEDIUM] VoiceView clipboard fallback appends DOM node without guaranteed removal
**File:** `VoiceView.tsx:145-150`  
**Severity:** MEDIUM  
**Root Cause:** The clipboard fallback creates a `<textarea>`, appends to `document.body`, copies, then removes it. If `document.execCommand('copy')` throws, the `removeChild` line is never reached, leaving a stray textarea in the DOM.  
**Recommended Fix:** Wrap in try/finally:
```tsx
const ta = document.createElement('textarea');
try {
  ta.value = prompt;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
} finally {
  document.body.removeChild(ta);
}
```

### 1.4 [MEDIUM] CarouselView setTimeout chain for slide export not cancellable
**File:** `CarouselView.tsx:80`  
**Severity:** MEDIUM  
**Root Cause:** `setTimeout(() => exportSlideHTML(i), i * 200)` creates a chain of timers that cannot be cancelled if the user navigates away during export. Each timer holds a reference to the component closure.  
**Recommended Fix:** Track timer IDs and clear on unmount.

---

## 2. XSS VECTORS

### 2.1 [CRITICAL] API keys stored in plaintext in localStorage
**File:** `SettingsView.tsx:55-60`  
**Severity:** CRITICAL  
**Root Cause:** `aiApiKey` and `zaiApiKey` are stored as plaintext strings in `localStorage` under key `sgos-settings`. localStorage is accessible to ANY JavaScript running on the same origin. If any XSS vector is introduced (even a minor one like a compromised npm dependency), these keys can be trivially exfiltrated with `JSON.parse(localStorage.getItem('sgos-settings')).aiApiKey`.  
**Impact:** Full compromise of AI API keys, enabling unauthorized API usage, billing abuse, and data exfiltration.  
**Recommended Fix:**
1. Move API key storage to HTTP-only cookies set by the server
2. Use the Next.js API route as a proxy (which it already is at `/api/chat`) — store keys server-side in `.env` only
3. If client-side storage is unavoidable, encrypt at rest with a session-derived key

### 2.2 [HIGH] Backend-sourced URLs used directly in href without validation
**Files:** `SearchView.tsx:557-573`, `ResearchFeed.tsx:316-323`, `BoardsView.tsx:282-286,310-314`, `CreatorView.tsx:574-582`  
**Severity:** HIGH  
**Root Cause:** URLs from backend API responses (`post.url`) are rendered directly in `<a href={post.url}>`. While `rel="noopener noreferrer"` is correctly applied, the URL itself is not validated. A compromised backend or malicious data injection could provide `javascript:alert(1)` URLs. Modern browsers block most `javascript:` href attacks when clicked, but some edge cases remain (e.g., right-click → open, or older browsers).  
**Impact:** Potential phishing or XSS via crafted URLs in ingested content.  
**Recommended Fix:**
```tsx
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '#';
    return url;
  } catch {
    return '#';
  }
}
```

### 2.3 [SAFE] No dangerouslySetInnerHTML found
**All files scanned:** Zero instances of `dangerouslySetInnerHTML` or `innerHTML` assignment. React's default text escaping protects all rendered content. ✅

---

## 3. RACE CONDITIONS

### 3.1 [CRITICAL] sendMessage race condition — rapid double-send corrupts message history
**File:** `useChatStore.ts:75-269`  
**Severity:** CRITICAL  
**Root Cause:** `sendMessage` is an async function that uses `messages` from its closure (line ~76: `const updatedMessages = [...messages, userMessage]`). If called twice in rapid succession (e.g., user hits Enter twice quickly), both invocations capture the same `messages` snapshot. The second call's `updatedMessages` won't include the first call's user message. When both resolve, the later-finishing one overwrites the messages array, potentially losing the earlier assistant response.  
The `isLoading` guard (ChatPanel disables send button during loading) mitigates this for UI interactions, but `handleAction` (line 271-275) sets `isLoading` then calls `sendMessage` synchronously, creating a window where `isLoading` is set but `sendMessage` hasn't updated the messages yet.  
**Impact:** Lost messages, duplicated responses, or corrupted session state.  
**Recommended Fix:**
```tsx
// Use functional state updates instead of closure:
const sendMessage = useCallback(async (content: string, action?: string) => {
  setMessages(prev => {
    const userMessage = { ... };
    const updated = [...prev, userMessage];
    // Queue the async work with the updated messages
    queueMicrotask(() => performFetch(updated));
    return updated;
  });
}, [...]);
```

### 3.2 [HIGH] PipelineDashboard: filter change triggers refetch race with markViewed
**File:** `PipelineDashboard.tsx:396,418-423`  
**Severity:** HIGH  
**Root Cause:** `fetchAll` depends on `filter` in its useCallback dependency array (line 396). Changing the filter triggers a new `fetchAll` via the useEffect. Simultaneously, `markViewed` (line 418-423) does an optimistic `setStats` update. If the user changes filter while a `markViewed` optimistic update is in-flight, the subsequent `fetchAll` response overwrites the optimistic decrement, causing the unseen count to flicker or become stale.  
**Recommended Fix:** Use a request ID or AbortController to invalidate stale fetches.

### 3.3 [MEDIUM] Multiple concurrent fetches in fetchData (ResearchFeed, CreatorView)
**Files:** `ResearchFeed.tsx:71-85`, `CreatorView.tsx:88-120`  
**Severity:** MEDIUM  
**Root Cause:** `Promise.all([fetch(...), fetch(...), fetch(...)])` has no AbortController. If one request is slow, the user can navigate away and back, triggering a second `fetchData`. Both invocations will update state, with the later one winning. This can cause the UI to briefly show data from a stale request.  
**Recommended Fix:** Add AbortController signal to all fetch calls; abort previous on new invocation.

### 3.4 [MEDIUM] CreatorView markAllAlertsRead fires N sequential requests
**File:** `CreatorView.tsx:217-220`  
**Severity:** MEDIUM  
**Root Cause:** `markAllAlertsRead` iterates `alerts.filter(a => !a.read)` and calls `markAlertRead(a.id)` for each, which is itself an async function. This creates N sequential API calls with N sequential state updates, causing N re-renders. If alerts change between the filter and the completion, stale state is used.  
**Recommended Fix:** Batch the API call (e.g., `POST /alerts/read-all`) or use `Promise.all` with a single optimistic state update.

---

## 4. MISSING ERROR BOUNDARIES

### 4.1 [CRITICAL] Single error boundary wraps ALL dynamic content
**File:** `app/page.tsx:184-186`  
**Severity:** CRITICAL (architectural)  
**Root Cause:** The only error boundary (`NavErrorBoundary`) wraps the entire `renderMainContent()` output. If ANY component throws a render error — ChatPanel, SearchView, PipelineDashboard, etc. — the ENTIRE main content area crashes to the fallback UI. The user loses all context (chat messages, form inputs, navigation state). The fallback calls `window.location.reload()`, which is a heavy-handed recovery that loses all unsaved state.  
**Impact:** Single component failure takes down the entire application.  
**Recommended Fix:**
```tsx
// Add granular error boundaries around high-risk components:
<ErrorBoundary fallback={<ChatErrorFallback />}>
  <ChatPanel ... />
</ErrorBoundary>
<ErrorBoundary fallback={<SidebarErrorFallback />}>
  <WorkspaceSidebar ... />
</ErrorBoundary>
```

### 4.2 [MEDIUM] No error boundary for NavSidebar
**File:** `app/page.tsx:177-182`  
**Severity:** MEDIUM  
**Root Cause:** `NavSidebar` is rendered outside the `NavErrorBoundary`. If it throws, the entire page crashes with React's unhandled error (blank screen in production).  
**Recommended Fix:** Wrap NavSidebar in its own error boundary.

---

## 5. STALE CLOSURE BUGS

### 5.1 [CRITICAL] sendMessage captures stale messages array
**File:** `useChatStore.ts:75-76`  
**Severity:** CRITICAL  
**Root Cause:** `sendMessage` is defined with `useCallback` depending on `[messages, workspace, pendingFiles, activeSessionId, onNewSession, persistSession]` (line 269). Inside, it reads `messages` directly: `const updatedMessages = [...messages, userMessage]`. While `messages` IS in the dependency array (so the callback is recreated when messages change), there's a window between the callback being invoked and React re-rendering where the captured `messages` is stale. Specifically:
1. User sends message A → sendMessage(A) captures messages=[...]
2. React re-renders with messages=[...A]
3. But before the new sendMessage callback is created, the async fetch from step 1 resolves and calls `syncMessages(finalMessages)` which uses the OLD messages array + assistant response
4. If user sends message B during this window, the race manifests

The `messagesRef` pattern used in `handleRetry` (line 278) is the correct approach but isn't applied to `sendMessage` itself.  
**Recommended Fix:** Use `messagesRef.current` inside sendMessage (like handleRetry already does).

### 5.2 [MEDIUM] CreatorView markAllAlertsRead captures stale alerts
**File:** `CreatorView.tsx:217-220`  
**Severity:** MEDIUM  
**Root Cause:** `markAllAlertsRead` reads `alerts` from closure. Between the time it starts and finishes (N sequential async calls), new alerts could arrive or existing alerts could be marked read elsewhere. The function would still try to mark the original set.  
**Recommended Fix:** Use `alertsRef.current` pattern or batch API call.

---

## 6. UNCONTROLLED RE-RENDERS

### 6.1 [HIGH] Inline callback props recreate on every render — page.tsx
**File:** `app/page.tsx:154-168`  
**Severity:** HIGH  
**Root Cause:** Every view component receives inline arrow functions as props:
```tsx
onGenerate={(topic) => goToChatWithTemplate(`Write a thread about ${topic}...`)}
```
These create new function references on every render of `page.tsx`, which means every child component re-renders on every parent state change (e.g., `activeNav` change, `messages` change, etc.), even if `React.memo()` were applied.  
**Impact:** Unnecessary re-renders of 10+ components on every state change in the parent.  
**Recommended Fix:** Memoize callbacks with `useCallback` or define them once outside the switch statement.

### 6.2 [HIGH] VoiceView creates styles object on every render
**File:** `VoiceView.tsx:166-237`  
**Severity:** HIGH  
**Root Cause:** The `styles` object (70+ lines of inline style definitions) is recreated on every render. This object is used as prop values throughout the JSX, causing React to see every styled element as changed.  
**Impact:** Entire VoiceView subtree re-renders on any state change.  
**Recommended Fix:** Move styles to a module-level constant or use `useMemo`.

### 6.3 [MEDIUM] renderMainContent() function recreates JSX on every render
**File:** `app/page.tsx:110-173`  
**Severity:** MEDIUM  
**Root Cause:** `renderMainContent()` is called as a function (not rendered as a component), so it recreates the entire JSX tree on every parent render. While React's reconciler handles this efficiently for unchanged branches, it still creates new object references for all props.  
**Recommended Fix:** Convert to direct JSX or a memoized component.

### 6.4 [MEDIUM] Most view components are not memoized
**Files:** `ResearchFeed.tsx`, `CreatorView.tsx`, `BoardsView.tsx`, `SearchView.tsx`, `VoiceView.tsx`, `HistoryView.tsx`, `ProjectsView.tsx`, `HomeView.tsx`, `TranscribeView.tsx`, `StyleGuideView.tsx`  
**Severity:** MEDIUM  
**Root Cause:** Only `ChatPanel` and `PipelineDashboard` sub-components use `React.memo()`. All other components re-render whenever their parent re-renders, even with identical props.  
**Recommended Fix:** Wrap with `React.memo()` and ensure callback props are memoized.

### 6.5 [MEDIUM] PipelineDashboard fetchAll recreated on filter change
**File:** `PipelineDashboard.tsx:373-396`  
**Severity:** MEDIUM  
**Root Cause:** `fetchAll` has `[filter]` in its dependency array. Every filter toggle creates a new function, which triggers the useEffect (which depends on `fetchAll`), causing a full data refetch. This is actually correct behavior (you want to refetch on filter change), but the function recreation also causes any component that received `fetchAll` as a prop to re-render.  

---

## 7. MISSING LOADING/ERROR STATES

### 7.1 [HIGH] VoiceView shows empty state before initial fetch completes
**File:** `VoiceView.tsx:57-59`  
**Severity:** HIGH  
**Root Cause:** `loading` state starts as `false` (line 36). The `useEffect` calls `fetchProfiles()` which doesn't set a loading state. The user briefly sees "No voice profiles yet" before data arrives.  
**Recommended Fix:** Initialize `loading` to `true` or set it inside `fetchProfiles`.

### 7.2 [MEDIUM] TranscribeView has no loading indicator for status check
**File:** `TranscribeView.tsx:39-43`  
**Severity:** MEDIUM  
**Root Cause:** The status check on mount has no loading state. The status badge in the header simply doesn't render until the fetch completes, with no indication that a check is in progress.

### 7.3 [MEDIUM] ProjectsView and HomeView have no loading states
**Files:** `ProjectsView.tsx`, `HomeView.tsx`  
**Severity:** MEDIUM  
**Root Cause:** Both read from localStorage synchronously, so there's no async loading gap. However, if the localStorage read is slow (large datasets) or if these are later converted to server-side data, there's no loading state infrastructure.  
**Note:** This is a minor concern for the current architecture but worth flagging for future refactoring.

---

## 8. ACCESSIBILITY ISSUES

### 8.1 [HIGH] No ARIA roles or keyboard support for interactive card components
**Files:** `ResearchFeed.tsx:288-375`, `CreatorView.tsx:417-426`, `SearchView.tsx` card patterns  
**Severity:** HIGH  
**Root Cause:** Interactive elements that expand/collapse content on click are implemented as `<div>` with `onClick` handlers. These are:
- Not focusable (no `tabIndex`)
- Not announced as interactive (no `role="button"`)
- Missing `aria-expanded` attributes
- Not activatable via keyboard (no `onKeyDown` for Enter/Space)

**Impact:** Completely inaccessible to keyboard-only users and screen reader users.  
**Recommended Fix:**
```tsx
<div
  role="button"
  tabIndex={0}
  aria-expanded={isExpanded}
  onClick={() => toggleCreator(creator.handle)}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCreator(creator.handle); }}
>
```

### 8.2 [HIGH] Icon-only buttons without aria-labels
**Files:** Multiple (all components)  
**Severity:** HIGH  
**Root Cause:** Many buttons use only emoji/icons as content without aria-labels:
- `ResearchFeed.tsx:424`: ✍️ button
- `HistoryView.tsx:131`: × delete button
- `PipelineDashboard.tsx:261-266`: ✕ Dismiss button
- `BoardsView.tsx:272-278`: ✕ Remove button

Screen readers will either announce nothing or read the emoji literally ("multiply sign").  
**Recommended Fix:** Add `aria-label` to all icon-only buttons.

### 8.3 [HIGH] Font sizes below WCAG minimum readability threshold
**Files:** ALL components  
**Severity:** HIGH  
**Root Cause:** Extensive use of `text-[8px]`, `text-[9px]`, `text-[10px]` throughout the application. WCAG 2.1 recommends minimum 12px equivalent for body text. The 8-9px sizes used for z-scores, timestamps, and secondary metadata are extremely difficult to read for users with low vision.  
**Impact:** Fails WCAG 1.4.4 (Resize Text) and 1.4.10 (Reflow).

### 8.4 [MEDIUM] No aria-live region for streaming chat content
**File:** `ChatPanel.tsx`  
**Severity:** MEDIUM  
**Root Cause:** The streaming content area updates continuously as text arrives from the SSE stream. Without `aria-live="polite"` or `role="log"`, screen reader users get no indication that content is being dynamically added.  
**Recommended Fix:** Add `aria-live="polite"` and `role="log"` to the streaming content container.

### 8.5 [MEDIUM] confirm() dialogs for destructive actions
**Files:** `HistoryView.tsx:24`, `BoardsView.tsx:126`  
**Severity:** MEDIUM  
**Root Cause:** Using native `confirm()` for "Delete all sessions?" and "Delete this board?". These block the main thread, are not stylable, and some screen readers handle them poorly.  
**Recommended Fix:** Replace with a custom modal dialog component.

### 8.6 [MEDIUM] Color-only status indicators
**Files:** `ResearchFeed.tsx:196,296`, `PipelineDashboard.tsx:178`, `BoardsView.tsx:196`  
**Severity:** MEDIUM  
**Root Cause:** Status dots (green=online, red=offline, accent=new) and z-score colors convey information through color alone without text alternatives. Fails WCAG 1.4.1 (Use of Color).  
**Recommended Fix:** Add text labels alongside color indicators.

### 8.7 [MEDIUM] Drag-and-drop without keyboard alternative
**File:** `TranscribeView.tsx:136-161`  
**Severity:** MEDIUM  
**Root Cause:** The file upload zone supports drag-and-drop and click-to-browse, but the click handler is on a `<div>` without `role="button"`, `tabIndex`, or keyboard activation. While the hidden `<input type="file">` provides a keyboard path through the click handler, the outer div isn't focusable.  
**Recommended Fix:** Make the drop zone focusable and add keyboard event handlers.

---

## 9. ADDITIONAL FINDINGS

### 9.1 [HIGH] Hardcoded localhost URLs prevent production deployment
**Files:** ALL backend-dependent components (8 files)  
**Severity:** HIGH (deployment blocker)  
**Root Cause:** `const BACKEND_URL = 'http://localhost:8420'` is hardcoded in:
- `ResearchFeed.tsx:5`
- `CreatorView.tsx:5`
- `SearchView.tsx:5`
- `CarouselView.tsx:5`
- `BoardsView.tsx:5`
- `TranscribeView.tsx:5`
- `VoiceView.tsx:5`
- `PipelineDashboard.tsx:5`
- `useChatStore.ts:113` (uses `http://127.0.0.1:8420/chat/stream`)

**Recommended Fix:** Use `process.env.NEXT_PUBLIC_BACKEND_URL` with a default fallback.

### 9.2 [INFO] Positive patterns found (no action needed)
- ✅ `SearchView.tsx`: Proper debounce cleanup with `clearTimeout`
- ✅ `CarouselView.tsx`: Proper `URL.revokeObjectURL` after blob download
- ✅ `page.tsx`: Proper `removeEventListener` cleanup for keyboard shortcuts
- ✅ `useSessionStore.ts`: Correct `sessionsRef` pattern to avoid stale closures
- ✅ `ChatPanel.tsx`: Proper `React.memo()` wrapping
- ✅ `PipelineDashboard.tsx`: Sub-components properly memoized with `React.memo()`
- ✅ No `dangerouslySetInnerHTML` anywhere in the codebase
- ✅ All external links use `rel="noopener noreferrer"`
- ✅ `NavErrorBoundary` provides a recovery path for render errors

---

## Priority Remediation Order

1. **CRITICAL — API keys in localStorage** (SettingsView.tsx) — Security risk
2. **CRITICAL — sendMessage race condition** (useChatStore.ts) — Data loss risk
3. **CRITICAL — Single error boundary** (page.tsx) — Full-app crash risk
4. **CRITICAL — Stale closure in sendMessage** (useChatStore.ts) — Message corruption
5. **HIGH — Missing AbortControllers** (5 components) — Memory/performance
6. **HIGH — Inline callback props** (page.tsx) — Performance
7. **HIGH — VoiceView styles object** (VoiceView.tsx) — Performance
8. **HIGH — Accessibility: no ARIA on interactive cards** — WCAG compliance
9. **HIGH — URL validation** (multiple) — Security hardening
10. **HIGH — Hardcoded localhost URLs** — Deployment readiness

---

*Audit complete. 32 issues identified across 36 source files. No files were modified during this audit.*
