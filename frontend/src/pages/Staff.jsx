import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const INIT = { username: '', email: '', password: '', role: 'teller', full_name: '', phone: '' }

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/auth/staff')
      setStaff(res.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/auth/staff', form)
      toast.success(`Staff created! Employee ID: ${res.data.employee_id}`)
      setShowCreate(false)
      setForm(INIT)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const roleColor = { admin: 'danger', manager: 'purple', teller: 'info' }
  const roleIcon = { admin: '🔑', manager: '👔', teller: '🏧' }

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 style={{fontSize:24,fontWeight:800}}>👤 Staff Management</h1>
        {user?.role === 'admin' && <button className="btn btn-primary" onClick={()=>setShowCreate(true)}>+ Add Staff Member</button>}
      </div>

      <div className="card">
        <div className="card-header"><h3>All Staff ({staff.length})</h3></div>
        <div className="table-container">
          {loading ? <div className="loading-center"><div className="spinner"></div></div> : (
            <table>
              <thead><tr><th>Employee ID</th><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s._id} style={s.username === user?.username ? {background:'#f0f7ff'} : {}}>
                    <td><span style={{fontFamily:'monospace',fontWeight:600,fontSize:13}}>{s.employee_id}</span></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#1a56db,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:13,fontWeight:700}}>
                          {s.full_name?.[0]||s.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{fontWeight:600}}>{s.full_name}</div>
                          {s.username === user?.username && <div style={{fontSize:10,color:'#3b82f6',fontWeight:600}}>YOU</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{fontFamily:'monospace',fontSize:13}}>@{s.username}</td>
                    <td style={{fontSize:13,color:'#6b7280'}}>{s.email}</td>
                    <td style={{fontSize:13}}>{s.phone}</td>
                    <td>
                      <span className={`badge badge-${roleColor[s.role]||'gray'}`}>
                        {roleIcon[s.role]} {s.role}
                      </span>
                    </td>
                    <td style={{fontSize:11,color:'#9ca3af'}}>{s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Roles Info */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:20}}>
        {[
          ['🔑 Admin','Full system access — manage staff, view audit logs, all operations','admin'],
          ['👔 Manager','Approve loans, manage accounts, view all reports','manager'],
          ['🏧 Teller','Process transactions, open accounts, check balances','teller'],
        ].map(([title,desc,role]) => (
          <div key={role} className="card" style={{padding:18,borderLeft:`4px solid ${role==='admin'?'#e02424':role==='manager'?'#7c3aed':'#1a56db'}`}}>
            <div style={{fontWeight:700,marginBottom:6}}>{title}</div>
            <div style={{fontSize:13,color:'#6b7280'}}>{desc}</div>
            <div style={{marginTop:10,fontSize:12,fontWeight:600,color:'#6b7280'}}>
              {staff.filter(s=>s.role===role).length} member(s)
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={()=>setShowCreate(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h3>➕ Add Staff Member</h3><button className="modal-close" onClick={()=>setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Role *</label>
                    <select className="form-control" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                      <option value="teller">Teller</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Username *</label><input className="form-control" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Email *</label><input type="email" className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Password *</label><input type="password" className="form-control" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={()=>setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
