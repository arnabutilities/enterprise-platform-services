'use client';

import { MFELoader } from '@/components/MFELoader';
import { mfeRegistry } from '@/config/mfeRegistry';

export function AnalyticsContainer() {
  const remote = mfeRegistry.analytics;

  return (
    <>
      <MFELoader scope={remote.scope} module={remote.module} remoteUrl={remote.remoteUrl} />
    </>
  );
}
