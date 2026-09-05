import { Component, Show, createSignal, onMount } from "solid-js";
import { Router, Route, Routes } from "@solidjs/router";
import { HomeScreen } from "./screens/HomeScreen";
import { EditorScreen } from "./screens/EditorScreen";
import { TerminalScreen } from "./screens/TerminalScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TabBar } from "./components/TabBar";
import { StoreProvider, useAppStore } from "./stores/appStore";

const AppInner: Component = () => {
  const [ready, setReady] = createSignal(false);
  const [, actions] = useAppStore();

  onMount(() => {
    // Initialize app
    actions.init();
    setReady(true);
  });

  return (
    <Router>
      <div class="app-container">
        <Show when={ready()} fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" component={HomeScreen} />
            <Route path="/editor" component={EditorScreen} />
            <Route path="/editor/:path*" component={EditorScreen} />
            <Route path="/terminal" component={TerminalScreen} />
            <Route path="/chat" component={ChatScreen} />
            <Route path="/chat/:sessionId" component={ChatScreen} />
            <Route path="/settings" component={SettingsScreen} />
          </Routes>
          <TabBar />
        </Show>
      </div>
    </Router>
  );
};

const App: Component = () => (
  <StoreProvider>
    <AppInner />
  </StoreProvider>
);

const LoadingScreen: Component = () => (
  <div class="loading-screen">
    <div class="loading-spinner" />
    <span class="loading-text">OpenCode</span>
  </div>
);

export default App;
