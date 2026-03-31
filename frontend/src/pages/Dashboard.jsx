import { useEffect, useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import { clearSessionUser, getSessionUser } from "../auth/session";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

import { createPortal } from "react-dom";

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

export default function Dashboard() {
  const [myDocs, setMyDocs] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const navigate = useNavigate();
  const user = getSessionUser();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const fetchDocs = async () => {
      try {
        const my = await API.get(`/documents/my?userId=${userId}`);
        const shared = await API.get(`/documents/shared?userId=${userId}`);
        setMyDocs(my.data);
        setSharedDocs(shared.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDocs();
  }, [userId]);

  const createDoc = async () => {
    try {
      setBusy(true);
      const res = await API.post("/documents", {
        title: "Untitled",
        content: JSON.stringify(EMPTY_DOC),
        ownerId: userId,
      });
      navigate(`/doc/${res.data.id}`);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Failed to create document." });
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("ownerId", userId);
    try {
      setBusy(true);
      const res = await API.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/doc/${res.data.id}`);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Upload failed. Please try again." });
    } finally {
      setBusy(false);
    }
    e.target.value = null;
  };

  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => setStatus({ type: "", message: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status.message]);

  const renderDocs = (docs, showOwner = false) => {
    if (!docs.length) {
      return (
        <div className="p-6 text-center text-text-muted text-[0.8125rem] border border-dashed border-border-default rounded-sm bg-bg-secondary">
          No documents yet.
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1.5">
        {docs.map((doc, i) => (
          <div
            key={doc.id}
            className={`group animate-fade-in stagger-${Math.min(
              i + 1,
              5
            )} flex items-center justify-between gap-2 px-3.5 py-3 bg-white border border-border-default rounded-sm cursor-pointer transition-all hover:border-accent-primary hover:shadow-sm`}
            onClick={() => navigate(`/doc/${doc.id}`)}
          >
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="text-[0.875rem] font-semibold text-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
                {doc.title || "Untitled"}
              </div>
              {showOwner && (
                <div className="text-[0.6875rem] text-text-muted mt-0.5">
                  by {doc.owner?.name || "Unknown"}
                </div>
              )}
            </div>
            <span className="text-[0.6875rem] font-semibold text-accent-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              Open →
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-[960px] mx-auto p-6 md:p-8 min-h-dvh w-full">
      {/* Header */}
      <header className="animate-fade-in flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary m-0">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Signed in as{" "}
            <span className="font-semibold text-text-primary">
              {user?.name || "User"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              clearSessionUser();
              navigate("/login", { replace: true });
            }}
            className="px-3.5 py-2 text-sm font-semibold text-text-secondary bg-white border border-border-default rounded-sm cursor-pointer transition-colors hover:border-slate-400"
          >
            Logout
          </button>
          <div className="relative">
            <input
              id="upload-file"
              type="file"
              accept=".txt,.md"
              onChange={uploadFile}
              disabled={busy || !userId}
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
            />
            <label
              htmlFor="upload-file"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-text-secondary bg-white border border-border-default rounded-sm transition-colors hover:border-slate-400 ${
                busy ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
              📎 Upload
            </label>
          </div>
          <button
            onClick={createDoc}
            disabled={busy || !userId}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-accent-primary border border-accent-primary rounded-sm transition-colors hover:bg-accent-hover ${
              busy ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            + New Document
          </button>
        </div>
      </header>

      {/* Document sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="animate-fade-in bg-white border border-border-default rounded-lg p-5 shadow-sm overflow-hidden">
          <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary m-0 mb-4">
            📄 My Documents
            <span className="text-[0.6875rem] font-semibold text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full ml-auto">
              {myDocs.length}
            </span>
          </h2>
          {renderDocs(myDocs)}
        </section>

        <section className="animate-fade-in stagger-2 bg-white border border-border-default rounded-lg p-5 shadow-sm overflow-hidden">
          <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary m-0 mb-4">
            👥 Shared with Me
            <span className="text-[0.6875rem] font-semibold text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full ml-auto">
              {sharedDocs.length}
            </span>
          </h2>
          {renderDocs(sharedDocs, true)}
        </section>
      </div>
      <StatusToast
        type={status.type}
        message={status.message}
        onClose={() => setStatus({ type: "", message: "" })}
      />
    </div>
  );
}
