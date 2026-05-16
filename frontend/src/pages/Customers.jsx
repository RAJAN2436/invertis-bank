import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKyc, setFilterKyc] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/customers/', { params: { search, kyc: filterKyc } })
      setCustomers(res.data.customers)
      setTotal(res.data.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, filterKyc])

  const viewCustomer = async (cust) => {
    setSelected(cust)
    try {
      const res = await api.get(`/customers/${cust.customer_id}`)
      setDetail(res.data)
    } catch {}
  }

  const updateKyc = async (customer_id, status) => {
    try {
      await api.put(`/customers/${customer_id}/kyc`, { kyc_status: status })
      toast.success(`KYC status updated to ${status}`)
      load()
      if (detail) {
        const res = await api.get(`/customers/${customer_id}`)
        setDetail(res.data)
      }
    } catch (err) { toast.error('Failed to update KYC') }
  }

  const kycColor = { verified: 'success', pending: 'warning', rejected: 'danger' }

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 style={{fontSize:24,fontWeight:800}}>👥 Customer Management</h1>
        <div style={{color:'#6b7280',fontSize:14}}>{total} customers registered</div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{paddingTop:12,paddingBottom:12}}>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            <div className="search-bar">
              <span>🔍</span>
              <input placeholder="Search by name, phone, email, ID..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{width:160}} value={filterKyc} onChange={e=>setFilterKyc(e.target.value)}>
              <option value="">All KYC Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><h3>All Customers ({total})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-center"><div className="spinner"></div></div> : (
            <table>
              <thead><tr><th>Customer ID</th><th>Name</th><th>Phone</th><th>Email</th><th>ID Proof</th><th>KYC</th><th>Accounts</th><th>Joined</th><th>Action</th></tr></thead>
              <tbody>
                {customers.length === 0
                  ? <tr><td colSpan={9}><div className="empty-state"><div className="empty-icon">👥</div><p>No customers found</p></div></td></tr>
                  : customers.map(c => (
                  <tr key={c._id}>
                    <td style={{fontSize:12,fontFamily:'monospace',fontWeight:600}}>{c.customer_id}</td>
                    <td style={{fontWeight:600}}>{c.full_name}</td>
                    <td style={{fontSize:13}}>{c.phone}</td>
                    <td style={{fontSize:12,color:'#6b7280'}}>{c.email}</td>
                    <td style={{fontSize:12,textTransform:'capitalize',color:'#6b7280'}}>{c.id_proof_type}</td>
                    <td>
                      <span className={`badge badge-${kycColor[c.kyc_status]||'gray'}`} style={{textTransform:'capitalize'}}>{c.kyc_status}</span>
                    </td>
                    <td>
                      <span style={{fontSize:12,color:'#1a56db',fontWeight:600}}>{c.accounts?.length || 0} account(s)</span>
                      {c.accounts?.map(a => <div key={a.account_number} style={{fontSize:10,fontFamily:'monospace',color:'#9ca3af'}}>{a.account_number}</div>)}
                    </td>
                    <td style={{fontSize:11,color:'#9ca3af'}}>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '-'}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={()=>viewCustomer(c)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={()=>{setSelected(null);setDetail(null)}}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxWidth:800}}>
            <div className="modal-header">
              <h3>👤 {selected.full_name}</h3>
              <button className="modal-close" onClick={()=>{setSelected(null);setDetail(null)}}>✕</button>
            </div>
            <div className="modal-body">
              {/* KYC Bar */}
              <div style={{display:'flex',alignItems:'center',gap:12,background:'#f8faff',borderRadius:10,padding:14,marginBottom:18}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:'#6b7280'}}>KYC Status</div>
                  <span className={`badge badge-${kycColor[selected.kyc_status]||'gray'}`} style={{textTransform:'capitalize',fontSize:13,padding:'4px 14px'}}>{selected.kyc_status}</span>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-success btn-sm" onClick={()=>updateKyc(selected.customer_id,'verified')}>✅ Verify KYC</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>updateKyc(selected.customer_id,'rejected')}>❌ Reject</button>
                  <button className="btn btn-outline btn-sm" onClick={()=>updateKyc(selected.customer_id,'pending')}>⏳ Pending</button>
                </div>
              </div>

              {/* Customer Info */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18}}>
                {[
                  ['Customer ID', selected.customer_id],
                  ['Full Name', selected.full_name],
                  ['Email', selected.email],
                  ['Phone', selected.phone],
                  ['Date of Birth', selected.dob],
                  ['ID Proof Type', selected.id_proof_type],
                  ['ID Proof No.', selected.id_proof_number],
                  ['Address', selected.address],
                ].map(([k,v]) => (
                  <div key={k} style={{background:'#f8faff',borderRadius:8,padding:10}}>
                    <div style={{fontSize:11,color:'#6b7280'}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:600}}>{v || '-'}</div>
                  </div>
                ))}
              </div>

              {/* Accounts */}
              {detail?.accounts?.length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontWeight:700,marginBottom:10}}>🏦 Linked Accounts</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {detail.accounts.map(a => (
                      <div key={a.account_number} style={{background:'#ebf5ff',borderRadius:8,padding:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <span className="font-mono" style={{fontWeight:700,fontSize:13}}>{a.account_number}</span>
                          <span style={{marginLeft:10,fontSize:12,color:'#6b7280',textTransform:'capitalize'}}>{a.account_type}</span>
                        </div>
                        <div style={{fontWeight:800,color:'#0e9f6e'}}>{fmt(a.balance)}</div>
                        <span className={`badge badge-${a.status==='active'?'success':'warning'}`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loans */}
              {detail?.loans?.length > 0 && (
                <div>
                  <div style={{fontWeight:700,marginBottom:10}}>📋 Loans</div>
                  {detail.loans.map(l => (
                    <div key={l.loan_id} style={{background:'#fef9f0',borderRadius:8,padding:12,display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:13}}>{l.loan_id}</div>
                        <div style={{fontSize:12,color:'#6b7280',textTransform:'capitalize'}}>{l.loan_type} loan</div>
                      </div>
                      <div style={{fontWeight:700}}>{fmt(l.amount)}</div>
                      <span className={`badge badge-${l.status==='pending'?'warning':l.status==='disbursed'?'info':'success'}`}>{l.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>{setSelected(null);setDetail(null)}}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
