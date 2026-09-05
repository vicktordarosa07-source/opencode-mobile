use rusqlite::{Connection, params};
use std::path::Path;
use std::sync::Mutex;
use anyhow::Result;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        
        conn.execute_batch("
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=NORMAL;
            PRAGMA foreign_keys=ON;
            
            CREATE TABLE IF NOT EXISTS project (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                icon_url TEXT,
                icon_color TEXT,
                time_created TEXT NOT NULL DEFAULT (datetime('now')),
                time_updated TEXT NOT NULL DEFAULT (datetime('now'))
            );
            
            CREATE TABLE IF NOT EXISTS session (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                title TEXT,
                agent TEXT DEFAULT 'build',
                time_created TEXT NOT NULL DEFAULT (datetime('now')),
                time_updated TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS message (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT,
                agent TEXT,
                model TEXT,
                time_created TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS part (
                id TEXT PRIMARY KEY,
                message_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                type TEXT NOT NULL,
                content TEXT,
                time_created TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (message_id) REFERENCES message(id) ON DELETE CASCADE,
                FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS provider (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                api_key TEXT,
                base_url TEXT,
                model TEXT,
                time_created TEXT NOT NULL DEFAULT (datetime('now')),
                time_updated TEXT NOT NULL DEFAULT (datetime('now'))
            );
        ")?;
        
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
    
    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::types::ToSql]) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        Ok(conn.execute(sql, params)?)
    }
    
    pub fn query_row<T, F>(&self, sql: &str, params: &[&dyn rusqlite::types::ToSql], f: F) -> Result<T>
    where
        T: Default,
        F: FnOnce(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
    {
        let conn = self.conn.lock().unwrap();
        match conn.query_row(sql, params, f) {
            Ok(val) => Ok(val),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(T::default()),
            Err(e) => Err(e.into()),
        }
    }
    
    pub fn query_map<T, F>(&self, sql: &str, params: &[&dyn rusqlite::types::ToSql], f: F) -> Result<Vec<T>>
    where
        F: FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
    {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map(params, f)?;
        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }
}
