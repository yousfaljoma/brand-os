import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { WorkspaceClient } from "@/components/WorkspaceClient";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ conversation?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { workspaceId } = await params;
  const { conversation: conversationId } = await searchParams;

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId: session.user.id },
  });
  if (!workspace) notFound();

  const contextFiles = await prisma.contextFile.findMany({
    where: { workspaceId },
  });
  const claudeMd = await prisma.claudeMd.findUnique({
    where: { workspaceId },
  });
  const sopFiles = await prisma.sopFile.findMany({
    where: { workspaceId },
  });
  const templateFiles = await prisma.templateFile.findMany({
    where: { workspaceId },
  });

  let initialMessages: { id: string; role: string; content: string }[] = [];
  if (conversationId) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    });
    if (conversation) {
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      });
      initialMessages = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }));
    }
  }

  return (
    <WorkspaceClient
      workspaceId={workspaceId}
      workspaceName={workspace.name}
      contextFileCount={contextFiles.length}
      sopFileCount={sopFiles.length}
      templateFileCount={templateFiles.length}
      hasClaudeMd={!!claudeMd}
      initialConversationId={conversationId || null}
      initialMessages={initialMessages}
    />
  );
}
