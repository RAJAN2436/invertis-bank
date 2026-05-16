import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'invertis_secret')
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"], supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Register blueprints
from routes.auth import auth_bp
from routes.accounts import accounts_bp
from routes.transactions import transactions_bp
from routes.loans import loans_bp
from routes.dashboard import dashboard_bp
from routes.customers import customers_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(accounts_bp, url_prefix='/api/accounts')
app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
app.register_blueprint(loans_bp, url_prefix='/api/loans')
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
app.register_blueprint(customers_bp, url_prefix='/api/customers')

@app.route('/api/health')
def health():
    return {'status': 'ok', 'message': 'Invertis Bank API Running'}

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    print(f"Invertis Bank API starting on port {port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
