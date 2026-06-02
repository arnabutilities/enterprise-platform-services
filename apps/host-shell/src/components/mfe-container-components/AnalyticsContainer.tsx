'use client';

import { MFELoader } from '@/components/MFELoader';
import { mfeRegistry } from '@/config/mfeRegistry';

export function AnalyticsContainer() {
  const remote = mfeRegistry.analytics;

  return (
    <section className="analytics-mfe-wrapper">
      <div className="mfe-info">
        <h2>Configure Analytics</h2>
        <p>Loaded from: {remote.remoteUrl}</p>
        <div className="mfe-features">
          <ul>
            <li>Date range and metric selection</li>
            <li>Real-time filter publishing</li>
            <li>Event-driven architecture</li>
          </ul>
        </div>
      </div>
      <div className="mfe-loader">
        <MFELoader scope={remote.scope} module={remote.module} remoteUrl={remote.remoteUrl} />
      </div>
    </section>
  );
}
