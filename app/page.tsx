"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

type TreeEntry = { path: string; type: "blob" | "tree"; sha: string };
type FileNode = { name: string; path: string; children?: FileNode[] };

function buildTree(entries: TreeEntry[]): FileNode[] {
  const root: FileNode[] = [];
  const dirs = new Map<string, FileNode>();

  for (const entry of entries.filter((e) => e.type === "tree")) {
    dirs.set(entry.path, { name: entry.path.split("/").pop()!, path: entry.path, children: [] });
  }
  for (const dir of dirs.values()) {
    const parentPath = dir.path.includes("/") ? dir.path.slice(0, dir.path.lastIndexOf("/")) : null;
    if (parentPath && dirs.has(parentPath)) dirs.get(parentPath)!.children!.push(dir);
    else root.push(dir);
  }
  for (const file of entries.filter((e) => e.type === "blob")) {
    const parentPath = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : null;
    const node: FileNode = { name: file.path.split("/").pop()!, path: file.path };
    if (parentPath && dirs.has(parentPath)) dirs.get(parentPath)!.children!.push(node);
    else root.push(node);
  }
  const sortRec = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      const aIsDir = !!a.children,
        bIsDir = !!b.children;
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sortRec(n.children));
  };
  sortRec(root);
  return root;
}

function TreeView({
  nodes,
  activePath,
  onSelect,
}: {
  nodes: FileNode[];
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  return (
    <ul className="tree">
      {nodes.map((node) => (
        <TreeNode key={node.path} node={node} activePath={activePath} onSelect={onSelect} />
      ))}
      <style jsx>{`
        .tree {
          list-style: none;
          margin: 0;
          padding-left: 0;
        }
      `}</style>
    </ul>
  );
}

function TreeNode({
  node,
  activePath,
  onSelect,
}: {
  node: FileNode;
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const isDir = !!node.children;

  return (
    <li>
      <div
        className={`row ${activePath === node.path ? "active" : ""}`}
        onClick={() => (isDir ? setOpen(!open) : onSelect(node.path))}
      >
        <span className="icon">{isDir ? (open ? "▾" : "▸") : "·"}</span>
        <span>{node.name}</span>
      </div>
      {isDir && open && node.children && (
        <div className="nested">
          <TreeView nodes={node.children} activePath={activePath} onSelect={onSelect} />
        </div>
      )}
      <style jsx>{`
        .row {
          display: flex;
          gap: 6px;
          align-items: center;
          padding: 3px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          color: #c7c4bd;
          white-space: nowrap;
        }
        .row:hover {
          background: #23262c;
        }
        .row.active {
          background: #2a2320;
          color: #d97757;
        }
        .icon {
          width: 12px;
          color: #6b6f76;
          font-size: 11px;
        }
        .nested {
          padding-left: 14px;
        }
      `}</style>
    </li>
  );
}

export default function Home() {
  const [entries, setEntries] = useState<TreeEntry[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sha, setSha] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tree")
      .then((r) => r.json())
      .then((data: TreeEntry[]) => {
        setEntries(data);
        setLoading(false);
      });
  }, []);

  const tree = useMemo(() => buildTree(entries), [entries]);

  async function openFile(path: string) {
    setActivePath(path);
    setStatus("Loading…");
    const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    setContent(data.content);
    setSha(data.sha);
    setMode("preview");
    setStatus("");
  }

  async function save() {
    if (!activePath) return;
    setStatus("Saving…");
    const res = await fetch("/api/file", {
      method: "PUT",
      body: JSON.stringify({ path: activePath, content, sha }),
    });
    if (res.ok) {
      const fresh = await fetch(`/api/file?path=${encodeURIComponent(activePath)}`).then((r) => r.json());
      setSha(fresh.sha);
      setStatus("Saved.");
    } else {
      setStatus("Save failed — someone else may have edited this file.");
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Knowledge OS</div>
        {loading ? <p className="muted">Loading tree…</p> : <TreeView nodes={tree} activePath={activePath} onSelect={openFile} />}
      </aside>
      <main className="editor">
        {!activePath ? (
          <div className="empty">Select a file to view or edit.</div>
        ) : (
          <>
            <div className="toolbar">
              <span className="path">{activePath}</span>
              <div className="actions">
                <button className={mode === "preview" ? "active" : ""} onClick={() => setMode("preview")}>
                  Preview
                </button>
                <button className={mode === "edit" ? "active" : ""} onClick={() => setMode("edit")}>
                  Edit
                </button>
                <button className="save" onClick={save}>
                  Save
                </button>
                {status && <span className="status">{status}</span>}
              </div>
            </div>
            <div className="body">
              {mode === "edit" ? (
                <textarea value={content} onChange={(e) => setContent(e.target.value)} spellCheck={false} />
              ) : (
                <div className="markdown">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <style jsx global>{`
        html, body { height: 100%; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, "Inter", system-ui, sans-serif; }
      `}</style>
      <style jsx>{`
        .app {
          display: flex;
          height: 100vh;
          background: #14161a;
        }
        .sidebar {
          width: 280px;
          flex-shrink: 0;
          border-right: 1px solid #23262c;
          padding: 16px 8px;
          overflow-y: auto;
        }
        .brand {
          font-family: "IBM Plex Mono", monospace;
          color: #d97757;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.04em;
          padding: 0 8px 14px;
        }
        .muted {
          color: #6b6f76;
          font-size: 13px;
          padding: 0 8px;
        }
        .editor {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .empty {
          margin: auto;
          color: #6b6f76;
          font-size: 14px;
        }
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          border-bottom: 1px solid #23262c;
        }
        .path {
          color: #c7c4bd;
          font-family: "IBM Plex Mono", monospace;
          font-size: 12px;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        button {
          background: #1d2025;
          color: #c7c4bd;
          border: 1px solid #33363c;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
        }
        button.active {
          background: #2a2320;
          color: #d97757;
          border-color: #d97757;
        }
        button.save {
          background: #d97757;
          color: #14161a;
          border: none;
          font-weight: 600;
        }
        .status {
          color: #6b6f76;
          font-size: 12px;
        }
        .body {
          flex: 1;
          overflow-y: auto;
        }
        textarea {
          width: 100%;
          height: 100%;
          resize: none;
          border: none;
          outline: none;
          padding: 24px;
          font-family: "IBM Plex Mono", monospace;
          font-size: 13px;
          line-height: 1.6;
          background: #14161a;
          color: #e8e6e1;
        }
        .markdown {
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 24px;
          color: #e8e6e1;
          font-size: 15px;
          line-height: 1.7;
        }
        .markdown :global(h1), .markdown :global(h2), .markdown :global(h3) {
          color: #f4f1ea;
        }
        .markdown :global(code) {
          background: #1d2025;
          padding: 2px 5px;
          border-radius: 4px;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
