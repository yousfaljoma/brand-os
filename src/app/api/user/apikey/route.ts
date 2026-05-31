import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { validateApiKey } from "@/lib/openrouter";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: { userId: session.user.id, provider: "openrouter" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    hasKey: !!apiKey,
    createdAt: apiKey?.createdAt || null,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "مفتاح API مطلوب" }, { status: 400 });
    }

    const validation = await validateApiKey(apiKey);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "مفتاح API غير صالح" },
        { status: 400 },
      );
    }

    const encryptedKey = encrypt(apiKey);

    const existing = await prisma.apiKey.findFirst({
      where: { userId: session.user.id, provider: "openrouter" },
    });

    if (existing) {
      await prisma.apiKey.update({
        where: { id: existing.id },
        data: { encryptedKey },
      });
    } else {
      await prisma.apiKey.create({
        data: { userId: session.user.id, encryptedKey, provider: "openrouter" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 500 },
    );
  }
}
