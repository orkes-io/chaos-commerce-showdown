import React from "react";

export function WorkflowTrace({ trace, title = "Conductor Workflow Execution Trace" }) {
  if (!trace) return null;

  return (
    <div className="trace-box">
      <div className="trace-header">
        <div>
          <strong>⚡ {title}</strong>
          <div style={{ color: "#9ca3af", marginTop: 2 }}>
            Workflow: <span style={{ color: "#fde047" }}>{trace.workflowName}</span> (v
            {trace.workflowVersion || 1}) • ID:{" "}
            <span style={{ color: "#fff" }}>{trace.workflowId}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="trace-status">{trace.status}</span>
          <span>{trace.durationMs}ms</span>
          {trace.conductorUiUrl && (
            <a
              className="trace-link"
              href={trace.conductorUiUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open in Conductor UI ↗
            </a>
          )}
        </div>
      </div>

      <div className="trace-list">
        {(trace.tasks || []).map((t, idx) => (
          <div key={`${t.taskId || idx}`} className="trace-task">
            <div>
              <span className="trace-task-type">{t.taskType}</span>{" "}
              <strong style={{ color: "#fff" }}>{t.referenceTaskName}</strong>
              {t.iteration > 0 && (
                <span style={{ color: "#38bdf8", marginLeft: 6 }}>
                  [iter #{t.iteration}]
                </span>
              )}
            </div>
            <div style={{ color: "#9ca3af" }}>
              <span style={{ color: t.status === "COMPLETED" ? "#4ade80" : "#facc15" }}>
                {t.status}
              </span>{" "}
              • {t.durationMs}ms
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
