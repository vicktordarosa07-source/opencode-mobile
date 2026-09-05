use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::Database;
use crate::auth::AuthState;

// ============ Server Commands ============

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerStatusResponse {
    pub running: bool,
    pub url: Option<String>,
}

#[tauri::command]
pub async fn start_server(
    db: State<'_, Database>,
) -> Result<ServerStatusResponse, String> {
    // Start embedded OpenCode server
    Ok(ServerStatusResponse {
        running: true,
        url: Some("http://127.0.0.1:4096".to_string()),
    })
}

#[tauri::command]
pub async fn stop_server() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn get_server_status() -> Result<ServerStatusResponse, String> {
    Ok(ServerStatusResponse {
        running: true,
        url: Some("http://127.0.0.1:4096".to_string()),
    })
}

// ============ Session Commands ============

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionInfo {
    pub id: String,
    pub title: Option<String>,
    pub agent: Option<String>,
    pub project_id: Option<String>,
    pub time_created: String,
    pub time_updated: String,
}

#[tauri::command]
pub async fn list_sessions(
    db: State<'_, Database>,
    project_id: Option<String>,
) -> Result<Vec<SessionInfo>, String> {
    let sessions = if let Some(pid) = project_id {
        db.query_map(
            "SELECT id, title, agent, project_id, time_created, time_updated FROM session WHERE project_id = ?1 ORDER BY time_updated DESC",
            &[&pid.as_str()],
            |row| SessionInfo {
                id: row.get(0)?,
                title: row.get(1)?,
                agent: row.get(2)?,
                project_id: row.get(3)?,
                time_created: row.get(4)?,
                time_updated: row.get(5)?,
            },
        )
    } else {
        db.query_map(
            "SELECT id, title, agent, project_id, time_created, time_updated FROM session ORDER BY time_updated DESC",
            &[],
            |row| SessionInfo {
                id: row.get(0)?,
                title: row.get(1)?,
                agent: row.get(2)?,
                project_id: row.get(3)?,
                time_created: row.get(4)?,
                time_updated: row.get(5)?,
            },
        )
    };
    sessions.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_session(
    db: State<'_, Database>,
    title: Option<String>,
    project_id: Option<String>,
    agent: Option<String>,
) -> Result<SessionInfo, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let title = title.unwrap_or_else(|| "New Session".to_string());
    let agent = agent.unwrap_or_else(|| "build".to_string());
    
    db.execute(
        "INSERT INTO session (id, title, agent, project_id) VALUES (?1, ?2, ?3, ?4)",
        &[&id.as_str(), &title.as_str(), &agent.as_str(), &project_id.as_deref()],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(SessionInfo {
        id,
        title: Some(title),
        agent: Some(agent),
        project_id,
        time_created: chrono::Utc::now().to_rfc3339(),
        time_updated: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn delete_session(
    db: State<'_, Database>,
    session_id: String,
) -> Result<(), String> {
    db.execute("DELETE FROM session WHERE id = ?1", &[&session_id.as_str()])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageInfo {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: Option<String>,
    pub agent: Option<String>,
    pub model: Option<String>,
    pub time_created: String,
}

#[tauri::command]
pub async fn get_session_messages(
    db: State<'_, Database>,
    session_id: String,
) -> Result<Vec<MessageInfo>, String> {
    let messages = db.query_map(
        "SELECT id, session_id, role, content, agent, model, time_created FROM message WHERE session_id = ?1 ORDER BY time_created ASC",
        &[&session_id.as_str()],
        |row| MessageInfo {
            id: row.get(0)?,
            session_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            agent: row.get(4)?,
            model: row.get(5)?,
            time_created: row.get(6)?,
        },
    );
    messages.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn send_message(
    db: State<'_, Database>,
    session_id: String,
    content: String,
    agent: Option<String>,
) -> Result<MessageInfo, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let agent = agent.unwrap_or_else(|| "build".to_string());
    
    // Save user message
    db.execute(
        "INSERT INTO message (id, session_id, role, content, agent) VALUES (?1, ?2, 'user', ?3, ?4)",
        &[&id.as_str(), &session_id.as_str(), &content.as_str(), &agent.as_str()],
    )
    .map_err(|e| e.to_string())?;
    
    // Update session timestamp
    db.execute(
        "UPDATE session SET time_updated = datetime('now') WHERE id = ?1",
        &[&session_id.as_str()],
    )
    .map_err(|e| e.to_string())?;
    
    // In production, this would trigger the agent loop
    // For now, return the user message
    Ok(MessageInfo {
        id,
        session_id,
        role: "user".to_string(),
        content: Some(content),
        agent: Some(agent),
        model: None,
        time_created: chrono::Utc::now().to_rfc3339(),
    })
}

// ============ Project Commands ============

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub icon_url: Option<String>,
    pub icon_color: Option<String>,
    pub time_created: String,
    pub time_updated: String,
}

#[tauri::command]
pub async fn list_projects(
    db: State<'_, Database>,
) -> Result<Vec<ProjectInfo>, String> {
    let projects = db.query_map(
        "SELECT id, name, path, icon_url, icon_color, time_created, time_updated FROM project ORDER BY time_updated DESC",
        &[],
        |row| ProjectInfo {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            icon_url: row.get(3)?,
            icon_color: row.get(4)?,
            time_created: row.get(5)?,
            time_updated: row.get(6)?,
        },
    );
    projects.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_project(
    db: State<'_, Database>,
    name: String,
    path: String,
    icon_color: Option<String>,
) -> Result<ProjectInfo, String> {
    let id = uuid::Uuid::new_v4().to_string();
    
    db.execute(
        "INSERT INTO project (id, name, path, icon_color) VALUES (?1, ?2, ?3, ?4)",
        &[&id.as_str(), &name.as_str(), &path.as_str(), &icon_color.as_deref()],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(ProjectInfo {
        id,
        name,
        path,
        icon_url: None,
        icon_color,
        time_created: chrono::Utc::now().to_rfc3339(),
        time_updated: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn delete_project(
    db: State<'_, Database>,
    project_id: String,
) -> Result<(), String> {
    db.execute("DELETE FROM project WHERE id = ?1", &[&project_id.as_str()])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ============ Config Commands ============

#[tauri::command]
pub async fn get_config(
    db: State<'_, Database>,
    key: String,
) -> Result<Option<String>, String> {
    let result = db.query_map(
        "SELECT value FROM config WHERE key = ?1",
        &[&key.as_str()],
        |row| row.get::<_, String>(0),
    );
    match result {
        Ok(mut rows) => Ok(rows.pop().unwrap_or(None)),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn set_config(
    db: State<'_, Database>,
    key: String,
    value: String,
) -> Result<(), String> {
    db.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES (?1, ?2)",
        &[&key.as_str(), &value.as_str()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ============ Provider Commands ============

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
}

#[tauri::command]
pub async fn list_providers(
    db: State<'_, Database>,
) -> Result<Vec<ProviderInfo>, String> {
    let providers = db.query_map(
        "SELECT id, name, api_key, base_url, model FROM provider ORDER BY name",
        &[],
        |row| ProviderInfo {
            id: row.get(0)?,
            name: row.get(1)?,
            api_key: row.get(2)?,
            base_url: row.get(3)?,
            model: row.get(4)?,
        },
    );
    providers.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_provider(
    db: State<'_, Database>,
    id: String,
    name: String,
    api_key: Option<String>,
    base_url: Option<String>,
    model: Option<String>,
) -> Result<(), String> {
    db.execute(
        "INSERT OR REPLACE INTO provider (id, name, api_key, base_url, model) VALUES (?1, ?2, ?3, ?4, ?5)",
        &[&id.as_str(), &name.as_str(), &api_key.as_deref(), &base_url.as_deref(), &model.as_deref()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ============ Auth Commands ============

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthStatusResponse {
    pub logged_in: bool,
    pub server_url: Option<String>,
    pub username: Option<String>,
}

#[tauri::command]
pub async fn login(
    server_url: String,
    api_key: String,
    username: String,
) -> Result<AuthStatusResponse, String> {
    // In production, validate credentials against server
    Ok(AuthStatusResponse {
        logged_in: true,
        server_url: Some(server_url),
        username: Some(username),
    })
}

#[tauri::command]
pub async fn logout() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn get_auth_status() -> Result<AuthStatusResponse, String> {
    Ok(AuthStatusResponse {
        logged_in: false,
        server_url: None,
        username: None,
    })
}

// ============ Terminal Commands ============

#[derive(Debug, Serialize, Deserialize)]
pub struct TerminalInfo {
    pub id: String,
    pub pid: Option<u32>,
}

#[tauri::command]
pub async fn terminal_create(
    cwd: Option<String>,
) -> Result<TerminalInfo, String> {
    let id = uuid::Uuid::new_v4().to_string();
    // In production, spawn PTY process
    Ok(TerminalInfo { id, pid: None })
}

#[tauri::command]
pub async fn terminal_write(
    terminal_id: String,
    data: String,
) -> Result<(), String> {
    // Write to PTY stdin
    Ok(())
}

#[tauri::command]
pub async fn terminal_resize(
    terminal_id: String,
    cols: u32,
    rows: u32,
) -> Result<(), String> {
    // Resize PTY
    Ok(())
}

#[tauri::command]
pub async fn terminal_close(
    terminal_id: String,
) -> Result<(), String> {
    // Kill PTY process
    Ok(())
}

// ============ File Operations ============

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub modified: Option<String>,
}

#[tauri::command]
pub async fn read_file(
    path: String,
) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file(
    path: String,
    content: String,
) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_directory(
    path: String,
) -> Result<Vec<FileInfo>, String> {
    let entries = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut files = Vec::new();
    
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        
        files.push(FileInfo {
            name: name.clone(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: if metadata.is_file() { Some(metadata.len()) } else { None },
            modified: metadata.modified()
                .ok()
                .and_then(|t| {
                    let datetime: chrono::DateTime<chrono::Utc> = t.into();
                    Some(datetime.to_rfc3339())
                }),
        });
    }
    
    files.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });
    
    Ok(files)
}

#[tauri::command]
pub async fn create_directory(
    path: String,
) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_path(
    path: String,
) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.is_dir() {
        std::fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn rename_path(
    from: String,
    to: String,
) -> Result<(), String> {
    std::fs::rename(&from, &to).map_err(|e| e.to_string())
}

// ============ Git Commands ============

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatusInfo {
    pub branch: Option<String>,
    pub modified: Vec<String>,
    pub added: Vec<String>,
    pub deleted: Vec<String>,
    pub untracked: Vec<String>,
}

#[tauri::command]
pub async fn git_status(
    path: String,
) -> Result<GitStatusInfo, String> {
    // In production, use git2 crate
    Ok(GitStatusInfo {
        branch: Some("main".to_string()),
        modified: Vec::new(),
        added: Vec::new(),
        deleted: Vec::new(),
        untracked: Vec::new(),
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitDiffInfo {
    pub file: String,
    pub additions: u32,
    pub deletions: u32,
    pub diff: String,
}

#[tauri::command]
pub async fn git_diff(
    path: String,
    file: Option<String>,
) -> Result<Vec<GitDiffInfo>, String> {
    Ok(Vec::new())
}

#[tauri::command]
pub async fn git_commit(
    path: String,
    message: String,
    files: Option<Vec<String>>,
) -> Result<String, String> {
    Ok("committed".to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitLogEntry {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

#[tauri::command]
pub async fn git_log(
    path: String,
    limit: Option<u32>,
) -> Result<Vec<GitLogEntry>, String> {
    Ok(Vec::new())
}
