import React, { useState } from "react";

export default function WorkflowTraceCard({ execution, title }) {
  const [expandedTask, setExpandedTask] = useState(null);

  if (!execution) return null;

  const tasks = Array.isArray(execution.tasks) ? execution.tasks : [];

  return (
    <div className="wf-trace-card" data-testid="workflow-trace-card">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem",
          borderBottom: "1px solid #393452",
          paddingBottom: "0.6rem"
        }}
      >
        <div>
          <div style={{ color: "#ffe135", fontWeight: 900, fontSize: "0.9rem" }}>
            ⚙️ {title || "Conductor Workflow Execution"}
          </div>
          <div style={{ color: "#cbd5e1", fontSize: "0.75rem", marginTop: "0.15rem" }}>
            Workflow: <strong>{execution.workflowName}</strong> • ID:{" "}
            <code>{execution.workflowId}</code>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span className="wf-status-ok">● {execution.status}</span>
          <span style={{ color: "#94a3b8" }}>({execution.durationMs}ms)</span>
          {execution.conductorUiExecutionUrl && (
            <a
              href={execution.conductorUiExecutionUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#141218",
                background: "#ffe135",
                padding: "0.2rem 0.5rem",
                fontWeight: 800,
                textDecoration: "none",
                fontSize: "0.73rem"
              }}
            >
              Open in Conductor UI ↗
            </a>
          )}
        </div>
      </div>

      <div style={{ marginTop: "0.55rem" }}>
        <div style={{ color: "#94a3b8", fontSize: "0.73rem", marginBottom: "0.35rem" }}>
          Executed {tasks.length} orchestrated Conductor tasks (click any task to inspect output):
        </div>
        {tasks.map((task, idx) => {
          const key = `${task.taskId || idx}`;
          const isOpen = expandedTask === key;
          return (
            <div key={key}>
              <div
                className="wf-step-row"
                style={{ cursor: "pointer" }}
                onClick={() => setExpandedTask(isOpen ? null : key)}
              >
                <span className="wf-type-pill">{task.taskType}</span>
                <div>
                  <strong style={{ color: "#f8fafc" }}>{task.referenceTaskName}</strong>
                  {task.iteration > 0 && (
                    <span style={{ color: "#ffe135", marginLeft: "0.4rem" }}>
                      (iter #{task.iteration})
                    </span>
                  )}
                </div>
                <span className="wf-status-ok">
                  {task.status} {isOpen ? "▾" : "▸"}
                </span>
              </div>
              {isOpen && (
                <pre
                  style={{
                    margin: "0 0 0.4rem",
                    padding: "0.6rem",
                    background: "#0f0d17",
                    color: "#a5f3fc",
                    fontSize: "0.72rem",
                    overflowX: "auto",
                    border: "1px solid #393452"
                  }}
                >
                  {JSON.stringify(task.outputData || {}, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
