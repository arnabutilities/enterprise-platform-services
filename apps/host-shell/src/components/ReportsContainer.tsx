'use client';

import { MFELoader } from '@/components/MFELoader';
import { mfeRegistry } from '@/config/mfeRegistry';

export function ReportsContainer() {
  const remote = mfeRegistry.reports;

  return (
    <section className="reports-mfe-wrapper">
      <div className="mfe-info">
        <h2>Reports Microfrontend</h2>
        <p>Loaded from: {remote.remoteUrl}</p>
        <div className="mfe-features">
          <ul>
            <li>Real-time report streaming</li>
            <li>Incremental data rendering</li>
            <li>Virtualized table performance</li>
          </ul>
        </div>
      </div>
      <div className="mfe-loader">
        <MFELoader scope={remote.scope} module={remote.module} remoteUrl={remote.remoteUrl} />
      </div>
    </section>
  );
}
