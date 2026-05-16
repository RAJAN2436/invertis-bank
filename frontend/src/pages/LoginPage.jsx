import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import bankLogo from '../components/logo.jpg'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.username, form.password)
      toast.success('Welcome to Invertis Bank!')
      navigate('/portal')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    const creds = { admin: ['admin', 'Admin@123'], manager: ['manager', 'Manager@123'], teller: ['teller', 'Teller@123'] }
    setForm({ username: creds[role][0], password: creds[role][1] })
  }

  return (
    <div className="login-page">
      <div className="login-bg-shapes">
        <div className="login-shape" style={{ width: 500, height: 500, top: -150, right: -100, opacity: 0.4 }}></div>
        <div className="login-shape" style={{ width: 300, height: 300, bottom: -80, left: -80, opacity: 0.3 }}></div>
        <div className="login-shape" style={{ width: 200, height: 200, bottom: 200, right: 100, opacity: 0.2 }}></div>
      </div>

      <div style={{ display: 'flex', gap: 80, alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 1100, padding: '0 24px' }}>
        {/* Hero Text */}
        <div style={{ flex: 1, display: 'none' }} className="hero-side">
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(26,86,219,0.2)', border: '1px solid rgba(26,86,219,0.4)', borderRadius: 20, padding: '6px 16px', marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600 }}>🏦 BANK PORTAL v2.0</span>
            </div>
            <h1 style={{ fontSize: 46, fontWeight: 800, color: 'white', lineHeight: 1.15, marginBottom: 16 }}>
              Invertis Bank<br />
              <span style={{ background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Management Portal</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, lineHeight: 1.7 }}>
              Secure, real-time bank operations platform for authorized personnel. Manage accounts, transactions, loans and more.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['Account Management', 'Fund Transfers', 'Loan Processing', 'Customer KYC'].map(f => (
              <div key={f} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                ✓ {f}
              </div>
            ))}
          </div>
        </div>

        {/* Login Card */}
        <div className="login-card" style={{ margin: '0 auto' }}>
          <div className="login-logo">
            <div className="bank-icon"><img src={bankLogo} alt="Invertis Bank Logo" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}} /></div>
            <h1>Invertis Bank</h1>
            <p>Banking Portal — Authorized Access Only</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username / Email</label>
              <input
                id="username"
                type="text"
                className="form-control"
                placeholder="Enter your username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="password"
                type="password"
                className="form-control"
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? '⏳ Signing in...' : '🔐 Sign In to Portal'}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>DEMO ACCOUNTS</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['admin', 'Admin'], ['manager', 'Manager'], ['teller', 'Teller']].map(([role, label]) => (
                <button key={role} onClick={() => fillDemo(role)} type="button"
                  style={{ flex: 1, padding: '7px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
