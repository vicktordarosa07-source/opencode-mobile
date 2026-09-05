import { Component, For, Show, createSignal, onMount, createEffect } from "solid-js";
import { useAppStore } from "../stores/appStore";

export const ChatScreen: Component = () => {
  const { messages, sendMessage, currentSession, currentProvider, createSession, selectSession } = useAppStore();
  const [input, setInput] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  let messagesEnd: HTMLDivElement | undefined;

  onMount(async () => {
    if (!currentSession()) {
      const session = await createSession("New Chat");
      selectSession(session);
    }
  });

  createEffect(() => {
    // Scroll to bottom when messages change
    if (messages().length > 0) {
      setTimeout(() => {
        messagesEnd?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  });

  const handleSend = async () => {
    const text = input();
    if (!text.trim() || loading()) return;

    setLoading(true);
    setInput("");

    try {
      await sendMessage(text);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    "Explain what this code does",
    "Fix the bug in this function",
    "Write a test for this module",
    "Refactor this code to be cleaner",
    "Help me understand this error",
  ];

  return (
    <div class="screen chat-screen">
      <header class="screen-header">
        <div class="header-title">
          <span class="chat-icon">💬</span>
          <span>{currentSession()?.title || "New Chat"}</span>
        </div>
        <Show when={currentProvider()}>
          <span class="provider-badge">{currentProvider()!.name}</span>
        </Show>
      </header>

      {/* Messages */}
      <div class="chat-messages">
        <Show when={messages().length === 0}>
          <div class="chat-empty">
            <div class="chat-empty-icon">🤖</div>
            <h3>Start a conversation</h3>
            <p>Ask anything about your code</p>
            <div class="suggested-prompts">
              {suggestedPrompts.map((prompt) => (
                <button
                  class="suggested-prompt"
                  onClick={() => {
                    setInput(prompt);
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </Show>

        <For each={messages()}>
          {(message) => (
            <div class={`message ${message.role}`}>
              <div class="message-avatar">
                {message.role === "user" ? "👤" : "🤖"}
              </div>
              <div class="message-content">
                <div class="message-header">
                  <span class="message-role">
                    {message.role === "user" ? "You" : "Assistant"}
                  </span>
                  <span class="message-time">
                    {new Date(message.time_created).toLocaleTimeString()}
                  </span>
                </div>
                <div class="message-body">
                  {renderMarkdown(message.content || "")}
                </div>
              </div>
            </div>
          )}
        </For>

        <Show when={loading()}>
          <div class="message assistant">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
              <div class="message-body">
                <div class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        </Show>

        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div class="chat-input-wrapper">
        <textarea
          class="chat-input"
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your code..."
          rows={1}
          disabled={loading()}
        />
        <button
          class="send-button"
          onClick={handleSend}
          disabled={!input().trim() || loading()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

function renderMarkdown(text: string): string {
  // Simple markdown rendering
  return text
    .replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}
