import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId: session.user.id },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { category, type, content } = await req.json();
  if (!category || !type) {
    return NextResponse.json({ error: "Missing fields: category, type" }, { status: 400 });
  }

  if (category !== "template") {
    return NextResponse.json({ error: "Can only create template files" }, { status: 400 });
  }

  const existing = await prisma.templateFile.findUnique({
    where: { workspaceId_type: { workspaceId, type } },
  });
  if (existing) {
    return NextResponse.json({ error: "ملف بنفس الاسم موجود بالفعل" }, { status: 409 });
  }

  const file = await prisma.templateFile.create({
    data: { workspaceId, type, content: content || "" },
  });

  return NextResponse.json({ file });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId: session.user.id },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");

  if (!type || category !== "template") {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const builtIn = ["socialPost", "article", "email", "landingPage"];
  if (builtIn.includes(type)) {
    return NextResponse.json({ error: "لا يمكن حذف القوالب الأساسية" }, { status: 400 });
  }

  await prisma.templateFile.delete({
    where: { workspaceId_type: { workspaceId, type } },
  });

  return NextResponse.json({ success: true });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId: session.user.id },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const contextFiles = await prisma.contextFile.findMany({ where: { workspaceId } });
  const claudeMd = await prisma.claudeMd.findUnique({ where: { workspaceId } });
  const sopFiles = await prisma.sopFile.findMany({ where: { workspaceId } });
  const templateFiles = await prisma.templateFile.findMany({ where: { workspaceId } });

  return NextResponse.json({
    context: contextFiles.map((f) => ({ id: f.id, type: f.type, content: f.content, updatedAt: f.updatedAt })),
    claudeMd: claudeMd ? { id: claudeMd.id, content: claudeMd.content, updatedAt: claudeMd.updatedAt } : null,
    sops: sopFiles.map((f) => ({ id: f.id, type: f.type, content: f.content, updatedAt: f.updatedAt })),
    templates: templateFiles.map((f) => ({ id: f.id, type: f.type, content: f.content, updatedAt: f.updatedAt })),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId: session.user.id },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { category, type, content } = await req.json();
  if (!category || !type || content === undefined) {
    return NextResponse.json({ error: "Missing fields: category, type, content" }, { status: 400 });
  }

  try {
    if (category === "context") {
      await prisma.contextFile.update({
        where: { workspaceId_type: { workspaceId, type } },
        data: { content },
      });
    } else if (category === "claudeMd") {
      await prisma.claudeMd.update({
        where: { workspaceId },
        data: { content },
      });
    } else if (category === "sop") {
      await prisma.sopFile.update({
        where: { workspaceId_type: { workspaceId, type } },
        data: { content },
      });
    } else if (category === "template") {
      await prisma.templateFile.upsert({
        where: { workspaceId_type: { workspaceId, type } },
        update: { content },
        create: { workspaceId, type, content },
      });
    } else {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("File update error:", err);
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}
