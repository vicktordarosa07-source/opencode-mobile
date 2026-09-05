use std::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthState {
    pub logged_in: bool,
    pub server_url: Option<String>,
    pub api_key: Option<String>,
    pub username: Option<String>,
}

impl Default for AuthState {
    fn default() -> Self {
        Self {
            logged_in: false,
            server_url: None,
            api_key: None,
            username: None,
        }
    }
}

impl AuthState {
    pub fn new() -> Self {
        Self::default()
    }
}

pub struct AuthManager {
    state: Mutex<AuthState>,
}

impl AuthManager {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(AuthState::new()),
        }
    }
    
    pub fn get_state(&self) -> AuthState {
        self.state.lock().unwrap().clone()
    }
    
    pub fn login(&self, server_url: String, api_key: String, username: String) {
        let mut state = self.state.lock().unwrap();
        state.logged_in = true;
        state.server_url = Some(server_url);
        state.api_key = Some(api_key);
        state.username = Some(username);
    }
    
    pub fn logout(&self) {
        let mut state = self.state.lock().unwrap();
        state.logged_in = false;
        state.server_url = None;
        state.api_key = None;
        state.username = None;
    }
}
