# 🏦 Invertis Bank Management System
## Viva Voce Documentation

**Project Name:** Invertis Bank — Staff Management Portal  
**Technology Stack:** React + Vite (Frontend) · Python Flask (Backend) · MongoDB (Database)  
**Developed By:** Rajan  
**Institution:** Invertis University  

---

## 1. Project Overview

Invertis Bank is a **full-stack web application** that simulates a real-world bank's internal staff management portal. It is designed to be used exclusively by **authorized bank personnel** (Admins, Managers, and Tellers) to manage day-to-day banking operations.

### What problem does it solve?
Traditional banks rely on complex ERP software. This project demonstrates a simplified, modern, web-based alternative that staff can use directly from a browser — covering account management, transactions, loan processing, and KYC verification in one unified dashboard.

---

## 2. Technology Stack — Why These Choices?

| Layer | Technology | Reason |
|---|---|---|
| **Frontend** | React 19 + Vite | Component-based UI, fast hot-reload, modern ecosystem |
| **Backend** | Python Flask | Lightweight, easy REST API development, Python-native |
| **Database** | MongoDB (NoSQL) | Flexible schema for banking data; stores documents as JSON-like BSON |
| **Auth** | JWT (JSON Web Tokens) | Stateless, scalable authentication; no server-side sessions needed |
| **Real-time** | Flask-SocketIO | WebSocket support for live updates |
| **Password Security** | bcrypt | Industry-standard hashing with salt; not reversible |
| **Charts** | Recharts | Declarative charting library for React |
| **Animations** | Framer Motion | Smooth UI transitions |
| **HTTP Client** | Axios | Promise-based HTTP requests from frontend to backend |
| **Routing** | React Router DOM v7 | Client-side SPA navigation |
| **Notifications** | React Hot Toast | Non-blocking user feedback messages |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────┐
│               BROWSER (Client)                  │
│   React + Vite SPA  →  http://localhost:5173    │
│   Pages: Login, Dashboard, Accounts, Loans...   │
└──────────────────────┬──────────────────────────┘
                       │ HTTP REST API (Axios)
                       │ Authorization: Bearer <JWT>
┌──────────────────────▼──────────────────────────┐
│            FLASK BACKEND (Python)               │
│              http://localhost:5000              │
│  Routes: /api/auth  /api/accounts               │
│          /api/transactions  /api/loans          │
│          /api/dashboard  /api/customers         │
│  Middleware: JWT Verification, CORS, SocketIO   │
└──────────────────────┬──────────────────────────┘
                       │ PyMongo Driver
┌──────────────────────▼──────────────────────────┐
│              MONGODB DATABASE                   │
│            Database: invertis_bank              │
│  Collections: users, accounts, transactions,    │
│               loans, customers, audit_logs      │
└─────────────────────────────────────────────────┘
```

### Data Flow for a Deposit Operation:
1. Staff enters account number & amount on **Transactions** page
2. React sends `POST /api/transactions/deposit` with JWT header
3. Flask **verifies JWT**, extracts staff identity
4. Flask checks account exists and is **active**
5. MongoDB **updates balance** atomically
6. New transaction document **inserted** in `transactions` collection
7. Audit log entry **recorded** in `audit_logs`
8. Success response returned → React shows toast notification

---

## 4. Database Design (MongoDB Collections)

### 4.1 `users` Collection — Bank Staff
```json
{
  "username": "admin",
  "email": "admin@invertisbank.com",
  "password": "$2b$12$...(bcrypt hash)",
  "role": "admin",          // admin | manager | teller
  "full_name": "System Administrator",
  "employee_id": "EMP001",
  "phone": "9999999999",
  "is_active": true,
  "created_at": "2026-04-30T..."
}
```

### 4.2 `customers` Collection — Bank Customers
```json
{
  "customer_id": "CUST123456",
  "full_name": "Rajan Kumar",
  "email": "rajan@email.com",
  "phone": "9876543210",
  "address": "Lucknow, UP",
  "dob": "2000-01-15",
  "id_proof_type": "Aadhaar",
  "id_proof_number": "1234-5678-9012",
  "kyc_status": "pending"   // pending | verified | rejected
}
```

### 4.3 `accounts` Collection
```json
{
  "account_number": "984571236048",  // 12-digit auto-generated
  "customer_id": "CUST123456",
  "customer_name": "Rajan Kumar",
  "account_type": "savings",    // savings | current | fixed_deposit
  "balance": 25000.00,
  "currency": "INR",
  "ifsc_code": "INVB0001234",
  "branch": "Main Branch - Lucknow",
  "status": "active",          // active | frozen | closed
  "created_by": "teller"
}
```

### 4.4 `transactions` Collection
```json
{
  "txn_id": "TXN20260430235959",
  "account_number": "984571236048",
  "type": "credit",            // credit | debit
  "category": "deposit",       // deposit | withdrawal | transfer | loan_disbursement | loan_repayment
  "amount": 5000.00,
  "balance_after": 30000.00,
  "description": "Cash Deposit",
  "status": "completed",
  "performed_by": "teller",
  "timestamp": "2026-04-30T..."
}
```

### 4.5 `loans` Collection
```json
{
  "loan_id": "LOAN12345678",
  "account_number": "984571236048",
  "loan_type": "personal",     // personal | home | car | education | business | gold
  "amount": 100000,
  "tenure_months": 24,
  "interest_rate": 12.5,
  "emi_amount": 4725.60,
  "total_interest": 13414.40,
  "total_payable": 113414.40,
  "outstanding_amount": 100000,
  "paid_emis": 0,
  "status": "pending"          // pending | approved | rejected | disbursed | closed
}
```

### 4.6 `audit_logs` Collection
```json
{
  "action": "LOGIN",           // LOGIN | LOGOUT | DEPOSIT | ACCOUNT_CREATED | etc.
  "username": "admin",
  "ip": "127.0.0.1",
  "timestamp": "2026-04-30T..."
}
```

---

## 5. Backend API Reference

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| POST | `/login` | Staff login, returns JWT | ❌ |
| GET | `/profile` | Get logged-in user profile | ✅ |
| GET | `/staff` | List all staff members | ✅ |
| POST | `/staff` | Create new staff account | ✅ |
| POST | `/change-password` | Change own password | ✅ |
| POST | `/logout` | Logout (records audit) | ✅ |

### Accounts Routes (`/api/accounts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all accounts (with search/filter/pagination) |
| POST | `/` | Open new bank account |
| GET | `/<id>` | Get specific account details |
| PUT | `/<id>/status` | Freeze/close/activate account |
| GET | `/balance/<acc_no>` | Quick balance check |
| GET | `/stats` | Account statistics for dashboard |

### Transactions Routes (`/api/transactions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/deposit` | Cash deposit |
| POST | `/withdraw` | Cash withdrawal (checks minimum balance) |
| POST | `/transfer` | Fund transfer between accounts |
| GET | `/statement/<acc_no>` | Account statement |
| GET | `/stats` | Today's deposit/withdrawal totals |
| GET | `/recent` | Recent 10 transactions |

### Loans Routes (`/api/loans`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all loans |
| POST | `/apply` | Submit loan application |
| PUT | `/<loan_id>/approve` | Approve or reject loan |
| PUT | `/<loan_id>/disburse` | Disburse approved loan to account |
| POST | `/<loan_id>/repay` | Pay one EMI installment |
| GET | `/stats` | Loan portfolio statistics |

### Dashboard Routes (`/api/dashboard`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/summary` | KPI cards data (accounts, balance, loans) |
| GET | `/chart-data` | 7-day deposit vs withdrawal chart data |
| GET | `/recent-activity` | Recent transactions + recent loans |
| GET | `/audit-log` | System audit trail |

### Customers Routes (`/api/customers`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List customers (with linked accounts) |
| GET | `/<id>` | Customer detail with accounts + loans |
| PUT | `/<id>/kyc` | Update KYC verification status |
| GET | `/stats` | KYC pending/verified counts |

---

## 6. Authentication & Security

### JWT (JSON Web Token) Flow:
```
1. Staff POSTs username + password
2. Flask verifies credentials (bcrypt compare)
3. Flask generates JWT:
   Payload: { user_id, username, role, employee_id, exp }
   Signed with: HS256 + SECRET_KEY
4. Frontend stores token in localStorage
5. Every API call sends: Authorization: Bearer <token>
6. Flask @token_required decorator verifies on each request
```

### Decorators Used:
- **`@token_required`** — any authenticated staff can access
- **`@admin_required`** — only `admin` or `manager` roles

### Password Security:
```python
# Hashing (on create/change password)
bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

# Verification (on login)
bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
```
Bcrypt uses a **salt** to prevent rainbow table attacks. Even same passwords produce different hashes.

### Role-Based Access Control (RBAC):
| Role | Permissions |
|------|-------------|
| **admin** | Full access — manage staff, view audit logs, all operations |
| **manager** | Can approve/reject loans, full operational access |
| **teller** | Day-to-day: deposits, withdrawals, account opening |

---

## 7. Frontend Architecture

### Project Structure:
```
frontend/src/
├── main.jsx            # React app entry point
├── App.jsx             # Router + route protection
├── index.css           # Global design system (CSS variables, components)
├── context/
│   └── AuthContext.jsx # Global auth state (React Context API)
├── api/                # Axios API call functions
├── components/
│   └── DashboardLayout.jsx  # Sidebar + top navbar wrapper
└── pages/
    ├── LoginPage.jsx   # Authentication page
    ├── Dashboard.jsx   # KPI cards + charts + recent activity
    ├── Accounts.jsx    # Account management CRUD
    ├── Transactions.jsx # Deposit, withdraw, transfer, statement
    ├── Loans.jsx       # Loan lifecycle management
    ├── Customers.jsx   # Customer + KYC management
    ├── Staff.jsx       # Staff management (admin only)
    └── AuditLog.jsx    # System activity log
```

### React Context API (AuthContext):
```jsx
// Provides global: user, token, login(), logout()
// Used in every component to know who is logged in
const { user, token, login, logout } = useAuth()
```

### Protected Routes (PrivateRoute):
```jsx
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? children : <Navigate to="/" replace />
}
```

---

## 8. Key Business Logic

### EMI Calculation Formula:
```
EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)

Where:
  P = Principal loan amount
  r = Monthly interest rate (annual_rate / 12 / 100)
  n = Tenure in months
```

**Example:** ₹1,00,000 loan at 12.5% for 24 months
- Monthly rate r = 12.5 / 1200 = 0.01042
- EMI = ₹4,725.60/month
- Total payable = ₹1,13,414.40
- Total interest = ₹13,414.40

### Loan Interest Rates by Type:
| Loan Type | Rate (p.a.) |
|-----------|:-----------:|
| Gold Loan | 7.5% |
| Home Loan | 8.5% |
| Car Loan | 9.5% |
| Education Loan | 10.0% |
| Personal Loan | 12.5% |
| Business Loan | 14.0% |

### Minimum Balance Rules:
- **Savings Account:** ₹500 minimum balance must be maintained
- **Current Account:** ₹1,000 minimum balance required

### Account Number Generation:
- **12-digit random number** checked against DB for uniqueness
- **IFSC Code:** `INVB0001234` (fixed for Main Branch)
- **Customer ID:** `CUST` + 6 random digits

### Loan Lifecycle:
```
Applied (pending) → Approved/Rejected → Disbursed → [EMI Payments] → Closed
```
On disbursal, loan amount is **credited directly** to linked bank account as a transaction.

---

## 9. Pages & Features

### 9.1 Login Page
- Username or email login
- JWT stored in localStorage after success
- Role-based redirect to dashboard

### 9.2 Dashboard
- **KPI Cards:** Total accounts, customers, deposits, active loans
- **Recharts Line Chart:** 7-day deposit vs withdrawal trend
- **Recent Activity Feed:** Latest transactions and loan applications

### 9.3 Accounts Management
- Open new account (8-field form: name, type, email, phone, address, DOB, ID proof, initial deposit)
- Search accounts by account number, name, customer ID
- Filter by type (savings/current/FD) and status (active/frozen/closed)
- Freeze or close accounts
- Paginated table view (20 per page)

### 9.4 Transactions
- **Deposit:** Enter account number + amount → validates account is active
- **Withdraw:** Checks minimum balance requirement before deducting
- **Transfer:** Debits sender, credits receiver — creates 2 transaction records
- **Statement:** Full paginated transaction history for any account

### 9.5 Loans
- Apply loan: select type, enter amount, tenure, purpose
- Automatic EMI calculation shown before submission
- Approve/Reject pending loans
- Disburse approved loans → money credited to account
- Record EMI repayments
- Loan portfolio stats: pending, approved, disbursed, closed counts

### 9.6 Customers
- Auto-created when account is opened
- View customer profiles with all linked accounts
- Update KYC status (pending/verified/rejected)
- Search by name, email, phone, customer ID

### 9.7 Staff Management (Admin Only)
- View all bank staff
- Add new staff with role assignment
- Employee IDs auto-generated (EMP + 3 digits)

### 9.8 Audit Log
- Chronological system activity log
- Captures: logins, logouts, deposits, account creation, etc.
- Shows: action type, username, IP address, timestamp

---

## 10. Default Test Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@123` |
| Manager | `manager` | `Manager@123` |
| Teller | `teller` | `Teller@123` |

> These are **seeded automatically** on first server startup via `seed_admin()` in `auth.py`.

---

## 11. How to Run the Project

### Step 1: Start Backend
```bash
cd invertis-bank/backend
pip install flask flask-cors flask-socketio pymongo python-dotenv PyJWT bcrypt
python app.py
# Server starts at http://localhost:5000
```

### Step 2: Start Frontend
```bash
cd invertis-bank/frontend
npm install
npm run dev
# App opens at http://localhost:5173
```

### Step 3: MongoDB
- Ensure MongoDB is running locally on port `27017`
- Or update `MONGO_URI` in `backend/.env` to your Atlas URI
- Database `invertis_bank` is created automatically

### Or use `start.bat` (Windows):
```bat
# Double-click start.bat to launch both servers simultaneously
```

---

## 12. Potential Viva Questions & Answers

**Q: Why did you use MongoDB instead of MySQL?**  
A: Banking data like transaction records and loan documents have variable fields. MongoDB's flexible document model allows storing nested data (e.g., a customer with multiple accounts) without complex JOINs. It also scales horizontally easily.

**Q: How does JWT authentication work?**  
A: After login, the server creates a signed token containing user info (user ID, role, expiry). The frontend sends this token in every API request header. The server verifies the signature using the secret key — if valid, the request proceeds; otherwise 401 is returned. No session state is stored on the server.

**Q: What is bcrypt and why use it for passwords?**  
A: bcrypt is a password hashing function that automatically generates and incorporates a random "salt". This means even if two users have the same password, their hashes are different. It's also intentionally slow, making brute-force attacks impractical.

**Q: How does fund transfer work atomically?**  
A: In the transfer endpoint, we update both accounts sequentially and create two transaction records (one debit, one credit) with the same base transaction ID. In a production system, this would use MongoDB transactions for ACID compliance.

**Q: What is CORS and why is it configured?**  
A: Cross-Origin Resource Sharing (CORS) allows the React frontend (port 5173) to make API calls to the Flask backend (port 5000). Without CORS headers, browsers block such cross-origin requests. We configure `flask-cors` to allow only our frontend origins.

**Q: What is the role of SocketIO in this project?**  
A: Flask-SocketIO enables WebSocket connections for real-time updates. It's integrated so live transaction or dashboard updates can be pushed to connected clients without polling.

**Q: How is the EMI calculated?**  
A: Using the standard formula: `EMI = P × r × (1+r)^n / ((1+r)^n - 1)` where P is principal, r is monthly interest rate (annual rate / 12 / 100), and n is tenure in months. This is the same formula used by all banks.

**Q: What happens when a loan is disbursed?**  
A: The loan status is updated to "disbursed", and the loan amount is credited directly to the customer's bank account as a `loan_disbursement` type transaction. The account balance is updated accordingly.

**Q: How is the audit log useful?**  
A: The audit log captures every critical action (login, logout, deposit, account creation) with the acting user's identity, timestamp, and IP address. In a real bank, this is mandatory for regulatory compliance and fraud investigation.

**Q: What is the difference between a Blueprint in Flask?**  
A: Blueprints are Flask's way of organizing routes into separate modules. We have 6 blueprints: auth, accounts, transactions, loans, dashboard, customers. This keeps code modular and maintainable rather than putting all routes in one file.

---

## 13. System Limitations & Future Enhancements

| Current Limitation | Proposed Enhancement |
|--------------------|----------------------|
| No OTP/2FA login | Add SMS-based OTP verification |
| Transfer not fully atomic | Implement MongoDB multi-document transactions |
| No email notifications | Integrate SMTP for transaction alerts |
| Password stored only in bcrypt | Add password expiry policy |
| No interest accrual logic | Add scheduled jobs for daily interest calculation |
| Single branch only | Multi-branch support with branch management |
| No report export | PDF/Excel export for statements |
| Frontend has no role-based UI hiding | Hide sensitive tabs for tellers |

---

## 14. Project File Summary

| File | Purpose |
|------|---------|
| `backend/app.py` | Flask app initialization, blueprint registration, SocketIO |
| `backend/database.py` | MongoDB connection, collection references |
| `backend/auth_utils.py` | JWT generation/validation, bcrypt, decorators |
| `backend/routes/auth.py` | Login, logout, staff CRUD, seeding |
| `backend/routes/accounts.py` | Account CRUD, balance check, status management |
| `backend/routes/transactions.py` | Deposit, withdrawal, transfer, statement |
| `backend/routes/loans.py` | Loan application, approval, disbursement, repayment |
| `backend/routes/dashboard.py` | Summary KPIs, chart data, audit log |
| `backend/routes/customers.py` | Customer profiles, KYC management |
| `frontend/src/App.jsx` | React router configuration, protected routes |
| `frontend/src/context/AuthContext.jsx` | Global authentication state |
| `frontend/src/pages/*.jsx` | Individual page components |
| `frontend/src/index.css` | Complete design system (CSS variables, components) |

---

*Documentation prepared for Viva Voce examination — Invertis University, April 2026*
