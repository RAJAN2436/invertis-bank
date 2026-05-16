import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import api from '../api/axios'

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [chartData, setChartData] = useState([])
  const [activity, setActivity] = useState({ recent_transactions: [], recent_loans: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/dashboard/chart-data'),
      api.get('/dashboard/recent-activity')
    ]).then(([s, c, a]) => {
      setSummary(s.data)
      setChartData(c.data)
      setActivity(a.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>

  const stats = [
    { label: 'Total Accounts', value: summary?.total_accounts || 0, icon: '🏦', color: 'blue', change: `${summary?.active_accounts || 0} active` },
    { label: 'Total Deposits', value: fmt(summary?.total_deposits), icon: '💰', color: 'green', change: `${fmt(summary?.deposits_today?.total)} today` },
    { label: 'Total Customers', value: summary?.total_customers || 0, icon: '👥', color: 'purple', change: 'Registered customers' },
    { label: 'Active Loans', value: summary?.total_loans || 0, icon: '📋', color: 'orange', change: `${summary?.pending_loans || 0} pending` },
  ]

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 style={{fontSize:24,fontWeight:800}}>📊 Dashboard Overview</h1>
        <div style={{color:'#6b7280',fontSize:13}}>Real-time bank operations</div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-change">{s.change}</div>
          </div>
        ))}
      </div>

      {/* Today's Ops */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:18,marginBottom:24}}>
        <div className="card">
          <div className="card-body" style={{textAlign:'center'}}>
            <div style={{fontSize:13,color:'#6b7280',marginBottom:4}}>💚 Deposits Today</div>
            <div style={{fontSize:24,fontWeight:800,color:'#0e9f6e'}}>{fmt(summary?.deposits_today?.total)}</div>
            <div style={{fontSize:12,color:'#6b7280'}}>{summary?.deposits_today?.count || 0} transactions</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{textAlign:'center'}}>
            <div style={{fontSize:13,color:'#6b7280',marginBottom:4}}>🔴 Withdrawals Today</div>
            <div style={{fontSize:24,fontWeight:800,color:'#e02424'}}>{fmt(summary?.withdrawals_today?.total)}</div>
            <div style={{fontSize:12,color:'#6b7280'}}>{summary?.withdrawals_today?.count || 0} transactions</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{textAlign:'center'}}>
            <div style={{fontSize:13,color:'#6b7280',marginBottom:4}}>📋 Total Loan Amount</div>
            <div style={{fontSize:24,fontWeight:800,color:'#7c3aed'}}>{fmt(summary?.total_loan_amount)}</div>
            <div style={{fontSize:12,color:'#6b7280'}}>{summary?.pending_loans || 0} pending review</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:20,marginBottom:24}}>
        <div className="card">
          <div className="card-header"><h3>📈 7-Day Transaction Trend</h3></div>
          <div className="card-body" style={{paddingTop:8}}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a56db" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1a56db" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="wit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e02424" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#e02424" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:11}} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Area type="monotone" dataKey="deposits" name="Deposits" stroke="#1a56db" fill="url(#dep)" strokeWidth={2} />
                <Area type="monotone" dataKey="withdrawals" name="Withdrawals" stroke="#e02424" fill="url(#wit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>🏦 Account Types</h3></div>
          <div className="card-body" style={{paddingTop:8}}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                {name:'Savings', value: summary?.savings || 0},
                {name:'Current', value: summary?.current || 0},
                {name:'FD', value: summary?.fixed_deposit || 0},
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" tick={{fontSize:12}}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip/>
                <Bar dataKey="value" name="Accounts" fill="#1a56db" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:20}}>
        <div className="card">
          <div className="card-header"><h3>🔄 Recent Transactions</h3></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Account</th><th>Type</th><th>Amount</th><th>Time</th></tr></thead>
              <tbody>
                {activity.recent_transactions.length === 0
                  ? <tr><td colSpan={4} className="text-center" style={{color:'#9ca3af',padding:20}}>No transactions yet</td></tr>
                  : activity.recent_transactions.map(t => (
                  <tr key={t._id}>
                    <td><div className="font-mono" style={{fontSize:12}}>{t.account_number}</div><div style={{fontSize:11,color:'#6b7280'}}>{t.customer_name}</div></td>
                    <td><span className={`badge badge-${t.type==='credit'?'success':'danger'}`}>{t.type === 'credit' ? '↑ Credit' : '↓ Debit'}</span></td>
                    <td style={{fontWeight:700,color:t.type==='credit'?'#0e9f6e':'#e02424'}}>{fmt(t.amount)}</td>
                    <td style={{fontSize:11,color:'#9ca3af'}}>{new Date(t.timestamp).toLocaleTimeString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>📋 Pending Loans</h3></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Loan ID</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {activity.recent_loans.length === 0
                  ? <tr><td colSpan={4} className="text-center" style={{color:'#9ca3af',padding:20}}>No loans yet</td></tr>
                  : activity.recent_loans.map(l => (
                  <tr key={l._id}>
                    <td><div style={{fontSize:12,fontWeight:600}}>{l.loan_id}</div><div style={{fontSize:11,color:'#6b7280'}}>{l.customer_name}</div></td>
                    <td style={{textTransform:'capitalize',fontSize:13}}>{l.loan_type}</td>
                    <td style={{fontWeight:700}}>{fmt(l.amount)}</td>
                    <td>
                      <span className={`badge badge-${l.status==='pending'?'warning':l.status==='approved'||l.status==='disbursed'?'success':'danger'}`} style={{textTransform:'capitalize'}}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
