import React from 'react';

export function WorkflowTrace({ workflowId, workflowName, status, executionTimeMs, tasks = [], conductorUiUrl }) {
  if (!workflowId) return null;

  return (
    <div className="wf-trace" data-testid="conductor-workflow-trace">
      <div className="wf-trace-header">
        <div>
          <strong>Conductor Execution:</strong> <code>{workflowName || 'workflow'}</code>
          <div style={{ fontSize: '0.73rem', opacity: 0.85, marginTop: '0.15rem' }}>
            ID: <code>{workflowId}</code>
            {typeof executionTimeMs === 'number' ? ` • ${executionTimeMs} ms` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span className="wf-badge">{status || 'COMPLETED'}</span>
          {conductorUiUrl && (
            <a href={conductorUiUrl} target="_blank" rel="noreferrer" className="wf-link">
              Open in Conductor UI ↗
            </a>
          )}
        </div>
      </div>

      {tasks.length > 0 && (
        <div>
          {tasks.map((t, idx) => (
            <div className="wf-task-row" key={t.taskId || `${t.referenceTaskName}-${idx}`}>
              <span>
                <strong>{t.referenceTaskName}</strong>
                {t.iteration ? ` (round #${t.iteration})` : ''}
              </span>
              <span style={{ color: '#93c5fd' }}>{t.taskType}</span>
              <span style={{ color: t.status === 'COMPLETED' ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                {t.status}
              </span>
              <span style={{ opacity: 0.75 }}>{t.durationMs} ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
