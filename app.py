from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import sqlite3
from datetime import datetime
from dotenv import load_dotenv
import os
import telnyx
import re
from werkzeug.security import generate_password_hash, check_password_hash
from flask import url_for

load_dotenv()
telnyx.api_key = os.getenv('TELNYX_API_KEY')

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Necesario para usar sesiones

# Use the password from .env file
authorized_numbers_password = os.getenv('AUTHORIZED_NUMBERS_PASSWORD')
if not authorized_numbers_password:
    raise ValueError("AUTHORIZED_NUMBERS_PASSWORD not set in .env file")

app.config['AUTHORIZED_NUMBERS_PASSWORD'] = generate_password_hash(authorized_numbers_password)

def init_db():
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS tasks
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  text TEXT NOT NULL,
                  due_date DATE NOT NULL,
                  status TEXT NOT NULL,
                  created_date DATE NOT NULL,
                  completed_date DATE,
                  phone_number TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS authorized_numbers
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  phone_number TEXT UNIQUE NOT NULL,
                  description TEXT)''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    if session.get('authenticated'):
        return render_template('dashboard.html')
    else:
        return redirect(url_for('index'))

@app.route('/tasks', methods=['GET', 'POST'])
def tasks():
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    
    if request.method == 'POST':
        data = request.json
        c.execute("INSERT INTO tasks (text, due_date, status, created_date) VALUES (?, ?, ?, ?)",
                  (data['text'], data['dueDate'], data['status'], datetime.now().strftime('%Y-%m-%d')))
        conn.commit()
        task_id = c.lastrowid
        conn.close()
        return jsonify({'id': task_id}), 201
    
    else:
        c.execute("SELECT id, text, due_date, status, created_date, completed_date, phone_number FROM tasks")
        tasks = c.fetchall()
        conn.close()
        return jsonify([{
            'id': t[0], 
            'text': t[1], 
            'dueDate': t[2], 
            'status': t[3],
            'createdDate': t[4], 
            'completedDate': t[5],
            'phoneNumber': t[6]
        } for t in tasks])

@app.route('/get_sms_tasks')
def get_sms_tasks():
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    c.execute("SELECT id, text, due_date, status, created_date, phone_number FROM tasks WHERE status = 'pending' AND phone_number IS NOT NULL ORDER BY created_date DESC LIMIT 10")
    tasks = c.fetchall()
    conn.close()
    return jsonify([{
        'id': t[0], 
        'text': t[1], 
        'dueDate': t[2], 
        'status': t[3],
        'createdDate': t[4], 
        'phoneNumber': t[5]
    } for t in tasks])

@app.route('/tasks/<int:task_id>', methods=['PUT', 'DELETE'])
def update_task(task_id):
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    
    if request.method == 'PUT':
        data = request.json
        if 'status' in data:
            c.execute("UPDATE tasks SET status = ? WHERE id = ?", (data['status'], task_id))
        if 'dueDate' in data:
            c.execute("UPDATE tasks SET due_date = ? WHERE id = ?", (data['dueDate'], task_id))
        if 'completedDate' in data:
            c.execute("UPDATE tasks SET completed_date = ? WHERE id = ?", (data['completedDate'], task_id))
        conn.commit()
        conn.close()
        return '', 204
    
    elif request.method == 'DELETE':
        c.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
        conn.close()
        return '', 204

@app.route('/check_password', methods=['POST'])
def check_password():
    data = request.json
    if check_password_hash(app.config['AUTHORIZED_NUMBERS_PASSWORD'], data['password']):
        session['authenticated'] = True
        return jsonify({"success": True}), 200
    else:
        return jsonify({"success": False}), 401

@app.route('/authorized_numbers', methods=['GET', 'POST'])
def authorized_numbers():
    if not check_password_hash(app.config['AUTHORIZED_NUMBERS_PASSWORD'], request.headers.get('X-Password')):
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    
    if request.method == 'POST':
        data = request.json
        phone_number = data['phoneNumber']
        description = data.get('description', '')
        
        if not re.match(r'^\+?1?\d{9,15}$', phone_number):
            return jsonify({"error": "Invalid phone number format"}), 400
        
        try:
            c.execute("INSERT INTO authorized_numbers (phone_number, description) VALUES (?, ?)",
                      (phone_number, description))
            conn.commit()
            number_id = c.lastrowid
            conn.close()
            return jsonify({'id': number_id}), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({"error": "Phone number already exists"}), 400
    
    else:
        c.execute("SELECT id, phone_number, description FROM authorized_numbers")
        numbers = c.fetchall()
        conn.close()
        return jsonify([{
            'id': n[0],
            'phoneNumber': n[1],
            'description': n[2]
        } for n in numbers])

@app.route('/authorized_numbers/<int:number_id>', methods=['PUT', 'DELETE'])
def update_authorized_number(number_id):
    if not check_password_hash(app.config['AUTHORIZED_NUMBERS_PASSWORD'], request.headers.get('X-Password')):
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    
    if request.method == 'PUT':
        data = request.json
        phone_number = data.get('phoneNumber')
        description = data.get('description')
        
        if phone_number and not re.match(r'^\+?1?\d{9,15}$', phone_number):
            return jsonify({"error": "Invalid phone number format"}), 400
        
        try:
            if phone_number:
                c.execute("UPDATE authorized_numbers SET phone_number = ? WHERE id = ?", (phone_number, number_id))
            if description is not None:
                c.execute("UPDATE authorized_numbers SET description = ? WHERE id = ?", (description, number_id))
            conn.commit()
            conn.close()
            return '', 204
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({"error": "Phone number already exists"}), 400
    
    elif request.method == 'DELETE':
        c.execute("DELETE FROM authorized_numbers WHERE id = ?", (number_id,))
        conn.commit()
        conn.close()
        return '', 204

@app.route('/smswebhook', methods=['POST'])
def webhook():
    try:
        data = request.json
        if data['data']['event_type'] == 'message.received':
            message = data['data']['payload']['text']
            from_number = data['data']['payload']['from']['phone_number']
            
            # Check if the number is authorized
            conn = sqlite3.connect('tasks.db')
            c = conn.cursor()
            c.execute("SELECT id FROM authorized_numbers WHERE phone_number = ?", (from_number,))
            if not c.fetchone():
                conn.close()
                return jsonify({"error": "Unauthorized phone number"}), 403
            
            # Parse the message to extract task details
            task_parts = message.split(',')
            if len(task_parts) >= 2:
                task_text = task_parts[0].strip()
                due_date = task_parts[1].strip()
                status = 'pending'
                
                try:
                    due_date = datetime.strptime(due_date, '%Y-%m-%d').strftime('%Y-%m-%d')
                except ValueError:
                    due_date = datetime.now().strftime('%Y-%m-%d')
                
                # Store the task in the database, including the phone number
                c.execute("INSERT INTO tasks (text, due_date, status, created_date, phone_number) VALUES (?, ?, ?, ?, ?)",
                          (task_text, due_date, status, datetime.now().strftime('%Y-%m-%d'), from_number))
                conn.commit()
            
            conn.close()
        
        return '', 200
    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5001, host='0.0.0.0')