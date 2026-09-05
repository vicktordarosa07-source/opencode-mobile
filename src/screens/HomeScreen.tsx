import { Component, For, Show, createSignal } from "solid-js";
import { useAppStore } from "../stores/appStore";

export const HomeScreen: Component = () => {
  const { projects, sessions, currentProject, loadSessions, createProject, createSession, selectProject, selectSession, deleteSession, deleteProject } = useAppStore();
  const [showNewProject, setShowNewProject] = createSignal(false);
  const [newProjectName, setNewProjectName] = createSignal("");
  const [newProjectPath, setNewProjectPath] = createSignal("");

  const handleCreateProject = async () => {
    const name = newProjectName();
    const path = newProjectPath();
    if (!name || !path) return;
    await createProject(name, path);
    setShowNewProject(false);
    setNewProjectName("");
    setNewProjectPath("");
  };

  const handleNewSession = async () => {
    const session = await createSession("New Session", currentProject()?.id);
    selectSession(session);
  };

  return (
    <div class="screen home-screen">
      <header class="screen-header">
        <h1 class="screen-title">OpenCode</h1>
        <button class="icon-button" onClick={() => setShowNewProject(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </header>

      {/* Projects */}
      <section class="home-section">
        <h2 class="section-title">Projects</h2>
        <Show when={projects.length > 0}>
          <div class="project-list">
            <For each={projects}>
              {(project) => (
                <div
                  class={`project-card ${currentProject()?.id === project.id ? "active" : ""}`}
                  onClick={() => selectProject(project)}
                >
                  <div
                    class="project-icon"
                    style={{ "background-color": project.icon_color || "#4a9eff" }}
                  >
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div class="project-info">
                    <span class="project-name">{project.name}</span>
                    <span class="project-path">{project.path}</span>
                  </div>
                  <button
                    class="icon-button-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
        <Show when={projects.length === 0}>
          <div class="empty-state">
            <p>No projects yet</p>
            <button class="primary-button" onClick={() => setShowNewProject(true)}>
              Create Project
            </button>
          </div>
        </Show>
      </section>

      {/* Recent Sessions */}
      <section class="home-section">
        <div class="section-header">
          <h2 class="section-title">Recent Sessions</h2>
          <button class="text-button" onClick={handleNewSession}>
            + New
          </button>
        </div>
        <Show when={sessions.length > 0}>
          <div class="session-list">
            <For each={sessions.slice(0, 10)}>
              {(session) => (
                <div class="session-card" onClick={() => selectSession(session)}>
                  <div class="session-info">
                    <span class="session-title">{session.title || "Untitled"}</span>
                    <span class="session-agent">{session.agent || "build"}</span>
                  </div>
                  <span class="session-time">
                    {new Date(session.time_updated).toLocaleDateString()}
                  </span>
                  <button
                    class="icon-button-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
        <Show when={sessions.length === 0}>
          <div class="empty-state">
            <p>No sessions yet</p>
            <button class="primary-button" onClick={handleNewSession}>
              Start Chatting
            </button>
          </div>
        </Show>
      </section>

      {/* New Project Modal */}
      <Show when={showNewProject()}>
        <div class="modal-overlay" onClick={() => setShowNewProject(false)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <h3 class="modal-title">New Project</h3>
            <input
              class="input"
              placeholder="Project Name"
              value={newProjectName()}
              onInput={(e) => setNewProjectName(e.currentTarget.value)}
            />
            <input
              class="input"
              placeholder="Project Path (e.g., /sdcard/MyProject)"
              value={newProjectPath()}
              onInput={(e) => setNewProjectPath(e.currentTarget.value)}
            />
            <div class="modal-actions">
              <button class="secondary-button" onClick={() => setShowNewProject(false)}>
                Cancel
              </button>
              <button class="primary-button" onClick={handleCreateProject}>
                Create
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
