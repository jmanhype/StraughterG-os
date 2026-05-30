'use client';

import { useState } from 'react';

const SECTIONS = [
  {
    id: 'voice',
    title: 'Core Voice',
    icon: '🎯',
    content: [
      'Direct. Technical. Implementation-first.',
      'No corporate glaze. No empty hype.',
      'Sharp, systems-minded, slightly contrarian.',
      'Occasionally funny. Allergic to fake certainty.',
      'Skeptical of AI hype. Optimistic about real engineering.',
      'Comfortable saying "this fails in production."',
    ],
  },
  {
    id: 'rules',
    title: 'Writing Rules',
    icon: '📐',
    content: [
      'Lead with the technical problem or insight.',
      'Short-to-medium sentences, high information density.',
      'Use numbers, benchmarks, concrete examples liberally.',
      'Include code snippets, architecture diagrams, repo links.',
      'Highlight trade-offs, failure modes, mitigation strategies.',
      'First person for own work: "I built...", "In VAOS..."',
      'Lowercase casually for X/Twitter. Uppercase only for emphasis.',
      'No emojis unless intentionally casual.',
    ],
  },
  {
    id: 'structure',
    title: 'Post Structure',
    icon: '🏗',
    content: [
      '1. Hook — sharp claim / technical problem. No warm-up.',
      '2. Context — why the problem matters.',
      '3. Breakdown — architecture, bullets, diagrams.',
      '4. Trade-offs — what breaks, what is expensive.',
      '5. Closer — repo link, open question, next step.',
    ],
  },
  {
    id: 'pillars',
    title: 'Content Pillars',
    icon: '🏛',
    content: [
      'Agent Survival — long-horizon coherence, collapse, recovery loops.',
      'VAOS / Epistemic Infrastructure — claim tracking, evidence, adversarial verification.',
      'Elixir/OTP for AI — actor model, supervision trees, fault tolerance.',
      'AI Factory / Media Production — video pipelines, prompt compilers, entity consistency.',
      'Contrarian Commentary — benchmark blind spots, context window worship, tool-use theater.',
    ],
  },
  {
    id: 'hooks',
    title: 'Hook Formulas',
    icon: '🎣',
    content: [
      'Agent Survival: "[Benchmark] is not enough. The real question is whether the agent survives..."',
      'Distributed Systems: "People keep treating [problem] like a prompt problem."',
      'Elixir/OTP: "The BEAM solved [problem] before AI agents made it fashionable."',
      'VAOS: "In VAOS, [claim/tool] is not trusted by default. It has to survive verification."',
      'Contrarian: "The uncomfortable truth about [trend]: [sharp claim]."',
    ],
  },
  {
    id: 'use',
    title: 'Terms to Use',
    icon: '✅',
    content: [
      'distributed systems, orchestration, supervision, fault tolerance',
      'agent survival, epistemic governance, evidence ledger',
      'adversarial verification, long-horizon coherence, tool routing',
      'claim tracking, state collapse, context drift, recovery loops',
      'process isolation, actor model, supervision tree',
      'partial failure, degraded mode, retry budget',
      'signal classification, memory pressure, epistemic uncertainty',
    ],
  },
  {
    id: 'avoid',
    title: 'Terms to Avoid',
    icon: '🚫',
    content: [
      'game-changer, unlock, leverage, revolutionary, disruptive',
      'seamless, cutting-edge, next-gen, AI-powered everything',
      'future of work, magic, "just prompt it"',
      '10x productivity, autonomous employee, "AGI soon"',
      '"agents will replace everyone", "all you need is this prompt"',
    ],
  },
  {
    id: 'phrases',
    title: 'Signature Phrases',
    icon: '💬',
    content: [
      'not a chatbot — a system',
      'agents need supervision, not vibes',
      'prompting is the interface; orchestration is the system',
      'epistemics is the survival layer',
      'benchmark success is not production survival',
      'long context is not state management',
      'hallucination is often a missing ledger problem',
      'the BEAM was built for this kind of chaos',
      'if it cannot recover, it is not autonomous',
      'demos are easy; durable trajectories are hard',
      'agents fail like distributed systems fail: partially, weirdly, and late',
    ],
  },
  {
    id: 'thread',
    title: 'Thread Format',
    icon: '🧵',
    content: [
      '[HOOK]',
      '',
      '1/ [First point]',
      '2/ [Second point]',
      '3/ [Technical breakdown]',
      '4/ [Failure mode]',
      '5/ [Architecture / example]',
      '6/ [Lesson / closer]',
      '',
      'Use fewer posts when the idea is simple.',
      'Never stretch a thread just to look like a thread.',
    ],
  },
];

export default function StyleGuideView() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Style Guide
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            STRAUGHTERG
          </span>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {SECTIONS.length} sections
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {SECTIONS.map(section => {
            const isOpen = activeSection === section.id;
            return (
              <div
                key={section.id}
                className="rounded-lg overflow-hidden transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${isOpen ? 'var(--accent-dim)' : 'var(--border)'}`,
                }}
              >
                <button
                  onClick={() => setActiveSection(isOpen ? null : section.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{section.icon}</span>
                    <span className="text-[12px] font-bold" style={{ color: isOpen ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {section.title}
                    </span>
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {section.content.length} items {isOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-1.5">
                    {section.content.map((line, i) => (
                      <div key={i} className="text-[12px] leading-relaxed pl-7" style={{
                        color: section.id === 'avoid' ? '#fca5a5' : 'var(--text-secondary)',
                      }}>
                        {line || '\u00A0'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
