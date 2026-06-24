'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';

export class NavErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SGOS NavError]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
          <div className="text-center max-w-md">
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Something went wrong</h2>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>{this.state.error?.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-4 py-2 rounded text-[11px] font-bold uppercase"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
