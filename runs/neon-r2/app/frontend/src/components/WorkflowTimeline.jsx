import React from "react";
import { CheckCircle2, Clock, ExternalLink, Loader2, Workflow, XCircle } from "lucide-react";

function summarizeTaskOutput(task) {
  const out = task.outputData || {};
  if (out.feeAuditorNote) return out.feeAuditorNote;
  if (out.warehouseNote) return out.warehouseNote;
  if (out.billingNote) return out.billingNote;
  if (out.dispatchNote) return `${out.carrier}: ${out.dispatchNote}`;
  if (out.absurdFinding) return `${out.department}: ${out.absurdFinding} (Score: ${out.score}/100)`;
  if (out.stampAction) return `Round ${out.round} — ${out.desk}: ${out.stampAction}`;
  if (out.decreeHeadline) return out.decreeHeadline;
  if (out.promoNote) return `Subtotal $${Number(out.subtotal || 0).toFixed(2)} • ${out.promoNote}`;
  if (out.grievanceStatus) return `Opened ${out.returnId} for order ${out.orderId}`;
  if (out.result && typeof out.result === "object") {
    if (out.result.grandTotal !== undefined) {
      return `JQ Totaled: $${Number(out.result.grandTotal).toFixed(2)} (${out.result.feeCount} hidden fees)`;
    }
    if (out.result.verdictCode) {
      return `JQ Score: ${out.result.totalScore}/400 (${out.result.passedCount}/4 checks passed) → ${out.result.verdictCode}`;
    }
  }
  if (out.certificateTitle) return `${out.certificateTitle} — Grand Total $${Number(out.grandTotal || 0).toFixed(2)}`;
  if (out.decisionLabel) return `Final Decree Sealed: ${out.decisionLabel}`;
  return "";
}

function StatusIcon({ status }) {
  if (status === "COMPLETED") return <CheckCircle2 size={16} className="wf-icon-ok" />;
  if (status === "FAILED" || status === "FAILED_WITH_TERMINAL_ERROR" || status === "TIMED_OUT") {
    return <XCircle size={16} className="wf-icon-fail" />;
  }
  if (status === "IN_PROGRESS" || status === "SCHEDULED") {
    return <Loader2 size={16} className="wf-icon-spin" />;
  }
  return <Clock size={16} />;
}

export default function WorkflowTimeline({ execution, title = "Live Conductor Workflow Execution" }) {
  if (!execution) return null;

  const isTerminal = ["COMPLETED", "FAILED", "TIMED_OUT", "TERMINATED"].includes(execution.status);
  const visibleTasks = (execution.tasks || []).filter(
    (t) => !["SET_VARIABLE", "FORK", "JOIN"].includes(t.taskType)
  );

  return (
    <div className="wf-box">
      <div className="wf-header">
        <div className="wf-title-row">
          <Workflow size={18} />
          <strong>{title}</strong>
          <span className={`wf-status-pill wf-status-${String(execution.status || "RUNNING").toLowerCase()}`}>
            {!isTerminal && <Loader2 size={12} className="wf-icon-spin" />}
            {execution.status || "RUNNING"}
          </span>
        </div>
        {execution.conductorUiUrl && (
          <a
            href={execution.conductorUiUrl}
            target="_blank"
            rel="noreferrer"
            className="wf-ui-link"
          >
            Inspect in Conductor UI <ExternalLink size={13} />
          </a>
        )}
      </div>

      <div className="wf-meta">
        <span>
          Workflow: <code>{execution.workflowName}</code>
        </span>
        <span>
          Execution ID: <code>{execution.workflowId}</code>
        </span>
        {execution.durationMs > 0 && <span>Duration: {execution.durationMs}ms</span>}
      </div>

      <div className="wf-task-list">
        {visibleTasks.length === 0 && (
          <div className="wf-task-row">
            <Loader2 size={15} className="wf-icon-spin" />
            <span>Dispatching workflow tasks to Conductor workers...</span>
          </div>
        )}
        {visibleTasks.map((task) => {
          const note = summarizeTaskOutput(task);
          return (
            <div key={task.taskId || `${task.referenceTaskName}-${task.iteration}`} className="wf-task-row">
              <StatusIcon status={task.status} />
              <div className="wf-task-body">
                <div className="wf-task-top">
                  <span className="wf-task-name">
                    {task.taskDefName || task.referenceTaskName}
                    {task.iteration > 0 ? ` (Round #${task.iteration})` : ""}
                  </span>
                  <span className="wf-task-type">{task.taskType}</span>
                  <span className={`wf-task-state wf-state-${String(task.status).toLowerCase()}`}>
                    {task.status}
                  </span>
                  {task.durationMs > 0 && <span className="wf-task-ms">{task.durationMs}ms</span>}
                </div>
                {note && <p className="wf-task-note">{note}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
