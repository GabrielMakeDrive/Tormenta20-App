import sqlite3
import uuid
import json
import datetime
import random
from flask import Flask, request, jsonify, g

app = Flask(__name__)

# Configuração do Banco de Dados (Arquivo local para persistência no PythonAnywhere)
DATABASE = 'p2p_signaling.db'

# ==========================================
# 1. Gerenciamento do Banco de Dados (SQLite)
# ==========================================

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row  # Permite acessar colunas por nome
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    """Inicializa as tabelas se não existirem."""
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        
        # Tabela de Salas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rooms (
                room_id TEXT PRIMARY KEY,
                host_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'open'
            )
        ''')
        
        # Tabela de Participantes
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS participants (
                device_id TEXT,
                room_id TEXT,
                role TEXT,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (device_id, room_id)
            )
        ''')
        
        # Tabela de Mensagens de Sinalização (Polling)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS signals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT,
                from_device TEXT,
                to_device TEXT,
                type TEXT,
                payload TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()

# Inicializa o DB na primeira execução
if __name__ == '__main__':
    init_db()
else:
    # Hack para garantir que o DB exista ao rodar via WSGI (PythonAnywhere)
    try:
        init_db()
    except:
        pass

# ==========================================
# 2. Helpers e CORS
# ==========================================

@app.after_request
def after_request(response):
    """Habilita CORS para aceitar requisições do seu PWA."""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

def clean_stale_data():
    """Limpa mensagens, participantes e salas inativas para economizar espaço."""
    try:
        db = get_db()
        # Remove sinais com mais de 10 minutos (já entregues ou obsoletos)
        db.execute("DELETE FROM signals WHERE created_at < datetime('now', '-10 minutes')")
        
        # Remove participantes que não dão sinal de vida há mais de 1 hora
        db.execute("DELETE FROM participants WHERE last_seen < datetime('now', '-1 hour')")
        
        db.commit()
    except Exception as e:
        print(f"Erro na limpeza: {e}")

# ==========================================
# 3. Rotas da API
# ==========================================

# --- 1️⃣ Criar sala (HOST) ---
@app.route('/rooms', methods=['POST'])
def create_room():
    data = request.json
    host_id = data.get('device_id')
    
    if not host_id:
        return jsonify({"error": "device_id required"}), 400

    room_id = f"{random.randint(0, 999999):06d}" # ID de 6 números aleatórios
    
    db = get_db()
    try:
        # Cria a sala
        db.execute('INSERT INTO rooms (room_id, host_id, status) VALUES (?, ?, ?)', 
                   (room_id, host_id, 'open'))
        
        # Registra o Host como participante
        db.execute('INSERT INTO participants (device_id, room_id, role) VALUES (?, ?, ?)',
                   (host_id, room_id, 'host'))
        
        db.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "room_id": room_id,
        "token": f"host-{host_id}-{room_id}" # Token simples para validação básica
    }), 201


# --- 2️⃣ Entrar em sala (PEER) ---
@app.route('/rooms/<room_id>/join', methods=['POST'])
def join_room(room_id):
    data = request.json
    device_id = data.get('device_id')

    if not device_id:
        return jsonify({"error": "device_id required"}), 400

    db = get_db()
    room = db.execute('SELECT * FROM rooms WHERE room_id = ? AND status = ?', (room_id, 'open')).fetchone()

    if not room:
        return jsonify({"error": "Room not found or closed"}), 404

    # Registra ou atualiza o participante
    db.execute('''
        INSERT OR REPLACE INTO participants (device_id, room_id, role, last_seen)
        VALUES (?, ?, ?, datetime('now'))
    ''', (device_id, room_id, 'peer'))
    
    db.commit()

    return jsonify({
        "token": f"peer-{device_id}-{room_id}",
        "host_id": room['host_id']
    }), 200


# --- 3️⃣ Enviar sinalização (Offer / Answer / ICE) ---
@app.route('/rooms/<room_id>/signal', methods=['POST'])
def send_signal(room_id):
    data = request.json
    from_dev = data.get('from')
    to_dev = data.get('to')
    s_type = data.get('type')
    payload = data.get('payload')

    if from_dev is None or to_dev is None or s_type is None or payload is None:
        return jsonify({"error": "Missing fields (from, to, type, payload are required)"}), 400

    payload_json = json.dumps(payload)

    db = get_db()
    db.execute('''
        INSERT INTO signals (room_id, from_device, to_device, type, payload)
        VALUES (?, ?, ?, ?, ?)
    ''', (room_id, from_dev, to_dev, s_type, payload_json))
    
    db.commit()
    
    # Limpeza "preguiçosa" ocasional
    if uuid.uuid4().int % 10 == 0: 
        clean_stale_data()

    return jsonify({"ok": True}), 201


# --- 4️⃣ Buscar sinalizações (POLLING) ---
@app.route('/rooms/<room_id>/signal', methods=['GET'])
def get_signals(room_id):
    device_id = request.args.get('device_id')
    
    if not device_id:
        return jsonify({"error": "device_id query param required"}), 400

    db = get_db()
    
    # Busca mensagens destinadas a este dispositivo nesta sala
    cursor = db.execute('''
        SELECT id, from_device, type, payload 
        FROM signals 
        WHERE room_id = ? AND to_device = ?
        ORDER BY created_at ASC
    ''', (room_id, device_id))
    
    rows = cursor.fetchall()
    messages = []
    ids_to_delete = []

    for row in rows:
        messages.append({
            "from": row['from_device'],
            "type": row['type'],
            "payload": json.loads(row['payload'])
        })
        ids_to_delete.append(row['id'])

    # Remove mensagens lidas (simulando fila/socket)
    if ids_to_delete:
        # Truque do SQL para deletar múltiplos IDs de uma vez
        placeholder = '?' + ',?' * (len(ids_to_delete) - 1)
        db.execute(f'DELETE FROM signals WHERE id IN ({placeholder})', ids_to_delete)
        db.commit()

    return jsonify(messages), 200


# --- 5️⃣ Heartbeat / Presença ---
@app.route('/rooms/<room_id>/heartbeat', methods=['POST'])
def heartbeat(room_id):
    data = request.json
    device_id = data.get('device_id')

    if not device_id:
        return jsonify({"error": "device_id required"}), 400

    db = get_db()
    db.execute('''
        UPDATE participants 
        SET last_seen = datetime('now') 
        WHERE room_id = ? AND device_id = ?
    ''', (room_id, device_id))
    db.commit()

    return jsonify({"status": "alive"}), 200


# --- 6️⃣ Listar Participantes ---
@app.route('/rooms/<room_id>/participants', methods=['GET'])
def list_participants(room_id):
    db = get_db()
    
    # Pega participantes ativos nos últimos 30 segundos (tolerância offline parcial)
    cursor = db.execute('''
        SELECT device_id, last_seen, role
        FROM participants
        WHERE room_id = ? AND last_seen > datetime('now', '-30 seconds')
    ''', (room_id,))
    
    participants = [dict(row) for row in cursor.fetchall()]
    return jsonify(participants), 200


# --- 7️⃣ Encerrar Sala ---
@app.route('/rooms/<room_id>/close', methods=['POST'])
def close_room(room_id):
    # Idealmente verificar se quem chama é o HOST via token, 
    # mas para simplificar vamos confiar na requisição por enquanto
    
    db = get_db()
    db.execute("UPDATE rooms SET status = 'closed' WHERE room_id = ?", (room_id,))
    
    # Opcional: Limpar dados da sala imediatamente
    db.execute("DELETE FROM participants WHERE room_id = ?", (room_id,))
    db.execute("DELETE FROM signals WHERE room_id = ?", (room_id,))
    db.commit()

    return jsonify({"status": "closed"}), 200


# Rota de teste simples
@app.route('/')
def index():
    return "P2P Signaling Server is running."

if __name__ == '__main__':
    # Apenas para teste local
    app.run(debug=True, port=5000)