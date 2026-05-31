import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const GUEST_PASSWORD = "guest-mode-password";

export async function POST() {
  try {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const email = `guest-${timestamp}-${random}@local.dev`;

    const hashedPassword = await bcrypt.hash(GUEST_PASSWORD, 12);
    const user = await prisma.user.create({
      data: { email, name: "مستخدم تجريبي", hashedPassword },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      password: GUEST_PASSWORD,
    });
  } catch (error) {
    console.error("Guest error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
