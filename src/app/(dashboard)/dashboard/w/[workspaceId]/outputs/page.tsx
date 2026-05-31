import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { OutputsView } from "@/components/OutputsView";

export default async function OutputsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { workspaceId } = await params;

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId: session.user.id },
  });
  if (!workspace) notFound();

  const outputs = await prisma.outputAsset.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = outputs.map((o) => ({
    id: o.id,
    type: o.type,
    title: o.title,
    content: o.content,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <OutputsView workspaceId={workspaceId} workspaceName={workspace.name} outputs={serialized} />
  );
}
