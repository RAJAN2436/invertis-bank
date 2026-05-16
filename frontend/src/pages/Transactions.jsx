import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

export default function Transactions() {
  const [tab, setTab] = useState('list')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({})
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [depositForm, setDepositForm] = useState({ account_number: '', amount: '', description: 'Cash Deposit' })
  const [withdrawForm, setWithdrawForm] = useState({ account_number: '', amount: '', description: 'Cash Withdrawal' })
  const [transferForm, setTransferForm] = useState({ from_account: '', to_account: '', amount: '', description: 'Fund Transfer' })
  const [statementAcc, setStatementAcc] = useState('')
  const [statement, setStatement] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const [t, s] = await Promise.all([
        api.get('/transactions/', { params: { type: filterType } }),
        api.get('/transactions/stats')
      ])
      setTransactions(t.data.transactions)
      setStats(s.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { if (tab === 'list') loadTransactions() }, [tab, filterType])

  const handleDeposit = async (e) => {
    e.preventDefault()
    setProcessing(true)
    setResult(null)
    try {
      const res = await api.post('/transactions/deposit', depositForm)
      setResult({ type: 'success', ...res.data })
      toast.success(res.data.message)
      setDepositForm({ account_number: '', amount: '', description: 'Cash Deposit' })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setProcessing(false) }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()
    setProcessing(true)
    setResult(null)
    try {
      const res = await api.post('/transactions/withdraw', withdrawForm)
      setResult({ type: 'success', ...res.data })
      toast.success(res.data.message)
      setWithdrawForm({ account_number: '', amount: '', description: 'Cash Withdrawal' })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setProcessing(false) }
  }

  const handleTransfer = async (e) => {
    e.preventDefault()
    setProcessing(true)
    setResult(null)
    try {
      const res = await api.post('/transactions/transfer', transferForm)
      setResult({ type: 'transfer', ...res.data })
      toast.success(res.data.message)
      setTransferForm({ from_account: '', to_account: '', amount: '', description: 'Fund Transfer' })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setProcessing(false) }
  }

  const loadStatement = async () => {
    if (!statementAcc) return
    try {
      const res = await api.get(`/transactions/statement/${statementAcc}`)
      setStatement(res.data)
    } catch (err) { toast.error(err.response?.data?.error || 'Account not found') }
  }

  const clearResult = () => setResult(null)

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 style={{fontSize:24,fontWeight:800}}>💸 Transaction Management</h1>
      </div>

      {/* Stats Row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:22}}>
        <div className="card" style={{padding:18,borderTop:'4px solid #0e9f6e'}}>
          <div style={{fontSize:12,color:'#6b7280'}}>💚 Total Deposits Today</div>
          <div style={{fontSize:26,fontWeight:800,color:'#0e9f6e'}}>{fmt(stats.deposits_today?.total)}</div>
          <div style={{fontSize:12,color:'#9ca3af'}}>{stats.deposits_today?.count||0} transactions</div>
        </div>
        <div className="card" style={{padding:18,borderTop:'4px solid #e02424'}}>
          <div style={{fontSize:12,color:'#6b7280'}}>🔴 Total Withdrawals Today</div>
          <div style={{fontSize:26,fontWeight:800,color:'#e02424'}}>{fmt(stats.withdrawals_today?.total)}</div>
          <div style={{fontSize:12,color:'#9ca3af'}}>{stats.withdrawals_today?.count||0} transactions</div>
        </div>
        <div className="card" style={{padding:18,borderTop:'4px solid #1a56db'}}>
          <div style={{fontSize:12,color:'#6b7280'}}>📊 Total Transactions</div>
          <div style={{fontSize:26,fontWeight:800,color:'#1a56db'}}>{stats.total_transactions||0}</div>
          <div style={{fontSize:12,color:'#9ca3af'}}>All time</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['list','📋 All Transactions'],['deposit','💚 Deposit'],['withdraw','🔴 Withdraw'],['transfer','↔️ Transfer'],['statement','📄 Statement']].map(([k,l])=>(
          <button key={k} className={`tab-btn ${tab===k?'active':''}`} onClick={()=>{setTab(k);setResult(null)}}>{l}</button>
        ))}
      </div>

      {/* Transaction List */}
      {tab === 'list' && (
        <div className="card">
          <div className="card-header">
            <h3>All Transactions</h3>
            <div style={{display:'flex',gap:10}}>
              <select className="form-control" style={{width:140}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
                <option value="">All Types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>
          </div>
          <div className="table-container">
            {loading ? <div className="loading-center"><div className="spinner"></div></div> : (
              <table>
                <thead><tr><th>Txn ID</th><th>Account</th><th>Customer</th><th>Type</th><th>Category</th><th>Amount</th><th>Balance After</th><th>Date/Time</th><th>By</th></tr></thead>
                <tbody>
                  {transactions.length === 0
                    ? <tr><td colSpan={9}><div className="empty-state"><div className="empty-icon">💸</div><p>No transactions found</p></div></td></tr>
                    : transactions.map(t => (
                    <tr key={t._id}>
                      <td style={{fontSize:11,fontFamily:'monospace',color:'#6b7280'}}>{t.txn_id}</td>
                      <td><span className="font-mono" style={{fontSize:12}}>{t.account_number}</span></td>
                      <td style={{fontSize:13}}>{t.customer_name}</td>
                      <td><span className={`badge badge-${t.type==='credit'?'success':'danger'}`}>{t.type==='credit'?'↑ Credit':'↓ Debit'}</span></td>
                      <td style={{fontSize:12,textTransform:'capitalize',color:'#6b7280'}}>{t.category?.replace('_',' ')}</td>
                      <td style={{fontWeight:700,color:t.type==='credit'?'#0e9f6e':'#e02424'}}>{fmt(t.amount)}</td>
                      <td style={{fontSize:12}}>{fmt(t.balance_after)}</td>
                      <td style={{fontSize:11,color:'#9ca3af'}}>{t.timestamp ? new Date(t.timestamp).toLocaleString('en-IN') : '-'}</td>
                      <td style={{fontSize:12,color:'#6b7280'}}>{t.performed_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Deposit */}
      {tab === 'deposit' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div className="card">
            <div className="card-header"><h3>💚 Cash Deposit</h3></div>
            <form onSubmit={handleDeposit}>
              <div className="card-body">
                <div className="form-group"><label className="form-label">Account Number *</label><input className="form-control" placeholder="12-digit account number" value={depositForm.account_number} onChange={e=>setDepositForm({...depositForm,account_number:e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Amount (₹) *</label><input type="number" className="form-control" placeholder="Enter amount" value={depositForm.amount} onChange={e=>setDepositForm({...depositForm,amount:e.target.value})} min="1" required /></div>
                <div className="form-group"><label className="form-label">Description</label><input className="form-control" value={depositForm.description} onChange={e=>setDepositForm({...depositForm,description:e.target.value})} /></div>
                <button type="submit" className="btn btn-success btn-block" disabled={processing}>{processing ? 'Processing...' : '💚 Deposit Now'}</button>
              </div>
            </form>
          </div>
          <div>
            {result && (
              <div className="card">
                <div className="card-body" style={{textAlign:'center'}}>
                  <div style={{fontSize:48,marginBottom:12}}>✅</div>
                  <h3 style={{color:'#0e9f6e',marginBottom:8}}>Deposit Successful!</h3>
                  <div style={{background:'#f0fdf4',borderRadius:10,padding:16,marginBottom:12}}>
                    <div style={{fontSize:28,fontWeight:800,color:'#0e9f6e'}}>{fmt(parseFloat(result.new_balance))}</div>
                    <div style={{fontSize:12,color:'#6b7280'}}>New Balance</div>
                  </div>
                  <div style={{fontSize:13,color:'#6b7280'}}>
                    <div>Account: {result.account_number}</div>
                    <div>Customer: {result.customer_name}</div>
                    <div>Txn ID: {result.txn_id}</div>
                  </div>
                  <button className="btn btn-outline btn-sm" style={{marginTop:12}} onClick={clearResult}>Clear</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdraw */}
      {tab === 'withdraw' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div className="card">
            <div className="card-header"><h3>🔴 Cash Withdrawal</h3></div>
            <form onSubmit={handleWithdraw}>
              <div className="card-body">
                <div className="form-group"><label className="form-label">Account Number *</label><input className="form-control" placeholder="12-digit account number" value={withdrawForm.account_number} onChange={e=>setWithdrawForm({...withdrawForm,account_number:e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Amount (₹) *</label><input type="number" className="form-control" placeholder="Enter amount" value={withdrawForm.amount} onChange={e=>setWithdrawForm({...withdrawForm,amount:e.target.value})} min="1" required /></div>
                <div className="form-group"><label className="form-label">Description</label><input className="form-control" value={withdrawForm.description} onChange={e=>setWithdrawForm({...withdrawForm,description:e.target.value})} /></div>
                <div className="alert alert-warning">⚠️ Minimum balance of ₹500 (Savings) / ₹1000 (Current) must be maintained.</div>
                <button type="submit" className="btn btn-danger btn-block" disabled={processing}>{processing ? 'Processing...' : '🔴 Withdraw Now'}</button>
              </div>
            </form>
          </div>
          <div>
            {result && (
              <div className="card">
                <div className="card-body" style={{textAlign:'center'}}>
                  <div style={{fontSize:48,marginBottom:12}}>✅</div>
                  <h3 style={{color:'#e02424',marginBottom:8}}>Withdrawal Successful!</h3>
                  <div style={{background:'#fef2f2',borderRadius:10,padding:16,marginBottom:12}}>
                    <div style={{fontSize:28,fontWeight:800,color:'#e02424'}}>{fmt(parseFloat(result.new_balance))}</div>
                    <div style={{fontSize:12,color:'#6b7280'}}>New Balance</div>
                  </div>
                  <div style={{fontSize:13,color:'#6b7280'}}>
                    <div>Account: {result.account_number}</div>
                    <div>Customer: {result.customer_name}</div>
                    <div>Txn ID: {result.txn_id}</div>
                  </div>
                  <button className="btn btn-outline btn-sm" style={{marginTop:12}} onClick={clearResult}>Clear</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfer */}
      {tab === 'transfer' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div className="card">
            <div className="card-header"><h3>↔️ Fund Transfer</h3></div>
            <form onSubmit={handleTransfer}>
              <div className="card-body">
                <div className="form-group"><label className="form-label">From Account *</label><input className="form-control" placeholder="Source account number" value={transferForm.from_account} onChange={e=>setTransferForm({...transferForm,from_account:e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">To Account *</label><input className="form-control" placeholder="Destination account number" value={transferForm.to_account} onChange={e=>setTransferForm({...transferForm,to_account:e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Amount (₹) *</label><input type="number" className="form-control" placeholder="Enter amount" value={transferForm.amount} onChange={e=>setTransferForm({...transferForm,amount:e.target.value})} min="1" required /></div>
                <div className="form-group"><label className="form-label">Description</label><input className="form-control" value={transferForm.description} onChange={e=>setTransferForm({...transferForm,description:e.target.value})} /></div>
                <button type="submit" className="btn btn-primary btn-block" disabled={processing}>{processing ? 'Processing...' : '↔️ Transfer Now'}</button>
              </div>
            </form>
          </div>
          <div>
            {result && (
              <div className="card">
                <div className="card-body" style={{textAlign:'center'}}>
                  <div style={{fontSize:48,marginBottom:12}}>✅</div>
                  <h3 style={{color:'#1a56db',marginBottom:16}}>Transfer Successful!</h3>
                  <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center',marginBottom:16}}>
                    <div style={{background:'#fef2f2',padding:12,borderRadius:8}}>
                      <div style={{fontSize:11,color:'#6b7280'}}>FROM</div>
                      <div style={{fontSize:12,fontWeight:700}}>{result.from_account}</div>
                      <div style={{fontSize:16,fontWeight:800,color:'#e02424'}}>{fmt(result.from_new_balance)}</div>
                    </div>
                    <div style={{fontSize:24}}>→</div>
                    <div style={{background:'#f0fdf4',padding:12,borderRadius:8}}>
                      <div style={{fontSize:11,color:'#6b7280'}}>TO</div>
                      <div style={{fontSize:12,fontWeight:700}}>{result.to_account}</div>
                      <div style={{fontSize:16,fontWeight:800,color:'#0e9f6e'}}>{fmt(result.to_new_balance)}</div>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={clearResult}>Clear</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statement */}
      {tab === 'statement' && (
        <div>
          <div className="card mb-4">
            <div className="card-body">
              <div style={{display:'flex',gap:10}}>
                <input className="form-control" placeholder="Enter account number" value={statementAcc} onChange={e=>setStatementAcc(e.target.value)} />
                <button className="btn btn-primary" onClick={loadStatement}>📄 Get Statement</button>
              </div>
            </div>
          </div>
          {statement && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>Statement: {statement.account.account_number}</h3>
                  <div style={{fontSize:13,color:'#6b7280'}}>{statement.account.customer_name} | Balance: <strong style={{color:'#0e9f6e'}}>{fmt(statement.account.balance)}</strong></div>
                </div>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Date/Time</th><th>Description</th><th>Type</th><th>Amount</th><th>Balance</th></tr></thead>
                  <tbody>
                    {statement.transactions.length === 0
                      ? <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">📄</div><p>No transactions</p></div></td></tr>
                      : statement.transactions.map(t => (
                      <tr key={t._id}>
                        <td style={{fontSize:12,color:'#6b7280'}}>{new Date(t.timestamp).toLocaleString('en-IN')}</td>
                        <td style={{fontSize:13}}>{t.description}</td>
                        <td><span className={`badge badge-${t.type==='credit'?'success':'danger'}`}>{t.type==='credit'?'↑':'↓'} {t.type}</span></td>
                        <td style={{fontWeight:700,color:t.type==='credit'?'#0e9f6e':'#e02424'}}>{fmt(t.amount)}</td>
                        <td style={{fontSize:13}}>{fmt(t.balance_after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
