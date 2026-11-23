import React, { useState } from 'react';
import { WorkflowTrace } from './WorkflowTrace';

function formatMoney(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OrdersInspector({ orders = [], returns = [], onRefresh, loading, onStartReturnForOrder }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div>
      <div
        className="panel"
        style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}
      >
        <div>
          <h2 style={{ margin: '0 0 0.25rem' }}>Live Conductor Execution Ledger</h2>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#52525b' }}>
            Every checkout (<code>chaos_checkout_workflow</code>) and every return (<code>chaos_return_workflow</code>)
            is persisted and queried directly from your Conductor server.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : '↻ Refresh From Conductor'}
        </button>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>Completed Checkouts ({orders.length})</h3>
          {orders.length === 0 ? (
            <div className="empty-state">No checkout workflows executed yet. Buy something deeply unwise!</div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {orders.map((ord) => {
                const isOpen = expandedId === ord.workflowId;
                return (
                  <div
                    key={ord.workflowId}
                    style={{
                      border: '2px solid #141414',
                      borderRadius: '9px',
                      padding: '0.85rem',
                      background: '#fffdf5',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <strong>{ord.orderId}</strong>{' '}
                        <span className="review-tag praise">{ord.status}</span>
                        <div style={{ fontSize: '0.82rem', color: '#52525b', marginTop: '0.2rem' }}>
                          {ord.receipt?.customerName || 'Shopper'} • Total:{' '}
                          <strong>{formatMoney(ord.receipt?.grandTotal)}</strong> • {ord.receipt?.courier?.carrier}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                          onClick={() => setExpandedId(isOpen ? null : ord.workflowId)}
                        >
                          {isOpen ? 'Hide Tasks' : 'Inspect Tasks'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                          onClick={() => onStartReturnForOrder(ord)}
                        >
                          Return →
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <WorkflowTrace
                        workflowId={ord.workflowId}
                        workflowName={ord.workflowName}
                        status={ord.status}
                        executionTimeMs={ord.executionTimeMs}
                        tasks={ord.tasks}
                        conductorUiUrl={ord.conductorUiUrl}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Return Decisions ({returns.length})</h3>
          {returns.length === 0 ? (
            <div className="empty-state">No return workflows executed yet. Try the Returns Bureaucracy Gauntlet!</div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {returns.map((ret) => {
                const isOpen = expandedId === ret.workflowId;
                const dec = ret.decision?.decision || 'DECIDED';
                return (
                  <div
                    key={ret.workflowId}
                    style={{
                      border: '2px solid #141414',
                      borderRadius: '9px',
                      padding: '0.85rem',
                      background: '#fffdf5',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <strong>{ret.returnId}</strong>{' '}
                        <span className={`review-tag ${dec === 'DENIED' ? 'fury' : 'praise'}`}>{dec}</span>
                        <div style={{ fontSize: '0.82rem', color: '#52525b', marginTop: '0.2rem' }}>
                          Order {ret.orderId} • Score: <strong>{ret.decision?.bureaucracyScore}/100</strong> • Refund:{' '}
                          <strong>{formatMoney(ret.decision?.outcome?.refundAmount)}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                        onClick={() => setExpandedId(isOpen ? null : ret.workflowId)}
                      >
                        {isOpen ? 'Hide Tasks' : 'Inspect Tasks'}
                      </button>
                    </div>

                    {isOpen && (
                      <WorkflowTrace
                        workflowId={ret.workflowId}
                        workflowName={ret.workflowName}
                        status={ret.status}
                        executionTimeMs={ret.executionTimeMs}
                        tasks={ret.tasks}
                        conductorUiUrl={ret.conductorUiUrl}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
