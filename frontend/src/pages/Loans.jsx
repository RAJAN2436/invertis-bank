import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const INIT = { account_number: '', loan_type: 'personal', amount: '', tenure_months: '12', purpose: '', collateral: '' }

export default function Loans() {
  const [loans, setLoans] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showApply, setShowApply] = useState(false)
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [emiPreview, setEmiPreview] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [l, s] = await Promise.all([
        api.get('/loans/', { params: { status: filterStatus } }),
        api.get('/loans/stats')
      ])
      setLoans(l.data.loans)
      setStats(s.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus])

  const calcEMI = () => {
    const p = parseFloat(form.amount) || 0
    const t = parseInt(form.tenure_months) || 12
    const rates = { personal: 12.5, home: 8.5, car: 9.5, education: 10.0, business: 14.0, gold: 7.5 }
    const r = (rates[form.loan_type] || 12) / (12 * 100)
    if (p <= 0) return
    const emi = r === 0 ? p / t : p * r * Math.pow(1 + r, t) / (Math.pow(1 + r, t) - 1)
    setEmiPreview({ emi: emi.toFixed(2), total: (emi * t).toFixed(2), interest: (emi * t - p).toFixed(2), rate: rates[form.loan_type] || 12 })
  }

  useEffect(() => { if (form.amount && form.tenure_months) calcEMI() }, [form.amount, form.tenure_months, form.loan_type])

  const handleApply = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/loans/apply', form)
      toast.success(`Loan ${res.data.loan_id} applied! EMI: ${fmt(res.data.emi_amount)}/month`)
      setShowApply(false)
      setForm(INIT)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const handleApprove = async (loan_id, action, reason = '') => {
    try {
      await api.put(`/loans/${loan_id}/approve`, { action, reason })
      toast.success(action === 'approve' ? 'Loan approved!' : 'Loan rejected')
      setSelected(null)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const handleDisburse = async (loan_id) => {
    try {
      const res = await api.put(`/loans/${loan_id}/disburse`)
      toast.success(res.data.message)
      setSelected(null)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const handleRepay = async (loan_id) => {
    try {
      const res = await api.post(`/loans/${loan_id}/repay`)
      toast.success(res.data.message)
      setSelected(null)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const statusColor = { pending: 'warning', approved: 'success', rejected: 'danger', disbursed: 'info', closed: 'gray' }
  const loanTypeIcons = { personal: '👤', home: '🏠', car: '🚗', education: '🎓', business: '💼', gold: '🥇' }

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 style={{fontSize:24,fontWeight:800}}>📋 Loan Management</h1>
        <button className="btn btn-primary" onClick={()=>setShowApply(true)}>+ New Loan Application</button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:14,marginBottom:22}}>
        {[
          ['Total',stats.total,'gray'],['Pending',stats.pending,'warning'],['Approved',stats.approved,'success'],
          ['Disbursed',stats.disbursed,'info'],['Closed',stats.closed,'gray'],
        ].map(([l,v,c])=>(
          <div key={l} className="card" style={{padding:14,textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:800}}>{v||0}</div>
            <div style={{fontSize:11,color:'#6b7280'}}>{l}</div>
          </div>
        ))}
        <div className="card" style={{padding:14,textAlign:'center'}}>
          <div style={{fontSize:18,fontWeight:800,color:'#7c3aed'}}>{fmt(stats.total_loan_amount)}</div>
          <div style={{fontSize:11,color:'#6b7280'}}>Total Amount</div>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-4">
        <div className="card-body" style={{paddingTop:12,paddingBottom:12}}>
          <div style={{display:'flex',gap:10}}>
            <select className="form-control" style={{width:160}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="disbursed">Disbursed</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><h3>All Loans ({loans.length})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-center"><div className="spinner"></div></div> : (
            <table>
              <thead><tr><th>Loan ID</th><th>Customer</th><th>Type</th><th>Amount</th><th>EMI</th><th>Rate</th><th>Tenure</th><th>Status</th><th>Applied</th><th>Actions</th></tr></thead>
              <tbody>
                {loans.length === 0
                  ? <tr><td colSpan={10}><div className="empty-state"><div className="empty-icon">📋</div><p>No loans found</p></div></td></tr>
                  : loans.map(l => (
                  <tr key={l._id}>
                    <td style={{fontSize:12,fontFamily:'monospace'}}>{l.loan_id}</td>
                    <td><div style={{fontWeight:600}}>{l.customer_name}</div><div style={{fontSize:11,color:'#6b7280'}}>{l.account_number}</div></td>
                    <td>{loanTypeIcons[l.loan_type]} <span style={{textTransform:'capitalize'}}>{l.loan_type}</span></td>
                    <td style={{fontWeight:700}}>{fmt(l.amount)}</td>
                    <td style={{fontWeight:600,color:'#1a56db'}}>{fmt(l.emi_amount)}/mo</td>
                    <td>{l.interest_rate}%</td>
                    <td>{l.tenure_months} mo</td>
                    <td><span className={`badge badge-${statusColor[l.status]||'gray'}`} style={{textTransform:'capitalize'}}>{l.status}</span></td>
                    <td style={{fontSize:11,color:'#9ca3af'}}>{l.applied_at ? new Date(l.applied_at).toLocaleDateString('en-IN') : '-'}</td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={()=>setSelected(l)}>Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {showApply && (
        <div className="modal-overlay" onClick={()=>setShowApply(false)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h3>📋 New Loan Application</h3><button className="modal-close" onClick={()=>setShowApply(false)}>✕</button></div>
            <form onSubmit={handleApply}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group"><label className="form-label">Account Number *</label><input className="form-control" value={form.account_number} onChange={e=>setForm({...form,account_number:e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Loan Type *</label>
                    <select className="form-control" value={form.loan_type} onChange={e=>setForm({...form,loan_type:e.target.value})}>
                      <option value="personal">👤 Personal Loan (12.5%)</option>
                      <option value="home">🏠 Home Loan (8.5%)</option>
                      <option value="car">🚗 Car Loan (9.5%)</option>
                      <option value="education">🎓 Education Loan (10.0%)</option>
                      <option value="business">💼 Business Loan (14.0%)</option>
                      <option value="gold">🥇 Gold Loan (7.5%)</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Loan Amount (₹) *</label><input type="number" className="form-control" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} min="1000" required /></div>
                  <div className="form-group"><label className="form-label">Tenure (Months) *</label>
                    <select className="form-control" value={form.tenure_months} onChange={e=>setForm({...form,tenure_months:e.target.value})}>
                      {[6,12,18,24,36,48,60,84,120,180,240].map(m => <option key={m} value={m}>{m} months ({(m/12).toFixed(1)} years)</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Purpose *</label><textarea className="form-control" rows={2} value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Collateral (if any)</label><input className="form-control" value={form.collateral} onChange={e=>setForm({...form,collateral:e.target.value})} /></div>

                {emiPreview && (
                  <div style={{background:'linear-gradient(135deg,#ebf5ff,#dbeafe)',borderRadius:12,padding:16,border:'1px solid #bfdbfe'}}>
                    <div style={{fontWeight:700,marginBottom:10,color:'#1e40af'}}>📊 EMI Preview</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,textAlign:'center'}}>
                      <div><div style={{fontSize:18,fontWeight:800,color:'#1a56db'}}>{fmt(emiPreview.emi)}</div><div style={{fontSize:11,color:'#6b7280'}}>Monthly EMI</div></div>
                      <div><div style={{fontSize:18,fontWeight:800}}>{emiPreview.rate}%</div><div style={{fontSize:11,color:'#6b7280'}}>Interest Rate</div></div>
                      <div><div style={{fontSize:18,fontWeight:800,color:'#e02424'}}>{fmt(emiPreview.interest)}</div><div style={{fontSize:11,color:'#6b7280'}}>Total Interest</div></div>
                      <div><div style={{fontSize:18,fontWeight:800}}>{fmt(emiPreview.total)}</div><div style={{fontSize:11,color:'#6b7280'}}>Total Payable</div></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={()=>setShowApply(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit Application'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Modal */}
      {selected && (
        <div className="modal-overlay" onClick={()=>setSelected(null)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h3>📋 Loan: {selected.loan_id}</h3><button className="modal-close" onClick={()=>setSelected(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                {[
                  ['Customer', selected.customer_name], ['Account', selected.account_number],
                  ['Type', selected.loan_type], ['Amount', fmt(selected.amount)],
                  ['EMI', `${fmt(selected.emi_amount)}/month`], ['Rate', `${selected.interest_rate}%`],
                  ['Tenure', `${selected.tenure_months} months`], ['Outstanding', fmt(selected.outstanding_amount)],
                  ['Paid EMIs', `${selected.paid_emis || 0} / ${selected.tenure_months}`],
                  ['Status', selected.status],
                ].map(([k,v]) => (
                  <div key={k} style={{background:'#f8faff',borderRadius:8,padding:10}}>
                    <div style={{fontSize:11,color:'#6b7280'}}>{k}</div>
                    <div style={{fontWeight:600,textTransform:'capitalize'}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:13,color:'#6b7280',marginBottom:12}}>Purpose: {selected.purpose}</div>

              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                {selected.status === 'pending' && <>
                  <button className="btn btn-success" onClick={()=>handleApprove(selected.loan_id,'approve')}>✅ Approve</button>
                  <button className="btn btn-danger" onClick={()=>handleApprove(selected.loan_id,'reject')}>❌ Reject</button>
                </>}
                {selected.status === 'approved' && <button className="btn btn-primary" onClick={()=>handleDisburse(selected.loan_id)}>💰 Disburse Loan</button>}
                {(selected.status === 'disbursed') && selected.outstanding_amount > 0 && <button className="btn btn-success" onClick={()=>handleRepay(selected.loan_id)}>💳 Pay EMI ({fmt(selected.emi_amount)})</button>}
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setSelected(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
