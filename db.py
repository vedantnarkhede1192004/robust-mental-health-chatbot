"""SQLite storage for chat history and mood check-ins (free, built into Python)."""
import sqlite3
from contextlib import closing

DB_PATH = "chat.db"


def _connect():
    return sqlite3.connect(DB_PATH)


def init_db():
    with closing(_connect()) as conn, conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS messages (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   session_id TEXT NOT NULL,
                   role TEXT NOT NULL,
                   content TEXT NOT NULL,
                   created_at TEXT DEFAULT CURRENT_TIMESTAMP
               )"""
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_session ON messages(session_id)")
        conn.execute(
            """CREATE TABLE IF NOT EXISTS moods (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   session_id TEXT NOT NULL,
                   score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
                   created_at TEXT DEFAULT CURRENT_TIMESTAMP
               )"""
        )


def add_message(session_id: str, role: str, content: str):
    with closing(_connect()) as conn, conn:
        conn.execute(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
            (session_id, role, content),
        )


def get_history(session_id: str, limit: int = 12) -> list:
    """Return the last `limit` messages, oldest first."""
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE session_id = ? "
            "ORDER BY id DESC LIMIT ?",
            (session_id, limit),
        ).fetchall()
    return [{"role": r, "content": c} for r, c in reversed(rows)]


def delete_last_message(session_id: str):
    with closing(_connect()) as conn, conn:
        conn.execute(
            "DELETE FROM messages WHERE id = (SELECT MAX(id) FROM messages WHERE session_id = ?)",
            (session_id,),
        )


def clear_session(session_id: str):
    with closing(_connect()) as conn, conn:
        conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        conn.execute("DELETE FROM moods WHERE session_id = ?", (session_id,))


def add_mood(session_id: str, score: int):
    with closing(_connect()) as conn, conn:
        conn.execute("INSERT INTO moods (session_id, score) VALUES (?, ?)", (session_id, score))


def get_moods(session_id: str, limit: int = 14) -> list:
    """Return the last `limit` mood check-ins, oldest first."""
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT score, created_at FROM moods WHERE session_id = ? ORDER BY id DESC LIMIT ?",
            (session_id, limit),
        ).fetchall()
    return [{"score": s, "time": t} for s, t in reversed(rows)]