use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub hostname: String,
    pub port: u16,
    pub username: String,
    pub password: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            hostname: "127.0.0.1".to_string(),
            port: 4096,
            username: "opencode".to_string(),
            password: uuid::Uuid::new_v4().to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub running: bool,
    pub url: Option<String>,
    pub pid: Option<u32>,
}

pub struct ServerManager {
    config: RwLock<ServerConfig>,
    status: RwLock<ServerStatus>,
}

impl ServerManager {
    pub fn new() -> Self {
        Self {
            config: RwLock::new(ServerConfig::default()),
            status: RwLock::new(ServerStatus {
                running: false,
                url: None,
                pid: None,
            }),
        }
    }
    
    pub async fn start(&self) -> Result<String> {
        let config = self.config.read().await.clone();
        let url = format!("http://{}:{}", config.hostname, config.port);
        
        // Start the OpenCode server process
        // In production, this would spawn the actual opencode server binary
        // For now, we'll use the embedded server
        
        let mut status = self.status.write().await;
        status.running = true;
        status.url = Some(url.clone());
        status.pid = Some(std::process::id());
        
        Ok(url)
    }
    
    pub async fn stop(&self) -> Result<()> {
        let mut status = self.status.write().await;
        status.running = false;
        status.url = None;
        status.pid = None;
        Ok(())
    }
    
    pub async fn get_status(&self) -> ServerStatus {
        self.status.read().await.clone()
    }
    
    pub async fn get_config(&self) -> ServerConfig {
        self.config.read().await.clone()
    }
    
    pub async fn set_config(&self, config: ServerConfig) {
        let mut cfg = self.config.write().await;
        *cfg = config;
    }
}
