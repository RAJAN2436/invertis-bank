import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const INIT = {
  customer_name: '', account_type: 'savings', email: '', phone: '',
  address: '', dob: '', id_proof_type: 'aadhaar', id_proof_number: '',
  initial_deposit: '', nominee: ''
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [stats, setStats] = useState({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showBalance, setShowBalance] = useState(false)
  const [balanceResult, setBalanceResult] = useState(null)
  const [balanceAcc, setBalanceAcc] = useState('')
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const [selectedAcc, setSelectedAcc] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [r, s] = await Promise.all([
        api.get('/accounts/', { params: { search, type: filterType, status: filterStatus } }),
        api.get('/accounts/stats')
      ])
      setAccounts(r.data.accounts)
      setTotal(r.data.total)
      setStats(s.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, filterType, filterStatus])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/accounts/', form)
      toast.success(`Account ${res.data.account_number} created!`)
      setShowCreate(false)
      setForm(INIT)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create account')
    } finally { setSaving(false) }
  }

  const handleBalance = async () => {
    if (!balanceAcc) return
    try {
      const res = await api.get(`/accounts/balance/${balanceAcc}`)
      setBalanceResult(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Account not found')
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/accounts/${id}/status`, { status })
      toast.success(`Account ${status}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed')
    }
  }

  const statusColor = { active: 'success', frozen: 'warning', closed: 'danger' }
  const typeLabel = { savings: 'Savings', current: 'Current', fixed_deposit: 'Fixed Deposit' }

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 style={{fontSize:24,fontWeight:800}}>🏦 Account Management</h1>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-outline" onClick={()=>{setShowBalance(true);setBalanceResult(null);setBalanceAcc('')}}>💰 Check Balance</button>
          <button className="btn btn-primary" onClick={()=>setShowCreate(true)}>+ New Account</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:22}}>
        {[
          ['Total','📁',stats.total_accounts,'gray'],
          ['Active','✅',stats.active,'success'],
          ['Frozen','🔒',stats.frozen,'warning'],
          ['Savings','💼',stats.savings,'info'],
          ['Deposits',null,fmt(stats.total_deposits),'purple'],
        ].map(([l,i,v,c])=>(
          <div key={l} className="card" style={{padding:16,textAlign:'center'}}>
            <div style={{fontSize:22,marginBottom:4}}>{i||'💰'}</div>
            <div style={{fontSize:20,fontWeight:800}}>{v||0}</div>
            <div style={{fontSize:12,color:'#6b7280'}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{paddingTop:14,paddingBottom:14}}>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            <div className="search-bar">
              <span>🔍</span>
              <input placeholder="Search by name, account no..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{width:160}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="savings">Savings</option>
              <option value="current">Current</option>
              <option value="fixed_deposit">Fixed Deposit</option>
            </select>
            <select className="form-control" style={{width:140}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="frozen">Frozen</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><h3>All Accounts ({total})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-center"><div className="spinner"></div></div> : (
            <table>
              <thead>
                <tr>
                  <th>Account No.</th><th>Customer</th><th>Type</th>
                  <th>Balance</th><th>Status</th><th>IFSC</th><th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0
                  ? <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">🏦</div><p>No accounts found</p></div></td></tr>
                  : accounts.map(a => (
                  <tr key={a._id}>
                    <td><span className="font-mono" style={{fontSize:13,fontWeight:600}}>{a.account_number}</span></td>
                    <td>
                      <div style={{fontWeight:600}}>{a.customer_name}</div>
                      <div style={{fontSize:11,color:'#6b7280'}}>{a.phone}</div>
                    </td>
                    <td><span className="badge badge-info">{typeLabel[a.account_type]||a.account_type}</span></td>
                    <td style={{fontWeight:700,color:'#0e9f6e'}}>{fmt(a.balance)}</td>
                    <td><span className={`badge badge-${statusColor[a.status]||'gray'}`} style={{textTransform:'capitalize'}}>{a.status}</span></td>
                    <td style={{fontSize:12,color:'#6b7280'}}>{a.ifsc_code}</td>
                    <td style={{fontSize:12,color:'#6b7280'}}>{a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : '-'}</td>
                    <td>
                      <div style={{display:'flex',gap:5}}>
                        <button className="btn btn-outline btn-sm" onClick={()=>setSelectedAcc(a)}>View</button>
                        {a.status === 'active' && <button className="btn btn-sm" onClick={()=>updateStatus(a._id,'frozen')} style={{background:'#fef3c7',color:'#92400e',border:'none',cursor:'pointer',padding:'5px 10px',borderRadius:6,fontSize:12,fontWeight:600}}>Freeze</button>}
                        {a.status === 'frozen' && <button className="btn btn-sm" onClick={()=>updateStatus(a._id,'active')} style={{background:'#d1fae5',color:'#065f46',border:'none',cursor:'pointer',padding:'5px 10px',borderRadius:6,fontSize:12,fontWeight:600}}>Activate</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Balance Modal */}
      {showBalance && (
        <div className="modal-overlay" onClick={()=>setShowBalance(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 Check Account Balance</h3>
              <button className="modal-close" onClick={()=>setShowBalance(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{display:'flex',gap:10,marginBottom:16}}>
                <input className="form-control" placeholder="Enter account number" value={balanceAcc} onChange={e=>setBalanceAcc(e.target.value)} />
                <button className="btn btn-primary" onClick={handleBalance}>Check</button>
              </div>
              {balanceResult && (
                <div style={{background:'linear-gradient(135deg,#ebf5ff,#dbeafe)',borderRadius:12,padding:24,textAlign:'center',border:'1px solid #bfdbfe'}}>
                  <div style={{fontSize:13,color:'#1e40af',marginBottom:4}}>Account Holder</div>
                  <div style={{fontSize:18,fontWeight:700,marginBottom:12}}>{balanceResult.customer_name}</div>
                  <div style={{fontSize:38,fontWeight:900,color:'#1a56db',marginBottom:8}}>{fmt(balanceResult.balance)}</div>
                  <div style={{display:'flex',justifyContent:'center',gap:16,fontSize:12,color:'#6b7280'}}>
                    <span>🏦 {balanceResult.account_number}</span>
                    <span>📂 {balanceResult.account_type}</span>
                    <span className={`badge badge-${statusColor[balanceResult.status]||'gray'}`}>{balanceResult.status}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account Detail Modal */}
      {selectedAcc && (
        <div className="modal-overlay" onClick={()=>setSelectedAcc(null)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏦 Account Details</h3>
              <button className="modal-close" onClick={()=>setSelectedAcc(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                {[
                  ['Account Number', selectedAcc.account_number],
                  ['Customer Name', selectedAcc.customer_name],
                  ['Account Type', typeLabel[selectedAcc.account_type] || selectedAcc.account_type],
                  ['Balance', fmt(selectedAcc.balance)],
                  ['Phone', selectedAcc.phone],
                  ['Email', selectedAcc.email],
                  ['IFSC Code', selectedAcc.ifsc_code],
                  ['Branch', selectedAcc.branch],
                  ['Status', selectedAcc.status],
                  ['Customer ID', selectedAcc.customer_id],
                  ['Nominee', selectedAcc.nominee || 'Not set'],
                  ['Opened On', selectedAcc.created_at ? new Date(selectedAcc.created_at).toLocaleDateString('en-IN') : '-'],
                ].map(([k,v]) => (
                  <div key={k} style={{background:'#f8faff',borderRadius:8,padding:12}}>
                    <div style={{fontSize:11,color:'#6b7280',marginBottom:2}}>{k}</div>
                    <div style={{fontSize:14,fontWeight:600}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setSelectedAcc(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={()=>setShowCreate(false)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Open New Account</h3>
              <button className="modal-close" onClick={()=>setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Account Type *</label>
                    <select className="form-control" value={form.account_type} onChange={e=>setForm({...form,account_type:e.target.value})}>
                      <option value="savings">Savings Account</option>
                      <option value="current">Current Account</option>
                      <option value="fixed_deposit">Fixed Deposit</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Email *</label><input type="email" className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Phone *</label><input className="form-control" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Date of Birth *</label><input type="date" className="form-control" value={form.dob} onChange={e=>setForm({...form,dob:e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Initial Deposit (₹)</label><input type="number" className="form-control" value={form.initial_deposit} onChange={e=>setForm({...form,initial_deposit:e.target.value})} min="0" /></div>
                  <div className="form-group"><label className="form-label">ID Proof Type *</label>
                    <select className="form-control" value={form.id_proof_type} onChange={e=>setForm({...form,id_proof_type:e.target.value})}>
                      <option value="aadhaar">Aadhaar Card</option>
                      <option value="pan">PAN Card</option>
                      <option value="passport">Passport</option>
                      <option value="voter_id">Voter ID</option>
                      <option value="driving_license">Driving License</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">ID Proof Number *</label><input className="form-control" value={form.id_proof_number} onChange={e=>setForm({...form,id_proof_number:e.target.value})} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Address *</label><textarea className="form-control" rows={2} value={form.address} onChange={e=>setForm({...form,address:e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Nominee Name</label><input className="form-control" value={form.nominee} onChange={e=>setForm({...form,nominee:e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={()=>setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
