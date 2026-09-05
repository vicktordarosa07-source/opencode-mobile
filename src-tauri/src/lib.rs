mod commands;
mod db;
mod server;
mod auth;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Initialize database
            let db_path = app_handle
                .path()
                .app_data_dir()
                .expect("failed to get app data dir")
                .join("opencode.db");
            
            std::fs::create_dir_all(db_path.parent().unwrap()).ok();
            
            let db = db::Database::new(&db_path)
                .expect("failed to initialize database");
            
            app_handle.manage(db);
            
            // Initialize auth state
            app_handle.manage(auth::AuthState::new());
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Server
            commands::start_server,
            commands::stop_server,
            commands::get_server_status,
            // Sessions
            commands::list_sessions,
            commands::create_session,
            commands::delete_session,
            commands::get_session_messages,
            commands::send_message,
            // Projects
            commands::list_projects,
            commands::create_project,
            commands::delete_project,
            // Config
            commands::get_config,
            commands::set_config,
            // Provider
            commands::list_providers,
            commands::set_provider,
            // Auth
            commands::login,
            commands::logout,
            commands::get_auth_status,
            // Terminal
            commands::terminal_create,
            commands::terminal_write,
            commands::terminal_resize,
            commands::terminal_close,
            // File operations
            commands::read_file,
            commands::write_file,
            commands::list_directory,
            commands::create_directory,
            commands::delete_path,
            commands::rename_path,
            // Git
            commands::git_status,
            commands::git_diff,
            commands::git_commit,
            commands::git_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running opencode mobile");
}
