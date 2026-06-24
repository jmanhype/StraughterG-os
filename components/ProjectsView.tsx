'use client';

import { useState, useEffect } from 'react';
import { Session } from '@/lib/sessionStore';

interface Project {
  id: string;
  name: string;
  platform: string;
  format: string;
  status: 'draft' | 'published' | 'scheduled';
  preview: string;
  createdAt: number;
  updatedAt: number;
}

interface ProjectsViewProps {
  sessions: Session[];
  onSwitchSession: (sessionId: string) => void;
  onNewSession: () => void;
}

const STORAGE_KEY = 'sgos-projects';

function loadProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects: Project[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#78350f', text: '#fbbf24' },
  published: { bg: 'var(--accent-dim)', text: 'var(--accent)' },
  scheduled: { bg: '#1e3a5f', text: '#60a5fa' },
};

export default function ProjectsView({ sessions, onSwitchSession, onNewSession }: ProjectsViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState('twitter');
  const [newFormat, setNewFormat] = useState('post');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  const createProject = () => {
    if (!newName.trim()) return;
    const project: Project = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      platform: newPlatform,
      format: newFormat,
      status: 'draft',
      preview: 'No content yet',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [project, ...projects];
    setProjects(updated);
    saveProjects(updated);
    setShowNew(false);
    setNewName('');
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    saveProjects(updated);
  };

  const cycleStatus = (id: string) => {
    const cycle: Project['status'][] = ['draft', 'scheduled', 'published'];
    const updated = projects.map(p => {
      if (p.id !== id) return p;
      const idx = cycle.indexOf(p.status);
      return { ...p, status: cycle[(idx + 1) % cycle.length], updatedAt: Date.now() };
    });
    setProjects(updated);
    saveProjects(updated);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get sessions linked to a project
  const getProjectSessions = (projectId: string) => {
    return sessions.filter(s => s.projectId === projectId);
  };

  // Get unassigned sessions (no project)
  const unassignedSessions = sessions.filter(s => !s.projectId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Projects
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            {projects.length} projects · {sessions.length} sessions
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNewSession}
            className="px-3 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            + New Session
          </button>
          <button
            onClick={() => setShowNew(!showNew)}
            className="px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: showNew ? 'var(--bg-tertiary)' : 'var(--accent)',
              color: showNew ? 'var(--text-secondary)' : '#000',
              border: `1px solid ${showNew ? 'var(--border)' : 'var(--accent)'}`,
            }}
          >
            {showNew ? 'Cancel' : '+ New Project'}
          </button>
        </div>
      </div>

      {/* New Project Form */}
      {showNew && (
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Project Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. VAOS Launch Thread..."
                className="w-full px-3 py-2 rounded text-[12px] outline-none"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                onKeyDown={e => e.key === 'Enter' && createProject()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Platform</label>
              <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="py-2">
                <option value="twitter">X / Twitter</option>
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="newsletter">Newsletter</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Format</label>
              <select value={newFormat} onChange={e => setNewFormat(e.target.value)} className="py-2">
                <option value="post">Post</option>
                <option value="thread">Thread</option>
                <option value="article">Article</option>
              </select>
            </div>
            <button
              onClick={createProject}
              disabled={!newName.trim()}
              className="px-4 py-2 rounded text-[11px] font-bold uppercase transition-all"
              style={{
                background: newName.trim() ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: newName.trim() ? '#000' : 'var(--text-muted)',
                border: 'none',
                cursor: newName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Projects + Sessions */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
          {projects.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 opacity-50">
              <div className="text-3xl mb-3">📁</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No projects yet</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Click "+ New Project" to create one, or start a session directly</p>
            </div>
          ) : (
            projects.map(project => {
              const projectSessions = getProjectSessions(project.id);
              const isExpanded = expandedProject === project.id;
              return (
                <div
                  key={project.id}
                  className="rounded-lg transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${isExpanded ? 'var(--accent-dim)' : 'var(--border)'}`,
                  }}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        {project.name}
                      </h3>
                      <button
                        onClick={e => { e.stopPropagation(); deleteProject(project.id); }}
                        className="text-[10px] px-1.5 py-0.5 rounded opacity-40 hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--danger)', background: 'transparent', border: 'none' }}
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded" style={{
                        background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)',
                      }}>
                        {project.platform}
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded" style={{
                        background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)',
                      }}>
                        {project.format}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); cycleStatus(project.id); }}
                        className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold"
                        style={{
                          background: STATUS_COLORS[project.status].bg,
                          color: STATUS_COLORS[project.status].text,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {project.status}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {projectSessions.length} session{projectSessions.length !== 1 ? 's' : ''} · Updated {formatDate(project.updatedAt)}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Sessions under this project */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: 'var(--border)' }}>
                      {projectSessions.length === 0 ? (
                        <p className="text-[11px] text-center py-2" style={{ color: 'var(--text-muted)' }}>
                          No sessions linked to this project yet
                        </p>
                      ) : (
                        projectSessions.map(session => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between px-3 py-2 rounded transition-all cursor-pointer"
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                            onClick={() => onSwitchSession(session.id)}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] truncate" style={{ color: 'var(--text-primary)' }}>
                                {session.title}
                              </div>
                              <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                                {session.messages.length} msgs · {formatDate(session.updatedAt)}
                              </div>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded ml-2" style={{
                              background: 'var(--accent-dim)', color: 'var(--accent)',
                            }}>
                              Open
                            </span>
                          </div>
                        ))
                      )}
                      <button
                        onClick={() => onNewSession()}
                        className="w-full py-2 rounded text-[10px] uppercase font-bold transition-all"
                        style={{ background: 'var(--bg-primary)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}
                      >
                        + Start new session for this project
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Recent Sessions (unassigned + all) */}
        {sessions.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                All Sessions
              </h3>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {sessions.length} total
              </span>
            </div>
            <div className="space-y-1.5">
              {sessions.slice(0, 15).map(session => {
                const project = projects.find(p => p.id === session.projectId);
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-lg transition-all cursor-pointer"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                    onClick={() => onSwitchSession(session.id)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] truncate" style={{ color: 'var(--text-primary)' }}>
                          {session.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                            {session.messages.length} msgs
                          </span>
                          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                            {formatDate(session.updatedAt)}
                          </span>
                          {project && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                              background: STATUS_COLORS[project.status].bg,
                              color: STATUS_COLORS[project.status].text,
                            }}>
                              {project.name}
                            </span>
                          )}
                          {session.workspace && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                              background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                            }}>
                              {session.workspace.model.split('/').pop()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded ml-3 flex-shrink-0" style={{
                      background: 'var(--accent-dim)', color: 'var(--accent)',
                    }}>
                      Open →
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
