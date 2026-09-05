import { Component, For, Show, createSignal, onMount } from "solid-js";
import { useAppStore } from "../stores/appStore";

export const EditorScreen: Component = () => {
  const [state, actions] = useAppStore();
  const [showFileTree, setShowFileTree] = createSignal(true);
  const [fontSize, setFontSize] = createSignal(14);
  const [lineNumbers, setLineNumbers] = createSignal(true);

  onMount(() => {
    if (state.currentProject) {
      actions.loadDirectory(state.currentProject.path);
    }
  });

  const handleSave = async () => {
    if (state.editorContent) {
      await actions.saveFile(state.editorContent);
    }
  };

  const lineCount = () => {
    const content = state.editorContent || "";
    return content.split("\n").length;
  };

  return (
    <div class="screen editor-screen">
      <header class="screen-header">
        <button class="icon-button" onClick={() => setShowFileTree(!showFileTree())}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div class="header-title">
          <Show when={state.selectedFile}>
            <span class="file-name">{state.selectedFile!.name}</span>
            <Show when={state.editorDirty}>
              <span class="dirty-dot">&#x25CF;</span>
            </Show>
          </Show>
          <Show when={!state.selectedFile}>
            <span class="file-name">No file selected</span>
          </Show>
        </div>
        <button class="icon-button" onClick={handleSave} disabled={!state.editorDirty}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>
      </header>

      <div class="editor-content">
        {/* File Tree */}
        <Show when={showFileTree()}>
          <aside class="file-tree-panel">
            <div class="file-tree-header">
              <span class="file-tree-title">Files</span>
              <button class="icon-button-sm" onClick={() => setShowFileTree(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div class="file-tree-list">
              <For each={state.files}>
                {(file) => (
                  <div
                    class={`file-tree-item ${file.is_dir ? "directory" : "file"}`}
                    style={{ "padding-left": `${(file.path.split(state.currentPath).length - 1) * 16 + 8}px` }}
                    onClick={() => {
                      if (file.is_dir) {
                        actions.loadDirectory(file.path);
                      } else {
                        actions.selectFile(file);
                      }
                    }}
                  >
                    <span class="file-icon">
                      {file.is_dir ? "\u{1F4C1}" : getFileIcon(file.name)}
                    </span>
                    <span class="file-name">{file.name}</span>
                  </div>
                )}
              </For>
            </div>
          </aside>
        </Show>

        {/* Editor */}
        <div class="editor-area">
          <Show when={state.selectedFile}>
            <div class="editor-settings">
              <button
                class={`icon-button-sm ${fontSize() > 14 ? "active" : ""}`}
                onClick={() => setFontSize(Math.min(24, fontSize() + 2))}
              >
                A+
              </button>
              <button
                class={`icon-button-sm ${fontSize() < 14 ? "active" : ""}`}
                onClick={() => setFontSize(Math.max(10, fontSize() - 2))}
              >
                A-
              </button>
              <button
                class={`icon-button-sm ${lineNumbers() ? "active" : ""}`}
                onClick={() => setLineNumbers(!lineNumbers())}
              >
                #
              </button>
            </div>
            <div class="editor-wrapper">
              <Show when={lineNumbers()}>
                <div class="line-numbers" style={{ "font-size": `${fontSize()}px` }}>
                  <For each={Array.from({ length: lineCount() }, (_, i) => i + 1)}>
                    {(num) => (
                      <div class="line-number">{num}</div>
                    )}
                  </For>
                </div>
              </Show>
              <textarea
                class="editor-textarea"
                value={state.editorContent}
                onInput={(e) => actions.setEditorContent(e.currentTarget.value)}
                style={{
                  "font-size": `${fontSize()}px`,
                  "line-height": `${fontSize() * 1.5}px`,
                }}
                spellcheck={false}
              />
            </div>
          </Show>
          <Show when={!state.selectedFile}>
            <div class="editor-placeholder">
              <div class="placeholder-icon">&#x1F4DD;</div>
              <p>Select a file to edit</p>
              <p class="placeholder-hint">Open the file tree to browse your project</p>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const icons: Record<string, string> = {
    ts: "\u{1F4D8}",
    tsx: "\u{1F4D8}",
    js: "\u{1F4D2}",
    jsx: "\u{1F4D2}",
    py: "\u{1F40D}",
    rs: "\u{1F980}",
    go: "\u{1F439}",
    rb: "\u{1F48E}",
    java: "\u{2615}",
    kt: "\u{1F7E3}",
    html: "\u{1F310}",
    css: "\u{1F3A8}",
    json: "\u{1F4CB}",
    md: "\u{1F4DD}",
    txt: "\u{1F4C4}",
    yaml: "\u{1F4CB}",
    yml: "\u{1F4CB}",
    toml: "\u{1F4CB}",
    sh: "\u{1F41A}",
    bash: "\u{1F41A}",
    zsh: "\u{1F41A}",
    sql: "\u{1F5C4}\uFE0F",
    xml: "\u{1F4CB}",
  };
  return icons[ext || ""] || "\u{1F4C4}";
}
