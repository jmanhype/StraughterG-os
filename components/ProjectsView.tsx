'use client';

import { useState, useEffect } from 'react';

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

export default function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState('twitter');
  const [newFormat, setNewFormat] = useState('post');

  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  const createProject = () => {
    if (!newName.trim()) return;
    const project: Project = {
      id: Date.now().toString(),
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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Projects
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            {projects.length} total
          </span>
        </div>
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

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <div className="text-3xl mb-3">📁</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No projects yet</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Click "+ New Project" to start</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {projects.map(project => (
              <div
                key={project.id}
                className="p-4 rounded-lg transition-all cursor-pointer"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
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
                <p className="text-[11px] mb-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                  {project.preview}
                </p>
                <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  Updated {formatDate(project.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
