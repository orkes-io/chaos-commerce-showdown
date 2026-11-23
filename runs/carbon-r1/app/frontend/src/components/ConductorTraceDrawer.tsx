import React, { useState } from "react";
import type { WorkflowExecutionTrace } from "../types";

interface ConductorTraceDrawerProps {
  trace: WorkflowExecutionTrace | null;
  onClose: () => void;
}

export const ConductorTraceDrawer: React.FC<ConductorTraceDrawerProps> = ({
  trace,
  onClose
}) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  if (!trace) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="gauntlet-step-tag">LIVE CONDUCTOR WORKFLOW EXECUTION</span>
            <h3 style={{ margin: "0.2rem 0 0 0" }}>
              ⚙️ {trace.workflowName}{" "}
              <span className={`status-pill ${trace.status}`}>{trace.status}</span>
            </h3>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                marginTop: "0.3rem"
              }}
            >
              workflowId: <strong style={{ color: "#fff" }}>{trace.workflowId}</strong> •
              duration: {trace.durationMs}ms •{" "}
              <a
                href={trace.conductorExecutionUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--neon-cyan)" }}
              >
                Open in Conductor UI ↗
              </a>
            </div>
          </div>
          <button type="button" className="close-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginTop: 0 }}>
          Every step below executed directly on the Conductor server ({trace.tasks.length} task
          executions recorded, zero runtime AI API calls). Click any task row to inspect its
          output payload.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table className="trace-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Task Reference</th>
                <th>Conductor Type</th>
                <th>Iter</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {trace.tasks.map((t, idx) => {
                const isExpanded = expandedTaskId === t.taskId;
                return (
                  <React.Fragment key={t.taskId || idx}>
                    <tr
                      style={{ cursor: "pointer" }}
                      onClick={() => setExpandedTaskId(isExpanded ? null : t.taskId)}
                    >
                      <td>{idx + 1}</td>
                      <td>
                        <strong style={{ color: "var(--neon-yellow)" }}>
                          {t.referenceTaskName}
                        </strong>
                      </td>
                      <td>{t.taskType}</td>
                      <td>{t.iteration || "-"}</td>
                      <td>
                        <span className={`status-pill ${t.status}`}>{t.status}</span>
                      </td>
                      <td>{t.durationMs}ms</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{ background: "#0f0b1a" }}>
                          <pre
                            style={{
                              margin: 0,
                              fontSize: "0.74rem",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              color: "#ccf7ff"
                            }}
                          >
                            {JSON.stringify(t.outputPreview, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
