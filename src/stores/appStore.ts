import { createContext, useContext, ParentComponent } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { invoke } from "@tauri-apps/api/core";

// ============ Types ============

export interface Session {
  id: string;
  title: string | null;
  agent: string | null;
  project_id: string | null;
  time_created: string;
  time_updated: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string | null;
  agent: string | null;
  model: string | null;
  time_created: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  icon_url: string | null;
  icon_color: string | null;
  time_created: string;
  time_updated: string;
}

export interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number | null;
  modified: string | null;
}

export interface TerminalState {
  id: string | null;
  cwd: string;
}

export interface Provider {
  id: string;
  name: string;
  api_key: string | null;
  base_url: string | null;
  model: string | null;
}

// ============ Store State ============

export interface StoreState {
  // Navigation
  currentTab: "home" | "editor" | "terminal" | "chat" | "settings";

  // Sessions
  sessions: Session[];
  currentSession: Session | null;
  messages: Message[];

  // Projects
  projects: Project[];
  currentProject: Project | null;

  // File Explorer
  currentPath: string;
  files: FileInfo[];
  selectedFile: FileInfo | null;
  fileContent: string | null;

  // Terminal
  terminal: TerminalState;

  // Editor
  editorContent: string;
  editorDirty: boolean;

  // Provider
  providers: Provider[];
  currentProvider: Provider | null;

  // Auth
  loggedIn: boolean;
  serverUrl: string | null;
  username: string | null;

  // Server
  serverRunning: boolean;
}

// ============ Store Actions ============

export interface StoreActions {
  // Navigation
  setTab: (tab: StoreState["currentTab"]) => void;

  // Sessions
  loadSessions: (projectId?: string) => Promise<void>;
  createSession: (title?: string, projectId?: string) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  selectSession: (session: Session) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;

  // Projects
  loadProjects: () => Promise<void>;
  createProject: (name: string, path: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (project: Project) => void;

  // File Explorer
  loadDirectory: (path: string) => Promise<void>;
  selectFile: (file: FileInfo) => Promise<void>;
  saveFile: (content: string) => Promise<void>;

  // Terminal
  createTerminal: () => Promise<void>;
  writeToTerminal: (data: string) => Promise<void>;

  // Editor
  setEditorContent: (content: string) => void;

  // Provider
  loadProviders: () => Promise<void>;
  setProvider: (provider: Provider) => Promise<void>;

  // Auth
  login: (serverUrl: string, apiKey: string, username: string) => Promise<void>;
  logout: () => Promise<void>;

  // Server
  startServer: () => Promise<void>;
  stopServer: () => Promise<void>;

  // Init
  init: () => Promise<void>;
}

// ============ Context ============

export type StoreContextType = [state: StoreState, actions: StoreActions];

const StoreContext = createContext<StoreContextType>();

// ============ Provider ============

export const StoreProvider: ParentComponent = (props) => {
  const [state, setState] = createStore<StoreState>({
    currentTab: "home",
    sessions: [],
    currentSession: null,
    messages: [],
    projects: [],
    currentProject: null,
    currentPath: "",
    files: [],
    selectedFile: null,
    fileContent: null,
    terminal: { id: null, cwd: "" },
    editorContent: "",
    editorDirty: false,
    providers: [],
    currentProvider: null,
    loggedIn: false,
    serverUrl: null,
    username: null,
    serverRunning: false,
  });

  const actions: StoreActions = {
    // Navigation
    setTab: (tab) => setState("currentTab", tab),

    // Sessions
    loadSessions: async (projectId) => {
      try {
        const sessions = await invoke<Session[]>("list_sessions", { projectId });
        setState("sessions", sessions);
      } catch (e) {
        console.error("Failed to load sessions:", e);
      }
    },

    createSession: async (title, projectId) => {
      const session = await invoke<Session>("create_session", { title, projectId });
      setState("sessions", (prev) => [session, ...prev]);
      return session;
    },

    deleteSession: async (id) => {
      await invoke("delete_session", { sessionId: id });
      setState("sessions", (prev) => prev.filter((sess) => sess.id !== id));
      if (state.currentSession?.id === id) {
        setState("currentSession", null);
      }
    },

    selectSession: async (session) => {
      setState("currentSession", session);
      setState("currentTab", "chat");
      try {
        const messages = await invoke<Message[]>("get_session_messages", {
          sessionId: session.id,
        });
        setState("messages", messages);
      } catch (e) {
        console.error("Failed to load messages:", e);
      }
    },

    sendMessage: async (content) => {
      if (!state.currentSession) return;

      const userMessage = await invoke<Message>("send_message", {
        sessionId: state.currentSession.id,
        content,
      });

      setState("messages", (prev) => [...prev, userMessage]);
    },

    // Projects
    loadProjects: async () => {
      try {
        const projects = await invoke<Project[]>("list_projects");
        setState("projects", projects);
      } catch (e) {
        console.error("Failed to load projects:", e);
      }
    },

    createProject: async (name, path) => {
      const project = await invoke<Project>("create_project", { name, path });
      setState("projects", (prev) => [project, ...prev]);
      return project;
    },

    deleteProject: async (id) => {
      await invoke("delete_project", { projectId: id });
      setState("projects", (prev) => prev.filter((p) => p.id !== id));
      if (state.currentProject?.id === id) {
        setState("currentProject", null);
      }
    },

    selectProject: (project) => {
      setState("currentProject", project);
      setState("currentPath", project.path);
      actions.loadDirectory(project.path);
    },

    // File Explorer
    loadDirectory: async (path) => {
      try {
        const files = await invoke<FileInfo[]>("list_directory", { path });
        setState("currentPath", path);
        setState("files", files);
      } catch (e) {
        console.error("Failed to load directory:", e);
        setState("files", []);
      }
    },

    selectFile: async (file) => {
      if (file.is_dir) {
        actions.loadDirectory(file.path);
      } else {
        try {
          const content = await invoke<string>("read_file", { path: file.path });
          setState("selectedFile", file);
          setState("fileContent", content);
          setState("editorContent", content);
          setState("editorDirty", false);
          setState("currentTab", "editor");
        } catch (e) {
          console.error("Failed to read file:", e);
        }
      }
    },

    saveFile: async (content) => {
      if (!state.selectedFile) return;
      await invoke("write_file", { path: state.selectedFile.path, content });
      setState("editorContent", content);
      setState("editorDirty", false);
    },

    // Terminal
    createTerminal: async () => {
      try {
        const cwd = state.currentProject?.path || "";
        const info = await invoke<{ id: string }>("terminal_create", { cwd });
        setState("terminal", { id: info.id, cwd });
      } catch (e) {
        console.error("Failed to create terminal:", e);
      }
    },

    writeToTerminal: async (data) => {
      if (!state.terminal.id) return;
      await invoke("terminal_write", { terminalId: state.terminal.id, data });
    },

    // Editor
    setEditorContent: (content) => {
      setState("editorContent", content);
      setState("editorDirty", true);
    },

    // Provider
    loadProviders: async () => {
      try {
        const providers = await invoke<Provider[]>("list_providers");
        setState("providers", providers);
        setState("currentProvider", providers[0] || null);
      } catch (e) {
        console.error("Failed to load providers:", e);
      }
    },

    setProvider: async (provider) => {
      await invoke("set_provider", {
        id: provider.id,
        name: provider.name,
        apiKey: provider.api_key,
        baseUrl: provider.base_url,
        model: provider.model,
      });
      setState("currentProvider", provider);
    },

    // Auth
    login: async (serverUrl, apiKey, username) => {
      await invoke("login", { serverUrl, apiKey, username });
      setState("loggedIn", true);
      setState("serverUrl", serverUrl);
      setState("username", username);
    },

    logout: async () => {
      await invoke("logout");
      setState("loggedIn", false);
      setState("serverUrl", null);
      setState("username", null);
    },

    // Server
    startServer: async () => {
      await invoke("start_server");
      setState("serverRunning", true);
    },

    stopServer: async () => {
      await invoke("stop_server");
      setState("serverRunning", false);
    },

    // Init
    init: async () => {
      await Promise.all([
        actions.loadProjects(),
        actions.loadSessions(),
        actions.loadProviders(),
      ]);
    },
  };

  return (
    <StoreContext.Provider value={[state, actions]}>
      {props.children}
    </StoreContext.Provider>
  );
};

// ============ Hook ============

export function useAppStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useAppStore must be used within a StoreProvider");
  }
  return ctx;
}
