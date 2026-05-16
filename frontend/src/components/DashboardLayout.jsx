import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import bankLogo from './logo.jpg'

const navItems = [
  { to: '/portal', icon: '📊', label: 'Dashboard', end: true },
  { to: '/portal/accounts', icon: '🏦', label: 'Accounts' },
  { to: '/portal/transactions', icon: '💸', label: 'Transactions' },
  { to: '/portal/loans', icon: '📋', label: 'Loans' },
  { to: '/portal/customers', icon: '👥', label: 'Customers' },
  { to: '/portal/staff', icon: '👤', label: 'Staff', adminOnly: true },
  { to: '/portal/audit', icon: '🔍', label: 'Audit Log', adminOnly: true },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/')
  }

  const filtered = navItems.filter(n => !n.adminOnly || ['admin','manager'].includes(user?.role))

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon" style={{padding:0,overflow:'hidden'}}>
            <img src={bankLogo} alt="Invertis Bank" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:10}} />
          </div>
          <div>
            <h2>Invertis Bank</h2>
            <span>Banking Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Navigation</div>
          {filtered.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{user?.full_name?.[0] || user?.username?.[0]?.toUpperCase()}</div>
            <div className="user-info" style={{flex:1,minWidth:0}}>
              <div className="name" style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user?.full_name || user?.username}</div>
              <div className="role">{user?.role} • {user?.employee_id}</div>
            </div>
            <button onClick={handleLogout} title="Logout"
              style={{background:'none',border:'none',cursor:'pointer',color:'#64748b',fontSize:18,padding:4}}>⏏</button>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div>
            <div className="topbar-date">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="topbar-right">
            <div style={{background:'#d1fae5',color:'#065f46',padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:600}}>
              🟢 System Online
            </div>
            <button onClick={handleLogout} className="btn btn-outline btn-sm">Logout</button>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
