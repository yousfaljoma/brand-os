"use client";

import { useState } from "react";

interface OutputItem {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
}

export function OutputsView({
  workspaceId,
  workspaceName,
  outputs,
}: {
  workspaceId: string;
  workspaceName: string;
  outputs: OutputItem[];
}) {
  const [selected, setSelected] = useState<OutputItem | null>(null);

  const typeLabels: Record<string, string> = {
    page: "صفحة",
    social: "منشور",
    email: "بريد",
    research: "بحث",
    report: "تقرير",
    other: "أخرى",
  };

  const typeColors: Record<string, string> = {
    page: "bg-blue-100 text-blue-700",
    social: "bg-green-100 text-green-700",
    email: "bg-purple-100 text-purple-700",
    research: "bg-orange-100 text-orange-700",
    report: "bg-red-100 text-red-700",
    other: "bg-gray-100 text-gray-700",
  };

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
          <a
            href="/dashboard"
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            المشاريع
          </a>
          <h1 className="font-bold text-lg">المخرجات — {workspaceName}</h1>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-80 border-l bg-white overflow-y-auto shrink-0">
          {outputs.length === 0 ? (
            <div className="text-center text-gray-400 py-16 px-4">
              <p className="text-4xl mb-3">📂</p>
              <p>لا توجد مخرجات محفوظة بعد</p>
              <p className="text-sm mt-2">
                اكتب محتوى في المحادثة واحفظه ليظهر هنا
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {outputs.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className={`w-full text-right p-3 rounded-lg text-sm ${
                    selected?.id === o.id
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        typeColors[o.type] || typeColors.other
                      }`}
                    >
                      {typeLabels[o.type] || o.type}
                    </span>
                  </div>
                  <div className="font-medium truncate">{o.title}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(o.createdAt).toLocaleDateString("ar-SA")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`px-3 py-1 rounded text-sm ${
                      typeColors[selected.type] || typeColors.other
                    }`}
                  >
                    {typeLabels[selected.type] || selected.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(selected.createdAt).toLocaleDateString("ar-SA")}
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-6">{selected.title}</h2>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {selected.content}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-32">
              <p className="text-5xl mb-3">📝</p>
              <p>اختر مخرجاً من القائمة لعرضه</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
