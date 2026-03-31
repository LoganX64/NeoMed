import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import API from "../api/api";
import { getSessionUser } from "../auth/session";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

/* ── Status Toast ── */
function StatusToast({ type, message, onClose }) {
  if (!message) return null;
  const isError = type === "error";
  return createPortal(
    <div className="fixed top-6 left-0 right-0 z-[10001] flex justify-center px-4 pointer-events-none">
      <div
        className={`animate-slide-down px-4 py-2.5 rounded-[10px] text-white flex items-center gap-2.5 shadow-lg text-sm font-semibold min-w-[280px] max-w-full cursor-pointer transition-all pointer-events-auto ${
          isError ? "bg-red-500" : "bg-emerald-500"
        }`}
        onClick={onClose}
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-[0.75rem]">
          {isError ? "!" : "✓"}
        </span>
        <span className="flex-1">{message}</span>
        <span className="text-[0.75rem] opacity-70">✕</span>
      </div>
    </div>,
    document.body
  );
}

/* ── Portal-based Modal wrapper ── */
function Modal({ open, onClose, children, maxWidth = "520px" }) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-3"
      onClick={onClose}
    >
      <div
        style={{ maxWidth }}
        className="animate-fade-in-scale w-full bg-white border border-border-default rounded-lg p-5 shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[0.9375rem] font-bold">{title}</span>
      <button
        className="inline-flex items-center justify-center w-7 h-7 rounded-sm border border-border-default bg-white text-text-muted cursor-pointer text-[0.875rem] transition-colors hover:border-slate-400"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getSessionUser();
  const userId = user?.id;

  const [title, setTitle] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [shareRole, setShareRole] = useState("VIEWER");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contentTick, setContentTick] = useState(0);
  const [accessRole, setAccessRole] = useState("VIEWER");
  const [presence, setPresence] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentBody, setCommentBody] = useState("");
  const [suggestionMode, setSuggestionMode] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const editor = useEditor({ extensions: [StarterKit, Underline], content: EMPTY_DOC });

  const editorUi = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      underline: editor?.isActive("underline") ?? false,
      h1: editor?.isActive("heading", { level: 1 }) ?? false,
      bulletList: editor?.isActive("bulletList") ?? false,
      orderedList: editor?.isActive("orderedList") ?? false,
      canBold: editor?.can().chain().focus().toggleBold().run() ?? false,
      canItalic: editor?.can().chain().focus().toggleItalic().run() ?? false,
      canUnderline: editor?.can().chain().focus().toggleUnderline().run() ?? false,
      canH1: editor?.can().chain().focus().toggleHeading({ level: 1 }).run() ?? false,
      canBulletList: editor?.can().chain().focus().toggleBulletList().run() ?? false,
      canOrderedList: editor?.can().chain().focus().toggleOrderedList().run() ?? false,
    }),
  });

  /* ── Effects ── */
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => setContentTick((t) => t + 1);
    editor.on("update", onUpdate);
    return () => editor.off("update", onUpdate);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const fetchDoc = async () => {
      try {
        const res = await API.get(`/documents/${id}`);
        setTitle(res.data.title);
        setAccessRole(res.data.accessRole || "VIEWER");
        let parsed = EMPTY_DOC;
        if (typeof res.data.content === "string" && res.data.content.trim()) {
          try { const c = JSON.parse(res.data.content); if (c?.type === "doc") parsed = c; } catch (e) { console.error("Content format error:", e); }
        }
        editor.commands.setContent(parsed);
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Failed to load document." });
      }
    };
    fetchDoc();
  }, [editor, id]);

  useEffect(() => {
    if (!editor) return;
    const role = String(accessRole || "VIEWER").toUpperCase();
    editor.setEditable(role === "OWNER" || role === "EDITOR");
  }, [editor, accessRole]);

  useEffect(() => {
    const fetchUsers = async () => {
      try { 
        const res = await API.get("/share/users"); 
        setUsers(res.data.filter(u => String(u.id) !== String(userId))); 
      } catch (err) { console.error("Failed to fetch users:", err); }
    };
    if (userId) fetchUsers();
  }, [userId]);

  useEffect(() => {
    if (!editor) return;
    const role = String(accessRole || "VIEWER").toUpperCase();
    if (role !== "OWNER" && role !== "EDITOR") return;
    const timeout = setTimeout(async () => {
      try {
        setSaving(true);
        await API.put(`/documents/${id}`, { title, content: JSON.stringify(editor.getJSON()) });
        setSaving(false);
        if (status.type === "error") setStatus({ type: "", message: "" });
      } catch {
        setSaving(false);
        setStatus({ type: "error", message: "Auto-save failed." });
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [editor, title, id, contentTick, accessRole, status.type]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const tick = async () => {
      try {
        await API.post(`/documents/${id}/presence/heartbeat`);
        const res = await API.get(`/documents/${id}/presence`);
        if (!cancelled) setPresence(res.data || []);
      } catch (err) { console.error("Presence check failed", err); }
    };
    tick();
    const interval = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id]);

  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => setStatus({ type: "", message: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status.message]);

  /* ── Handlers ── */
  const loadVersions = async () => { const res = await API.get(`/documents/${id}/versions`); setVersions(res.data || []); };
  const loadComments = async () => { const res = await API.get(`/documents/${id}/comments`); setComments(res.data || []); };

  const exportMarkdown = async () => {
    setBusyAction(true);
    try {
      const res = await API.get(`/documents/${id}/export/markdown`);
      const md = res.data?.markdown;
      
      if (!md) {
        setStatus({ type: "error", message: "Export failed: Empty content." });
        return;
      }

      // Create blob with text/markdown type
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      
      // Filename: ensure it has .md extension and handle special chars
      const baseName = (title || "document").trim().replace(/[<>:"/\\|?*]/g, "");
      const fileName = `${baseName || "document"}.md`;

      const link = document.createElement("a");
      link.className = "hidden";
      link.href = url;
      link.download = fileName; // Direct property
      link.setAttribute("download", fileName); // Attribute for older browsers
      
      // Standard way to trigger download in modern browsers
      document.body.appendChild(link);
      link.click();
      
      // Cleanup with slight delay
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 500);
      
      setStatus({ type: "success", message: `Successfully exported: ${fileName}` });
    } catch (err) {
      console.error("Export MD error:", err);
      setStatus({ type: "error", message: "Export failed. Please try again." });
    } finally { setBusyAction(false); }
  };

  const exportPdf = () => {
    window.print();
  };

  const addComment = async () => {
    if (!commentBody.trim()) return;
    setBusyAction(true);
    try {
      const selection = editor?.state?.selection;
      await API.post(`/documents/${id}/comments`, {
        body: commentBody.trim(), kind: suggestionMode ? "SUGGESTION" : "COMMENT",
        fromPos: selection?.from ?? null, toPos: selection?.to ?? null,
      });
      setCommentBody(""); await loadComments();
      setStatus({ type: "success", message: suggestionMode ? "Suggestion added." : "Comment added." });
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.error || "Failed to add comment." });
    } finally { setBusyAction(false); }
  };

  const resolveComment = async (commentId) => {
    setBusyAction(true);
    try { await API.post(`/documents/${id}/comments/${commentId}/resolve`); await loadComments(); }
    finally { setBusyAction(false); }
  };

  const shareDoc = async () => {
    if (!selectedUser) { setStatus({ type: "error", message: "Select a user to share with." }); return; }
    if (Number(selectedUser) === Number(userId)) { 
      setStatus({ type: "error", message: "Cannot share with yourself." }); 
      setShowShare(false); 
      return; 
    }
    try {
      await API.post("/share", { documentId: id, userId: selectedUser, role: shareRole });
      setStatus({ type: "success", message: "Document shared." }); setShowShare(false);
    } catch (err) { 
      setStatus({ type: "error", message: err.response?.data?.error || "Failed to share." }); 
      setShowShare(false);
    }
  };

  const deleteDoc = async () => {
    try { await API.delete(`/documents/${id}`); navigate("/"); }
    catch { setStatus({ type: "error", message: "Failed to delete." }); }
  };

  if (!editor) return null;

  const isOwner = String(accessRole).toUpperCase() === "OWNER";
  const isEditable = isOwner || String(accessRole).toUpperCase() === "EDITOR";

  return (
    <div className="max-w-[960px] mx-auto px-4 min-h-dvh w-full animate-fade-in">

      {/* ── Sticky top bar ── */}
      <div className="no-print sticky top-0 z-20 bg-white/92 backdrop-blur-md border-b border-border-default -mx-4 px-4 pt-6 pb-2.5">
        {/* Row 1: Back + Title + Status pills */}
        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center p-1.5 text-[0.6875rem] font-semibold font-sans rounded-sm cursor-pointer border border-border-default bg-white text-text-secondary transition-colors hover:border-slate-400 shrink-0"
            title="Back"
          >
            ←
          </button>

          <input
            value={title}
            placeholder="Untitled"
            onChange={(e) => setTitle(e.target.value)}
            readOnly={!isEditable}
            className={`flex-1 min-w-0 px-2 py-1 text-[0.875rem] font-bold font-sans text-text-primary bg-transparent border border-transparent rounded-sm outline-none transition-all ${
              isEditable ? "focus:border-border-default focus:bg-white" : ""
            }`}
          />

          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-bold text-accent-primary bg-accent-primary/10 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse-dot shrink-0" />
            {presence?.length || 0}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-bold rounded-full shrink-0 ${
            saving ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${saving ? "bg-amber-600" : "bg-emerald-600"}`} />
            {saving ? "…" : "✓"}
          </span>
        </div>

        {/* Row 2: Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={async () => { setShowVersions(true); await loadVersions(); }}
            disabled={busyAction}
            className="px-2.5 py-1.5 text-[0.6875rem] font-semibold font-sans rounded-sm cursor-pointer border border-border-default bg-white text-text-secondary transition-colors hover:border-slate-400 disabled:opacity-50"
          >
            Versions
          </button>

          <button
            onClick={async () => { setShowComments(true); await loadComments(); }}
            disabled={busyAction}
            className="px-2.5 py-1.5 text-[0.6875rem] font-semibold font-sans rounded-sm cursor-pointer border border-border-default bg-white text-text-secondary transition-colors hover:border-slate-400 disabled:opacity-50"
          >
            Comments
          </button>

          <button
            onClick={exportMarkdown}
            disabled={busyAction}
            className="px-2.5 py-1.5 text-[0.6875rem] font-semibold font-sans rounded-sm cursor-pointer border border-border-default bg-white text-text-secondary transition-colors hover:border-slate-400 disabled:opacity-50"
          >
            Export MD
          </button>

          <button
            onClick={exportPdf}
            className="px-2.5 py-1.5 text-[0.6875rem] font-semibold font-sans rounded-sm cursor-pointer border border-border-default bg-white text-text-secondary transition-colors hover:border-slate-400"
          >
            Print PDF
          </button>

          <button
            onClick={() => setShowShare(true)}
            className="px-2.5 py-1.5 text-[0.6875rem] font-semibold font-sans rounded-sm cursor-pointer border border-accent-primary bg-accent-primary text-white transition-colors hover:bg-accent-hover ml-auto sm:ml-0"
          >
            Share
          </button>

          {isOwner && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-2.5 py-1.5 text-[0.6875rem] font-semibold font-sans rounded-sm cursor-pointer border border-red-200 bg-white text-red-600 transition-colors hover:bg-red-50"
            >
              Delete
            </button>
          )}

          <span className={`ml-auto hidden sm:inline-flex items-center px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider rounded-sm ${
            isOwner ? "text-accent-primary bg-accent-primary/10" :
            isEditable ? "text-emerald-600 bg-emerald-50" :
            "text-text-muted bg-bg-tertiary"
          }`}>
            {String(accessRole).toLowerCase()}
          </span>
        </div>
      </div>

      {/* ── Formatting toolbar ── */}
      <div className="no-print flex items-center gap-1 py-2 flex-wrap">
        {[
          { label: "B", key: "bold", toggle: () => editor.chain().focus().toggleBold().run(), active: editorUi.bold, can: editorUi.canBold, fw: "font-black" },
          { label: "I", key: "italic", toggle: () => editor.chain().focus().toggleItalic().run(), active: editorUi.italic, can: editorUi.canItalic, fs: "italic" },
          { label: "U", key: "underline", toggle: () => editor.chain().focus().toggleUnderline().run(), active: editorUi.underline, can: editorUi.canUnderline, td: "underline" },
          { label: "H1", key: "h1", toggle: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editorUi.h1, can: editorUi.canH1 },
          { label: "•", key: "bullet", toggle: () => editor.chain().focus().toggleBulletList().run(), active: editorUi.bulletList, can: editorUi.canBulletList },
          { label: "1.", key: "ordered", toggle: () => editor.chain().focus().toggleOrderedList().run(), active: editorUi.orderedList, can: editorUi.canOrderedList },
        ].map((b) => (
          <button
            key={b.key}
            onClick={b.toggle}
            disabled={!b.can}
            className={`inline-flex items-center justify-center min-w-[32px] px-2 py-1.5 text-[0.8125rem] font-sans rounded-sm transition-all ${
              b.active 
                ? "bg-accent-primary text-white border border-accent-primary shadow-sm" 
                : "bg-white text-text-secondary border border-border-default hover:bg-bg-tertiary"
            } ${!b.can ? "opacity-35 cursor-not-allowed" : "cursor-pointer"} ${b.fw || "font-bold"} ${b.fs || ""} ${b.td || ""}`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* ── Editor surface ── */}
      <div className="bg-white border border-border-default rounded-lg shadow-sm mt-4 mb-8 overflow-hidden p-4">
        <EditorContent editor={editor} className="neo-editor" />
      </div>

      {/* ═══════ MODALS ═══════ */}

      {/* Share */}
      <Modal open={showShare} onClose={() => setShowShare(false)} maxWidth="380px">
        <ModalHeader title="Share Document" onClose={() => setShowShare(false)} />
        <div className="flex flex-col gap-2">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full px-3 py-2 text-[0.875rem] font-sans text-text-primary bg-white border border-border-default rounded-sm outline-none appearance-auto"
          >
            <option value="">Select user…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select
            value={shareRole}
            onChange={(e) => setShareRole(e.target.value)}
            className="w-full px-3 py-2 text-[0.875rem] font-sans text-text-primary bg-white border border-border-default rounded-sm outline-none appearance-auto"
          >
            <option value="VIEWER">Viewer</option>
            <option value="COMMENTER">Commenter</option>
            <option value="EDITOR">Editor</option>
          </select>
          <button
            onClick={shareDoc}
            className="w-full py-2.5 text-[0.8125rem] font-bold text-white bg-accent-primary rounded-sm transition-colors hover:bg-accent-hover flex justify-center items-center mt-1"
          >
            Share
          </button>
        </div>
      </Modal>

      {/* Versions */}
      <Modal open={showVersions} onClose={() => setShowVersions(false)}>
        <ModalHeader title="Version History" onClose={() => setShowVersions(false)} />
        <div className="max-h-[55vh] overflow-y-auto border border-border-default rounded-sm divide-y divide-border-subtle">
          {versions.length ? versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-2 p-3 hover:bg-bg-secondary transition-colors">
              <div className="min-w-0 overflow-hidden">
                <div className="text-[0.8125rem] font-bold text-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
                  {v.title || "Untitled"}
                </div>
                <div className="text-[0.625rem] text-text-muted mt-0.5">
                  {new Date(v.createdAt).toLocaleString()} • {v.createdByName}
                </div>
              </div>
              <button
                disabled={busyAction}
                onClick={async () => {
                  setBusyAction(true);
                  try {
                    await API.post(`/documents/${id}/versions/${v.id}/restore`);
                    setShowVersions(false);
                    const r = await API.get(`/documents/${id}`);
                    setTitle(r.data.title); setAccessRole(r.data.accessRole || accessRole);
                    let parsed = EMPTY_DOC;
                    try { const c = JSON.parse(r.data.content); if (c?.type === "doc") parsed = c; } catch (e) { console.error("Format error on restore", e); }
                    editor.commands.setContent(parsed);
                  } finally { setBusyAction(false); }
                }}
                className="px-2.5 py-1 text-[0.6875rem] font-bold text-white bg-accent-primary rounded-sm transition-colors hover:bg-accent-hover shrink-0"
              >
                Restore
              </button>
            </div>
          )) : (
            <div className="p-6 text-center text-text-muted text-[0.8125rem]">No versions yet.</div>
          )}
        </div>
      </Modal>

      {/* Comments */}
      <Modal open={showComments} onClose={() => setShowComments(false)}>
        <ModalHeader title={suggestionMode ? "Suggestions" : "Comments"} onClose={() => setShowComments(false)} />
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-[0.75rem] font-bold text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={suggestionMode}
              onChange={(e) => setSuggestionMode(e.target.checked)}
              className="accent-accent-primary"
            />
            Suggestion mode
          </label>
          <button
            onClick={loadComments}
            disabled={busyAction}
            className="px-2.5 py-1 text-[0.6875rem] font-semibold bg-white border border-border-default rounded-sm hover:border-slate-400"
          >
            Refresh
          </button>
        </div>
        <div className="flex gap-1.5 mb-3">
          <input
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder={suggestionMode ? "Write a suggestion…" : "Write a comment…"}
            className="flex-1 px-2.5 py-2 text-[0.75rem] font-sans text-text-primary bg-white border border-border-default rounded-sm outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
          />
          <button
            onClick={addComment}
            disabled={busyAction}
            className="px-3.5 py-2 text-[0.75rem] font-bold text-white bg-accent-primary rounded-sm hover:bg-accent-hover shrink-0"
          >
            Add
          </button>
        </div>
        <div className="max-h-[45vh] overflow-y-auto border border-border-default rounded-sm divide-y divide-border-subtle">
          {comments.length ? comments.map((c) => (
            <div key={c.id} className="p-3 hover:bg-bg-secondary transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[0.75rem] font-extrabold text-text-primary">{c.createdByName}</span>
                    <span className="px-1.5 py-0.5 text-[0.625rem] font-bold text-text-muted bg-bg-tertiary rounded-sm">{c.kind}</span>
                    {c.resolvedAt && <span className="px-1.5 py-0.5 text-[0.625rem] font-bold text-emerald-600 bg-emerald-50 rounded-sm">Resolved</span>}
                  </div>
                  <div className="text-[0.75rem] text-text-secondary break-words leading-relaxed">{c.body}</div>
                  <div className="text-[0.625rem] text-text-muted mt-1">{new Date(c.createdAt).toLocaleString()}</div>
                </div>
                {!c.resolvedAt && (isOwner || isEditable) && (
                  <button
                    onClick={() => resolveComment(c.id)}
                    disabled={busyAction}
                    className="px-2 py-1 text-[0.6875rem] font-bold text-emerald-600 rounded-sm hover:bg-emerald-50 shrink-0"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="p-6 text-center text-text-muted text-[0.75rem]">No comments yet.</div>
          )}
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} maxWidth="340px">
        <div className="text-center p-2">
          <h3 className="text-[1rem] font-bold mb-1">Delete document?</h3>
          <p className="text-[0.75rem] text-text-muted mb-5">This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2 text-[0.75rem] font-bold border border-border-default rounded-sm hover:bg-bg-tertiary"
            >
              Cancel
            </button>
            <button
              onClick={async () => { setShowDeleteConfirm(false); await deleteDoc(); }}
              className="flex-1 py-2 text-[0.75rem] font-bold text-white bg-red-600 rounded-sm hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <StatusToast
        type={status.type}
        message={status.message}
        onClose={() => setStatus({ type: "", message: "" })}
      />
    </div>
  );
}
