import { Component, For, Show, createSignal } from "solid-js";
import { useAppStore } from "../stores/appStore";

export const SettingsScreen: Component = () => {
  const [state, actions] = useAppStore();
  const [showAddProvider, setShowAddProvider] = createSignal(false);
  const [showLogin, setShowLogin] = createSignal(false);
  const [serverUrlInput, setServerUrlInput] = createSignal("");
  const [apiKeyInput, setApiKeyInput] = createSignal("");
  const [usernameInput, setUsernameInput] = createSignal("");
  const [newProvider, setNewProvider] = createSignal({ name: "", api_key: "", base_url: "", model: "" });

  const handleAddProvider = async () => {
    const p = newProvider();
    if (!p.name) return;
    await actions.setProvider({
      id: Date.now().toString(),
      name: p.name,
      api_key: p.api_key || null,
      base_url: p.base_url || null,
      model: p.model || null,
    });
    setShowAddProvider(false);
    setNewProvider({ name: "", api_key: "", base_url: "", model: "" });
  };

  const handleLogin = async () => {
    if (!serverUrlInput() || !apiKeyInput()) return;
    await actions.login(serverUrlInput(), apiKeyInput(), usernameInput() || "user");
    setShowLogin(false);
  };

  return (
    <div class="screen settings-screen">
      <header class="screen-header">
        <h1 class="screen-title">Settings</h1>
      </header>

      <div class="settings-content">
        {/* Server Status */}
        <section class="settings-section">
          <h2 class="section-title">Server</h2>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Status</span>
                <span class="setting-value">
                  {state.serverRunning ? "Running" : "Stopped"}
                </span>
              </div>
              <button
                class={`toggle-button ${state.serverRunning ? "active" : ""}`}
                onClick={() => (state.serverRunning ? actions.stopServer() : actions.startServer())}
              >
                {state.serverRunning ? "Stop" : "Start"}
              </button>
            </div>
          </div>
        </section>

        {/* Auth */}
        <section class="settings-section">
          <h2 class="section-title">Account</h2>
          <div class="settings-card">
            <Show when={state.loggedIn}>
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Logged in as</span>
                  <span class="setting-value">{state.username}</span>
                </div>
                <button class="secondary-button" onClick={() => actions.logout()}>
                  Logout
                </button>
              </div>
            </Show>
            <Show when={!state.loggedIn}>
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Not logged in</span>
                  <span class="setting-value">Connect to a server</span>
                </div>
                <button class="primary-button" onClick={() => setShowLogin(true)}>
                  Login
                </button>
              </div>
            </Show>
          </div>
        </section>

        {/* Providers */}
        <section class="settings-section">
          <div class="section-header">
            <h2 class="section-title">AI Providers</h2>
            <button class="text-button" onClick={() => setShowAddProvider(true)}>
              + Add
            </button>
          </div>
          <div class="settings-card">
            <Show when={state.providers.length > 0}>
              <For each={state.providers}>
                {(provider) => (
                  <div class="setting-row">
                    <div class="setting-info">
                      <span class="setting-label">{provider.name}</span>
                      <span class="setting-value">
                        {provider.model || "Default model"}
                      </span>
                    </div>
                    <Show when={state.currentProvider?.id === provider.id}>
                      <span class="active-badge">Active</span>
                    </Show>
                  </div>
                )}
              </For>
            </Show>
            <Show when={state.providers.length === 0}>
              <div class="empty-state-small">
                <p>No providers configured</p>
              </div>
            </Show>
          </div>
        </section>

        {/* Editor Settings */}
        <section class="settings-section">
          <h2 class="section-title">Editor</h2>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Font Size</span>
                <span class="setting-value">14px</span>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Tab Size</span>
                <span class="setting-value">2 spaces</span>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Word Wrap</span>
                <span class="setting-value">Enabled</span>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Minimap</span>
                <span class="setting-value">Disabled</span>
              </div>
            </div>
          </div>
        </section>

        {/* Terminal Settings */}
        <section class="settings-section">
          <h2 class="section-title">Terminal</h2>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Font Size</span>
                <span class="setting-value">13px</span>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Cursor Style</span>
                <span class="setting-value">Block</span>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Scrollback Lines</span>
                <span class="setting-value">1000</span>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section class="settings-section">
          <h2 class="section-title">About</h2>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Version</span>
                <span class="setting-value">1.0.0</span>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">License</span>
                <span class="setting-value">MIT</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Add Provider Modal */}
      <Show when={showAddProvider()}>
        <div class="modal-overlay" onClick={() => setShowAddProvider(false)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <h3 class="modal-title">Add Provider</h3>
            <input
              class="input"
              placeholder="Provider Name (e.g., OpenAI)"
              value={newProvider().name}
              onInput={(e) => setNewProvider({ ...newProvider(), name: e.currentTarget.value })}
            />
            <input
              class="input"
              placeholder="API Key"
              type="password"
              value={newProvider().api_key}
              onInput={(e) => setNewProvider({ ...newProvider(), api_key: e.currentTarget.value })}
            />
            <input
              class="input"
              placeholder="Base URL (optional)"
              value={newProvider().base_url}
              onInput={(e) => setNewProvider({ ...newProvider(), base_url: e.currentTarget.value })}
            />
            <input
              class="input"
              placeholder="Model (optional)"
              value={newProvider().model}
              onInput={(e) => setNewProvider({ ...newProvider(), model: e.currentTarget.value })}
            />
            <div class="modal-actions">
              <button class="secondary-button" onClick={() => setShowAddProvider(false)}>
                Cancel
              </button>
              <button class="primary-button" onClick={handleAddProvider}>
                Add
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Login Modal */}
      <Show when={showLogin()}>
        <div class="modal-overlay" onClick={() => setShowLogin(false)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <h3 class="modal-title">Login to Server</h3>
            <input
              class="input"
              placeholder="Server URL (e.g., http://192.168.1.100:4096)"
              value={serverUrlInput()}
              onInput={(e) => setServerUrlInput(e.currentTarget.value)}
            />
            <input
              class="input"
              placeholder="API Key"
              type="password"
              value={apiKeyInput()}
              onInput={(e) => setApiKeyInput(e.currentTarget.value)}
            />
            <input
              class="input"
              placeholder="Username (optional)"
              value={usernameInput()}
              onInput={(e) => setUsernameInput(e.currentTarget.value)}
            />
            <div class="modal-actions">
              <button class="secondary-button" onClick={() => setShowLogin(false)}>
                Cancel
              </button>
              <button class="primary-button" onClick={handleLogin}>
                Login
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
