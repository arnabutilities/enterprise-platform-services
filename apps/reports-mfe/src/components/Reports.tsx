import React from 'react';

export function Reports() {
  return (
    <section className="mfe-page">
      <header>
        <h1>Reports MFE</h1>
        <p>Independent reports experience loaded via Module Federation.</p>
      </header>
      <div className="mfe-panel">
        <p>
          This microfrontend exposes a reports entrypoint that can be composed directly into the
          host shell, avoiding iframe isolation.
        </p>
        <ul>
          <li>Scheduled report delivery</li>
          <li>Live status indicators</li>
          <li>Interactive filtering engine</li>
        </ul>
      </div>
    </section>
  );
}

export default Reports;
