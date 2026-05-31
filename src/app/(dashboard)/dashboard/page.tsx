import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const hasApiKey = await prisma.apiKey.findFirst({
    where: { userId: session.user.id },
  });

  const workspaces = await prisma.workspace.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const workspaceIds = workspaces.map((ws) => ws.id);
  const contextFileCount = workspaceIds.length > 0
    ? await prisma.contextFile.count({ where: { workspaceId: { in: workspaceIds } } })
    : 0;

  const serializedWorkspaces = workspaces.map((ws) => ({
    ...ws,
    createdAt: ws.createdAt.toISOString(),
  }));

  return (
    <DashboardContent
      workspaces={serializedWorkspaces}
      needsOnboarding={!hasApiKey || contextFileCount === 0}
    />
  );
}
