from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import datetime
from dotenv import load_dotenv
import os
import telnyx

load_dotenv()
telnyx.api_key = os.getenv('TELNYX_API_KEY')

app = Flask(__name__)

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
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

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

@app.route('/smswebhook', methods=['POST'])
def webhook():
    try:
        data = request.json
        if data['data']['event_type'] == 'message.received':
            message = data['data']['payload']['text']
            from_number = data['data']['payload']['from']['phone_number']
            
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
                conn = sqlite3.connect('tasks.db')
                c = conn.cursor()
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