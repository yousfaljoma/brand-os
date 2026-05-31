"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: string;
  content: string;
}

interface ChatInterfaceProps {
  workspaceId: string;
  conversationId: string | null;
  initialMessages: Message[];
  onConversationChange: (id: string) => void;
}

export function ChatInterface({
  workspaceId,
  conversationId,
  initialMessages,
  onConversationChange,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");

    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: "user", content: userMessage },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          message: userMessage,
          conversationId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (!conversationId && data.conversationId) {
        onConversationChange(data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.",
        },
      ]);
    }
    setLoading(false);
  };

  const handleSave = useCallback(
    async (content: string, index: number) => {
      const key = `save-${index}`;
      setSavingId(key);

      try {
        const title = content.split("\n")[0].slice(0, 80) || "مخرج بدون عنوان";
        const type = detectType(content);

        const res = await fetch("/api/chat/send", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            conversationId,
            type,
            title,
            content,
          }),
        });

        if (res.ok) {
          showToast("success", "تم حفظ المخرج بنجاح");
        } else {
          showToast("error", "فشل الحفظ");
        }
      } catch {
        showToast("error", "فشل الحفظ");
      }
      setSavingId(null);
    },
    [workspaceId, conversationId]
  );

  return (
    <div className="flex flex-col h-full relative">
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white text-sm transition-all ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-2xl mb-2">👋</p>
            <p className="text-lg">اكتب ما تريد إنشاءه...</p>
            <p className="text-sm mt-2">
              مثلاً: &quot;اكتب لي منشور LinkedIn عن خبرتي في...&quot;
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 whitespace-pre-wrap relative group ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.content}

              {msg.role === "assistant" && !msg.id.startsWith("err-") && (
                <button
                  onClick={() => handleSave(msg.content, idx)}
                  disabled={savingId === `save-${idx}`}
                  className="hidden group-hover:flex absolute -bottom-4 left-2 items-center gap-1 px-2 py-1 bg-white border rounded-full text-xs text-gray-500 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {savingId === `save-${idx}` ? "..." : "💾 حفظ"}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-5 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="اكتب طلبك هنا..."
            className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="auto"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            إرسال
          </button>
        </div>
      </div>
    </div>
  );
}

function detectType(content: string): string {
  if (content.length > 500 && /^# |^[\w\s]+\n=+/m.test(content)) return "page";
  if (/linkedin|facebook|twitter|منشور|post|tweet/i.test(content.slice(0, 200))) return "social";
  if (/email|بريد|nurture|newsletter/i.test(content.slice(0, 200))) return "email";
  if (/بحث|تحليل|research|analysis/i.test(content.slice(0, 200))) return "research";
  if (/تقرير|report/i.test(content.slice(0, 200))) return "report";
  return "other";
}
