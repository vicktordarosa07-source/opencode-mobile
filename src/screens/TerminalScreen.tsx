import { Component, onMount, createSignal, Show } from "solid-js";
import { useAppStore } from "../stores/appStore";

export const TerminalScreen: Component = () => {
  const [state, actions] = useAppStore();
  const [input, setInput] = createSignal("");
  const [history, setHistory] = createSignal<string[]>([]);
  const [historyIndex, setHistoryIndex] = createSignal(-1);
  let terminalRef: HTMLDivElement | undefined;

  onMount(async () => {
    if (!state.terminal.id) {
      await actions.createTerminal();
    }
  });

  const handleSubmit = async () => {
    const cmd = input();
    if (!cmd.trim()) return;

    // Add to history
    setHistory((h) => [...h, cmd]);
    setHistoryIndex(-1);

    // Send to terminal
    await actions.writeToTerminal(cmd + "\n");

    // Clear input
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = history();
      if (h.length > 0) {
        const idx = historyIndex() < h.length - 1 ? historyIndex() + 1 : historyIndex();
        setHistoryIndex(idx);
        setInput(h[h.length - 1 - idx] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = history();
      const idx = historyIndex() > 0 ? historyIndex() - 1 : -1;
      setHistoryIndex(idx);
      setInput(idx >= 0 ? h[h.length - 1 - idx] : "");
    }
  };

  const quickCommands = [
    { label: "ls", cmd: "ls -la" },
    { label: "pwd", cmd: "pwd" },
    { label: "cd ..", cmd: "cd .." },
    { label: "git", cmd: "git status" },
    { label: "clear", cmd: "clear" },
  ];

  return (
    <div class="screen terminal-screen">
      <header class="screen-header">
        <div class="header-title">
          <span class="terminal-icon">&#x2B1B;</span>
          <span>Terminal</span>
          <Show when={state.currentProject}>
            <span class="terminal-cwd">{state.currentProject!.name}</span>
          </Show>
        </div>
        <button class="icon-button" onClick={() => actions.createTerminal()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </header>

      {/* Terminal Output */}
      <div class="terminal-output" ref={terminalRef}>
        <Show when={state.terminal.id}>
          <div class="terminal-welcome">
            <pre class="ascii-art">{`
   ___  ______  _____
  / _ \\/ __ \\ \\/ / _ \\
 / /_/ / / / /\\  /  __/
/_/ /_/_/ /_/ /_/\\___/
            `}</pre>
            <p class="terminal-info">OpenCode Terminal v1.0</p>
            <p class="terminal-hint">Type commands below. Use quick actions for common tasks.</p>
          </div>
        </Show>
        <Show when={!state.terminal.id}>
          <div class="terminal-loading">
            <p>Starting terminal...</p>
          </div>
        </Show>
      </div>

      {/* Quick Commands */}
      <div class="quick-commands">
        {quickCommands.map((qc) => (
          <button
            class="quick-command"
            onClick={async () => {
              setHistory((h) => [...h, qc.cmd]);
              await actions.writeToTerminal(qc.cmd + "\n");
            }}
          >
            {qc.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div class="terminal-input-wrapper">
        <span class="terminal-prompt">$</span>
        <input
          class="terminal-input"
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          spellcheck={false}
          autocomplete="off"
        />
      </div>
    </div>
  );
};
