import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/audit-log', { params: { limit: 100 } })
      .then(r => setLogs(r.data))
      .finally(() => setLoading(false))
  }, [])

  const actionColor = {
    LOGIN: 'success', LOGOUT: 'gray', DEPOSIT: 'success', WITHDRAWAL: 'danger',
    ACCOUNT_CREATED: 'info', TRANSFER: 'info'
  }

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 style={{fontSize:24,fontWeight:800}}>🔍 Audit Log</h1>
        <div style={{color:'#6b7280',fontSize:13}}>Last 100 system events</div>
      </div>

      <div className="card">
        <div className="card-header"><h3>System Activity Log</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-center"><div className="spinner"></div></div> : (
            <table>
              <thead><tr><th>Timestamp</th><th>Action</th><th>User</th><th>Account</th><th>Amount</th><th>IP Address</th></tr></thead>
              <tbody>
                {logs.length === 0
                  ? <tr><td colSpan={6}><div className="empty-state"><div className="empty-icon">🔍</div><p>No audit logs</p></div></td></tr>
                  : logs.map(l => (
                  <tr key={l._id}>
                    <td style={{fontSize:12,color:'#6b7280',whiteSpace:'nowrap'}}>{l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN') : '-'}</td>
                    <td><span className={`badge badge-${actionColor[l.action]||'info'}`}>{l.action}</span></td>
                    <td style={{fontWeight:600,fontSize:13}}>{l.username || l.performed_by || '-'}</td>
                    <td style={{fontFamily:'monospace',fontSize:12}}>{l.account_number || '-'}</td>
                    <td style={{fontWeight:600}}>{l.amount ? `₹${l.amount.toLocaleString('en-IN')}` : '-'}</td>
                    <td style={{fontSize:12,color:'#9ca3af'}}>{l.ip || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
