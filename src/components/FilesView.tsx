"use client";

import { useState, useEffect, useCallback } from "react";

interface FileItem {
  id: string;
  type: string;
  content: string;
  updatedAt: string;
}

interface FilesData {
  context: FileItem[];
  claudeMd: FileItem | null;
  sops: FileItem[];
  templates: FileItem[];
}

const CONTEXT_LABELS: Record<string, string> = {
  brandContext: "Brand Context",
  offerContext: "Product/Offer Context",
  voiceGuide: "Brand Voice Guide",
  growthContext: "Growth Marketing Context",
  styleGuide: "Brand Style Guide",
};

const SOP_LABELS: Record<string, string> = {
  contentCreation: "SOP: إنتاج المحتوى",
  campaignManagement: "SOP: إدارة الحملات",
  clientOnboarding: "SOP: تأهيل العميل",
};

const BUILTIN_TEMPLATES = ["socialPost", "article", "email", "landingPage"];

const TEMPLATE_LABELS: Record<string, string> = {
  socialPost: "قالب: منشور سوشيال ميديا",
  article: "قالب: مقال",
  email: "قالب: بريد إلكتروني",
  landingPage: "قالب: صفحة هبوط",
};

export function FilesView({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const [files, setFiles] = useState<FilesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<{
    category: string;
    type: string;
    label: string;
    content: string;
  } | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAddExample, setShowAddExample] = useState(false);
  const [newExampleName, setNewExampleName] = useState("");

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/files`);
      const data = await res.json();
      setFiles(data);
    } catch {
      setMessage({ type: "error", text: "فشل تحميل الملفات" });
    }
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchFiles();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchFiles]);

  const handleAddExample = async () => {
    const name = newExampleName.trim();
    if (!name) {
      setMessage({ type: "error", text: "الرجاء إدخال اسم للمثال" });
      return;
    }
    const type = name.replace(/\s+/g, "_").replace(/[^\w\u0600-\u06FF_]/g, "");
    if (!type) {
      setMessage({ type: "error", text: "اسم غير صالح" });
      return;
    }
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "template", type, content: "" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل إنشاء المثال");
      }
      setShowAddExample(false);
      setNewExampleName("");
      setMessage({ type: "success", text: "تم إنشاء المثال. اكتب محتواه الآن." });
      await fetchFiles();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "فشل الإنشاء" });
    }
  };

  const handleDeleteExample = async (type: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المثال؟")) return;
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/files?category=template&type=${encodeURIComponent(type)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("فشل الحذف");
      setMessage({ type: "success", text: "تم الحذف" });
      if (selectedFile?.category === "template" && selectedFile?.type === type) {
        setSelectedFile(null);
      }
      await fetchFiles();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "فشل الحذف" });
    }
  };

  const handleSelect = (category: string, type: string, label: string, content: string) => {
    setSelectedFile({ category, type, label, content });
    setEditContent(content);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/workspace/${workspaceId}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedFile.category,
          type: selectedFile.type,
          content: editContent,
        }),
      });

      if (!res.ok) throw new Error("فشل الحفظ");

      setSelectedFile({ ...selectedFile, content: editContent });
      setMessage({ type: "success", text: "تم الحفظ بنجاح" });

      const refreshRes = await fetch(`/api/workspace/${workspaceId}/files`);
      const refreshData = await refreshRes.json();
      setFiles(refreshData);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "فشل حفظ الملف" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">جاري تحميل الملفات...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a
            href={`/dashboard/w/${workspaceId}`}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← المحادثة
          </a>
          <a href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
            المشاريع
          </a>
          <h1 className="font-bold text-lg">ملفات — {workspaceName}</h1>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-72 border-l bg-white overflow-y-auto shrink-0">
          <div className="p-3 space-y-4">
            {/* _context folder */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-2">
                _context
              </h3>
              <div className="space-y-0.5">
                {files?.context.map((f) => (
                  <button
                    key={f.id}
                    onClick={() =>
                      handleSelect("context", f.type, CONTEXT_LABELS[f.type] || f.type, f.content)
                    }
                    className={`w-full text-right px-3 py-2 rounded-lg text-sm ${
                      selectedFile?.category === "context" && selectedFile?.type === f.type
                        ? "bg-blue-50 text-blue-700 font-medium border border-blue-200"
                        : "text-gray-700 hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    {CONTEXT_LABELS[f.type] || f.type}
                  </button>
                ))}
              </div>
            </div>

            {/* CLAUDE.md */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-2">
                الجذر
              </h3>
              {files?.claudeMd ? (
                <button
                  onClick={() =>
                    handleSelect("claudeMd", "claudeMd", "CLAUDE.md", files.claudeMd!.content)
                  }
                  className={`w-full text-right px-3 py-2 rounded-lg text-sm ${
                    selectedFile?.category === "claudeMd"
                      ? "bg-blue-50 text-blue-700 font-medium border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  CLAUDE.md
                </button>
              ) : (
                <p className="px-3 py-2 text-sm text-gray-400">غير موجود</p>
              )}
            </div>

            {/* _sop folder */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-2">
                _sop
              </h3>
              <div className="space-y-0.5">
                {files?.sops.map((f) => (
                  <button
                    key={f.id}
                    onClick={() =>
                      handleSelect("sop", f.type, SOP_LABELS[f.type] || f.type, f.content)
                    }
                    className={`w-full text-right px-3 py-2 rounded-lg text-sm ${
                      selectedFile?.category === "sop" && selectedFile?.type === f.type
                        ? "bg-blue-50 text-blue-700 font-medium border border-blue-200"
                        : "text-gray-700 hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    {SOP_LABELS[f.type] || f.type}
                  </button>
                ))}
              </div>
            </div>

            {/* _templates folder */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  _templates
                </h3>
                <button
                  onClick={() => setShowAddExample(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  + إضافة مثال
                </button>
              </div>

              {showAddExample && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2 space-y-2">
                  <p className="text-xs text-blue-700 font-medium">اسم المثال (مثل: بوست لينكد إن ناجح)</p>
                  <input
                    type="text"
                    value={newExampleName}
                    onChange={(e) => setNewExampleName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddExample(); }}
                    placeholder="مثال: بوست عن الأتمتة"
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                    dir="auto"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddExample}
                      className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                    >
                      إضافة
                    </button>
                    <button
                      onClick={() => { setShowAddExample(false); setNewExampleName(""); }}
                      className="flex-1 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-xs hover:bg-gray-50"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-0.5">
                {files?.templates.map((f) => {
                  const isBuiltIn = BUILTIN_TEMPLATES.includes(f.type);
                  const label = isBuiltIn
                    ? TEMPLATE_LABELS[f.type] || f.type
                    : `📝 ${f.type.replace(/_/g, " ")}`;
                  return (
                    <div key={f.id} className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          handleSelect("template", f.type, label, f.content)
                        }
                        className={`flex-1 text-right px-3 py-2 rounded-lg text-sm ${
                          selectedFile?.category === "template" && selectedFile?.type === f.type
                            ? "bg-blue-50 text-blue-700 font-medium border border-blue-200"
                            : "text-gray-700 hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        {label}
                      </button>
                      {!isBuiltIn && (
                        <button
                          onClick={() => handleDeleteExample(f.type)}
                          className="text-gray-400 hover:text-red-500 p-1 shrink-0"
                          title="حذف المثال"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <>
              <div className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-bold">{selectedFile.label}</h2>
                  <p className="text-xs text-gray-400">
                    {selectedFile.category === "context" && "_context/"}
                    {selectedFile.category === "sop" && "_sop/"}
                    {selectedFile.category === "template" && "_templates/"}
                    {selectedFile.type}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {message && (
                    <span
                      className={`text-sm ${
                        message.type === "success" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {message.text}
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || editContent === selectedFile.content}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-4">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full p-4 border rounded-lg font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  dir="auto"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-5xl mb-3">📂</p>
                <p>اختر ملفاً من القائمة لعرضه وتعديله</p>
                <p className="text-sm mt-2">
                  التغييرات تحفظ فوراً في حسابك
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
