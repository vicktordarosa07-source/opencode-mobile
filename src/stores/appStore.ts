import { create } from "zustand";
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

export interface AppState {
  // Navigation
  currentTab: "home" | "editor" | "terminal" | "chat" | "settings";
  setTab: (tab: AppState["currentTab"]) => void;

  // Sessions
  sessions: Session[];
  currentSession: Session | null;
  messages: Message[];
  loadSessions: (projectId?: string) => Promise<void>;
  createSession: (title?: string, projectId?: string) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  selectSession: (session: Session) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;

  // Projects
  projects: Project[];
  currentProject: Project | null;
  loadProjects: () => Promise<void>;
  createProject: (name: string, path: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (project: Project) => void;

  // File Explorer
  currentPath: string;
  files: FileInfo[];
  selectedFile: FileInfo | null;
  fileContent: string | null;
  loadDirectory: (path: string) => Promise<void>;
  selectFile: (file: FileInfo) => Promise<void>;
  saveFile: (content: string) => Promise<void>;

  // Terminal
  terminal: TerminalState;
  createTerminal: () => Promise<void>;
  writeToTerminal: (data: string) => Promise<void>;

  // Editor
  editorContent: string;
  setEditorContent: (content: string) => void;
  editorDirty: boolean;

  // Provider
  providers: Provider[];
  currentProvider: Provider | null;
  loadProviders: () => Promise<void>;
  setProvider: (provider: Provider) => Promise<void>;

  // Auth
  loggedIn: boolean;
  serverUrl: string | null;
  username: string | null;
  login: (serverUrl: string, apiKey: string, username: string) => Promise<void>;
  logout: () => Promise<void>;

  // Server
  serverRunning: boolean;
  startServer: () => Promise<void>;
  stopServer: () => Promise<void>;

  // Init
  init: () => Promise<void>;
}

// ============ Store ============

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentTab: "home",
  setTab: (tab) => set({ currentTab: tab }),

  // Sessions
  sessions: [],
  currentSession: null,
  messages: [],

  loadSessions: async (projectId) => {
    try {
      const sessions = await invoke<Session[]>("list_sessions", { projectId });
      set({ sessions });
    } catch (e) {
      console.error("Failed to load sessions:", e);
    }
  },

  createSession: async (title, projectId) => {
    const session = await invoke<Session>("create_session", { title, projectId });
    set((s) => ({ sessions: [session, ...s.sessions] }));
    return session;
  },

  deleteSession: async (id) => {
    await invoke("delete_session", { sessionId: id });
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
      currentSession: s.currentSession?.id === id ? null : s.currentSession,
    }));
  },

  selectSession: async (session) => {
    set({ currentSession: session, currentTab: "chat" });
    try {
      const messages = await invoke<Message[]>("get_session_messages", {
        sessionId: session.id,
      });
      set({ messages });
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  },

  sendMessage: async (content) => {
    const { currentSession } = get();
    if (!currentSession) return;

    const userMessage = await invoke<Message>("send_message", {
      sessionId: currentSession.id,
      content,
    });

    set((s) => ({ messages: [...s.messages, userMessage] }));

    // TODO: Trigger agent loop and stream assistant response
  },

  // Projects
  projects: [],
  currentProject: null,

  loadProjects: async () => {
    try {
      const projects = await invoke<Project[]>("list_projects");
      set({ projects });
    } catch (e) {
      console.error("Failed to load projects:", e);
    }
  },

  createProject: async (name, path) => {
    const project = await invoke<Project>("create_project", { name, path });
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  deleteProject: async (id) => {
    await invoke("delete_project", { projectId: id });
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProject: s.currentProject?.id === id ? null : s.currentProject,
    }));
  },

  selectProject: (project) => {
    set({ currentProject: project, currentPath: project.path });
    get().loadDirectory(project.path);
  },

  // File Explorer
  currentPath: "",
  files: [],
  selectedFile: null,
  fileContent: null,

  loadDirectory: async (path) => {
    try {
      const files = await invoke<FileInfo[]>("list_directory", { path });
      set({ currentPath: path, files });
    } catch (e) {
      console.error("Failed to load directory:", e);
      set({ files: [] });
    }
  },

  selectFile: async (file) => {
    if (file.is_dir) {
      get().loadDirectory(file.path);
    } else {
      try {
        const content = await invoke<string>("read_file", { path: file.path });
        set({ selectedFile: file, fileContent: content, editorContent: content, editorDirty: false, currentTab: "editor" });
      } catch (e) {
        console.error("Failed to read file:", e);
      }
    }
  },

  saveFile: async (content) => {
    const { selectedFile } = get();
    if (!selectedFile) return;
    await invoke("write_file", { path: selectedFile.path, content });
    set({ editorContent: content, editorDirty: false });
  },

  // Terminal
  terminal: { id: null, cwd: "" },

  createTerminal: async () => {
    try {
      const { currentProject } = get();
      const cwd = currentProject?.path || "";
      const info = await invoke<{ id: string }>("terminal_create", { cwd });
      set({ terminal: { id: info.id, cwd } });
    } catch (e) {
      console.error("Failed to create terminal:", e);
    }
  },

  writeToTerminal: async (data) => {
    const { terminal } = get();
    if (!terminal.id) return;
    await invoke("terminal_write", { terminalId: terminal.id, data });
  },

  // Editor
  editorContent: "",
  editorDirty: false,
  setEditorContent: (content) => set({ editorContent: content, editorDirty: true }),

  // Provider
  providers: [],
  currentProvider: null,

  loadProviders: async () => {
    try {
      const providers = await invoke<Provider[]>("list_providers");
      set({ providers, currentProvider: providers[0] || null });
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
    set({ currentProvider: provider });
  },

  // Auth
  loggedIn: false,
  serverUrl: null,
  username: null,

  login: async (serverUrl, apiKey, username) => {
    await invoke("login", { serverUrl, apiKey, username });
    set({ loggedIn: true, serverUrl, username });
  },

  logout: async () => {
    await invoke("logout");
    set({ loggedIn: false, serverUrl: null, username: null });
  },

  // Server
  serverRunning: false,

  startServer: async () => {
    await invoke("start_server");
    set({ serverRunning: true });
  },

  stopServer: async () => {
    await invoke("stop_server");
    set({ serverRunning: false });
  },

  // Init
  init: async () => {
    // Load initial data
    await Promise.all([
      get().loadProjects(),
      get().loadSessions(),
      get().loadProviders(),
    ]);
  },
}));
