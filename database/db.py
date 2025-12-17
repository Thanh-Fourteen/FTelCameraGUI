import sqlite3
import os

DB_FOLDER = "database"
DB_NAME = "vast_nodes.db"
DB_PATH = os.path.join(DB_FOLDER, DB_NAME)

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row 
    return conn

def create_table():
    if not os.path.exists(DB_FOLDER):
        os.makedirs(DB_FOLDER)

    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS instances (
            instance_id TEXT PRIMARY KEY,
            ip_address TEXT,
            port INTEGER,
            port_mappings TEXT,   
            kafka_topics TEXT,   
            cameras TEXT,        
            status TEXT
        )
    """)
    
    conn.commit()
    conn.close()