import React, { useState } from "react";

export default function WorkflowInspector({
  title = "Conductor Workflow Execution Trace",
  workflowId,
  workflowName,
  status,
  conductorExecutionUrl,
  taskTimeline = [],
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!workflowId) return null;

  return (
    <div className="workflow-inspector" data-testid="workflow-inspector">
      <div className="workflow-inspector-top">
        <div>
          <div className="wf-eyebrow">⚡ REAL CONDUCTOR WORKFLOW EXECUTION</div>
          <div className="wf-id-line">
            <span className="wf-name-badge">{workflowName || "conductor_workflow"}</span>
            <code className="wf-id-code">{workflowId}</code>
            <span
              className={`wf-status-pill status-${String(
                status || "COMPLETED"
              ).toLowerCase()}`}
            >
              {status || "COMPLETED"}
            </span>
          </div>
        </div>
        <div className="wf-actions">
          {conductorExecutionUrl && (
            <a
              href={conductorExecutionUrl}
              target="_blank"
              rel="noreferrer"
              className="wf-ui-link"
            >
              Open in Conductor UI ↗
            </a>
          )}
          {taskTimeline.length > 0 && (
            <button
              type="button"
              className="wf-toggle-btn"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? "Hide Task Trace ▲"
                : `Inspect ${taskTimeline.length} Conductor Tasks ▼`}
            </button>
          )}
        </div>
      </div>

      {expanded && taskTimeline.length > 0 && (
        <div className="wf-timeline-list">
          <div className="wf-timeline-caption">{title}</div>
          {taskTimeline.map((task, idx) => (
            <div
              key={`${task.taskId || task.referenceTaskName}-${idx}`}
              className="wf-task-row"
            >
              <span className="wf-step-num">#{idx + 1}</span>
              <span className="wf-task-type">{task.taskType}</span>
              <span className="wf-task-ref">{task.referenceTaskName}</span>
              <span className="wf-task-status">{task.status}</span>
              <span className="wf-task-dur">{task.durationMs ?? 0}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
