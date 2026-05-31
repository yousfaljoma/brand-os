"use client";

import { useState, useCallback } from "react";
import { ConversationSidebar } from "./ConversationSidebar";
import { ChatInterface } from "./ChatInterface";

interface WorkspaceClientProps {
  workspaceId: string;
  workspaceName: string;
  contextFileCount: number;
  sopFileCount: number;
  templateFileCount: number;
  hasClaudeMd: boolean;
  initialConversationId: string | null;
  initialMessages: { id: string; role: string; content: string }[];
}

export function WorkspaceClient({
  workspaceId,
  workspaceName,
  contextFileCount,
  sopFileCount,
  templateFileCount,
  hasClaudeMd,
  initialConversationId,
  initialMessages,
}: WorkspaceClientProps) {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState(initialMessages);

  const handleSelectConversation = useCallback(
    async (id: string | null) => {
      if (id === null) {
        setConversationId(null);
        setMessages([]);
        return;
      }

      try {
        const res = await fetch(
          `/api/workspace/${workspaceId}/conversations/${id}`
        );
        const data = await res.json();
        if (data.messages) {
          setConversationId(id);
          setMessages(
            data.messages.map((m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            }))
          );
        }
      } catch {
        // ignore
      }
    },
    [workspaceId]
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
      }
    },
    [conversationId]
  );

  return (
    <div className="h-screen flex overflow-hidden">
      <ConversationSidebar
        workspaceId={workspaceId}
        currentConversationId={conversationId}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="/dashboard"
              className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
            >
              ← المشاريع
            </a>
            <h1 className="font-bold text-lg truncate">{workspaceName}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm shrink-0">
            <a
              href={`/dashboard/w/${workspaceId}/outputs`}
              className="text-gray-400 hover:text-gray-600"
            >
              المخرجات
            </a>
            <span className="text-gray-300">·</span>
            <a
              href={`/dashboard/w/${workspaceId}/files`}
              className="text-gray-400 hover:text-gray-600 font-medium"
            >
              الملفات
            </a>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">{contextFileCount} سياق</span>
            {sopFileCount > 0 && <><span className="text-gray-300">·</span><span className="text-gray-400">{sopFileCount} SOP</span></>}
            {templateFileCount > 0 && <><span className="text-gray-300">·</span><span className="text-gray-400">{templateFileCount} قوالب</span></>}
            {hasClaudeMd && <><span className="text-gray-300">·</span><span className="text-gray-400">CLAUDE.md</span></>}
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatInterface
            workspaceId={workspaceId}
            conversationId={conversationId}
            initialMessages={messages}
            onConversationChange={(id) => setConversationId(id)}
          />
        </main>
      </div>
    </div>
  );
}
