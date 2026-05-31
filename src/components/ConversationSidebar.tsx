"use client";

import { useState, useEffect, useCallback } from "react";

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: string | null;
}

interface SidebarProps {
  workspaceId: string;
  currentConversationId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar({
  workspaceId,
  currentConversationId,
  onSelect,
  onDelete,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/conversations`);
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المحادثة؟")) return;
    try {
      await fetch(`/api/workspace/${workspaceId}/conversations/${id}`, {
        method: "DELETE",
      });
      if (currentConversationId === id) onSelect(null);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed bottom-4 right-4 z-50 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        {open ? "✕" : "☰"}
      </button>

      <aside
        className={`${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static inset-y-0 right-0 z-40 w-72 bg-white border-l transform transition-transform duration-200 flex flex-col`}
      >
        <div className="p-4 border-b">
          <button
            onClick={() => onSelect(null)}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            + محادثة جديدة
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-8">جاري التحميل...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">لا توجد محادثات سابقة</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative rounded-lg cursor-pointer ${
                  currentConversationId === conv.id ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <button
                  onClick={() => onSelect(conv.id)}
                  className="w-full text-right p-3"
                >
                  <div className="font-medium text-sm truncate">
                    {conv.title || "بدون عنوان"}
                  </div>
                  {conv.lastMessage && (
                    <div className="text-xs text-gray-400 truncate mt-1">
                      {conv.lastMessage}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {conv.messageCount} رسائل ·{" "}
                    {new Date(conv.updatedAt).toLocaleDateString("ar-SA")}
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(conv.id)}
                  className="hidden group-hover:block absolute left-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 text-xs"
                >
                  حذف
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t text-center">
          <a
            href="/dashboard/settings"
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            الإعدادات
          </a>
        </div>
      </aside>

      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
