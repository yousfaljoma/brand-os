import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callOpenRouter } from "@/lib/openrouter";
import { CHAT_SYSTEM_PROMPT, PLATFORM_GUIDES, detectPlatform } from "@/lib/prompts";

const PLATFORM_WORD_LIMITS: Record<string, { min: number; max: number }> = {
  linkedin: { min: 400, max: 1800 },
  twitter: { min: 50, max: 600 },
  facebook: { min: 250, max: 1200 },
  instagram: { min: 200, max: 800 },
  page: { min: 1000, max: 5000 },
  email: { min: 300, max: 1500 },
  research: { min: 1500, max: 8000 },
};

const BAD_OPENINGS = [
  /في عالم\s+(today|اليوم|السريع|المتسارع|الرقمي|الحديث)/i,
  /في\s+هذه\s+(المقال|التدوينة|السطور|الموضوع)/i,
  /نقدم\s+لكم/i,
  /سنتحدث\s+(في|عن)/i,
  /if you('re| are) looking for/i,
  /in today('s|s)? (fast-paced|digital|modern|world)/i,
  /i'm (happy|excited|thrilled) to/i,
  /مرحبا\s+بكم/i,
];

const BAD_PATTERNS = [
  /كما\s+ذكرنا\s+سابقاً/i,
  /وتجدر\s+الإشارة/i,
  /من\s+الجدير\s+بالذكر/i,
  /last but not least/i,
  /في\s+الختام/i,
  /ختاماً/i,
];

const GENERIC_PATTERNS = [
  /من\s+المهم\s+أن/i,
  /يجب\s+عليك\s+أن/i,
  /احرص\s+على/i,
  /تذكر\s+دائماً/i,
  /في\s+النهاية/i,
  /الأمر\s+ببساطة/i,
  /باختصار/i,
  /بكل\s+بساطة/i,
  /ما\s+لا\s+يعرفه\s+الكثيرون/i,
  /سر\s+النجاح/i,
];

const DEPTH_MARKERS = [
  /على\s+سبيل\s+المثال/i,
  /مثال/i,
  /دراسة/i,
  /إحصائية/i,
  /حالة/i,
  /خطوة/i,
  /أولاً|ثانياً|ثالثاً/i,
  /السبب/i,
  /النتيجة/i,
  /الفرق/i,
  /بالمقارنة/i,
  /لأن/i,
  /نظراً/i,
  /بسبب/i,
];

interface PlatformIssue {
  type: "length" | "opening" | "pattern" | "structure" | "tone" | "depth" | "unique";
  message: string;
}

function enforcePlatformGuardrails(content: string, platform: string): PlatformIssue[] {
  const issues: PlatformIssue[] = [];
  const limits = PLATFORM_WORD_LIMITS[platform] || { min: 100, max: 2000 };
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  if (wordCount < limits.min) {
    issues.push({
      type: "length",
      message: `المحتوى ${wordCount} كلمة. الحد الأدنى للمنصة ${limits.min} كلمة.`,
    });
  }
  if (wordCount > limits.max) {
    issues.push({
      type: "length",
      message: `المحتوى ${wordCount} كلمة. الحد الأقصى للمنصة ${limits.max} كلمة. يُفضل اختصاره أو وضع النسخة الكاملة في التعليقات.`,
    });
  }

  const first200 = content.slice(0, 200);
  for (const pattern of BAD_OPENINGS) {
    if (pattern.test(first200)) {
      issues.push({
        type: "opening",
        message: "الافتتاحية تحتوي على نمط مكرر. استخدم سؤالاً مباشراً أو قصة أو إحصائية.",
      });
      break;
    }
  }

  for (const pattern of BAD_PATTERNS) {
    if (pattern.test(content)) {
      issues.push({
        type: "pattern",
        message: "يحتوي المحتوى على تعابير عامة مكررة.",
      });
      break;
    }
  }

  if (platform === "linkedin") {
    const paragraphs = content.split("\n\n").filter(Boolean);
    const longParas = paragraphs.filter((p) => p.split(/\s+/).filter(Boolean).length > 80);
    if (longParas.length > 0) {
      issues.push({
        type: "structure",
        message: "فقرات طويلة جداً للينكد إن. اجعل كل فقرة 2-3 جمل كحد أقصى.",
      });
    }
  }

  if (platform === "twitter") {
    if (content.length > 280 && !content.includes("🧵")) {
      issues.push({
        type: "structure",
        message: "التغريدة أطول من 280 حرفاً. استخدم ثريد (🧵) أو اختصر.",
      });
    }
  }

  // --- عمق المحتوى: تحقق من وجود أمثلة وأدلة ---
  const depthMatchCount = DEPTH_MARKERS.filter((p) => p.test(content)).length;
  if (wordCount >= 300 && depthMatchCount < 2) {
    issues.push({
      type: "depth",
      message: "المحتوى يفتقر للعمق. أضف أمثلة واقعية، دراسات، أسباباً، أو خطوات عملية.",
    });
  }

  // --- التفرد: تحقق من الأنماط العامة المكررة ---
  for (const pattern of GENERIC_PATTERNS) {
    if (pattern.test(content)) {
      issues.push({
        type: "unique",
        message: `يحتوي المحتوى على أسلوب عام ومكرر: "${pattern.source}". استبدله بلغة أصيلة خاصة بالبراند.`,
      });
      break;
    }
  }

  // --- التحقق من البنية للمحتوى الطويل (مقال/بحث) ---
  if (platform === "page" || platform === "research") {
    if (wordCount >= 800 && !content.includes("**") && !content.includes("#")) {
      issues.push({
        type: "structure",
        message: "المقال الطويل يحتاج إلى تنسيق مرئي (عناوين فرعية، نقاط بارزة) ليسهل قراءته.",
      });
    }
  }

  return issues;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json(
        { error: "انتهت الجلسة. الرجاء تسجيل الخروج ثم تسجيل الدخول مرة أخرى." },
        { status: 401 },
      );
    }

    const { workspaceId, message, conversationId } = await req.json();

    if (!workspaceId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId: session.user.id },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.conversation.create({
        data: { workspaceId, title: message.slice(0, 80) },
      });
      convId = conv.id;
    }

    await prisma.message.create({
      data: { conversationId: convId, role: "user", content: message },
    });

    const platform = detectPlatform(message);
    const platformGuide = PLATFORM_GUIDES[platform] || PLATFORM_GUIDES.linkedin;

    const contextFiles = await prisma.contextFile.findMany({ where: { workspaceId } });
    const claudeMd = await prisma.claudeMd.findUnique({ where: { workspaceId } });
    const sopFiles = await prisma.sopFile.findMany({ where: { workspaceId } });
    const templateFiles = await prisma.templateFile.findMany({ where: { workspaceId } });

    const contextContent = contextFiles
      .map((f) => `=== ${f.type} ===\n${f.content}`)
      .join("\n\n");
    const claudeContent = claudeMd?.content || "";
    const sopContent = sopFiles
      .map((f) => `--- ${f.type} ---\n${f.content}`)
      .join("\n\n");
    const templateContent = templateFiles
      .map((f) => `--- ${f.type} ---\n${f.content}`)
      .join("\n\n");

    const systemPrompt = CHAT_SYSTEM_PROMPT
      .replace("{{PLATFORM_GUIDE}}", platformGuide)
      .replace("{{SOP_FILES_CONTENT}}", sopContent ? `\n${sopContent}` : "\n(لا توجد إجراءات تشغيلية بعد)")
      .replace("{{TEMPLATE_FILES_CONTENT}}", templateContent ? `\n${templateContent}` : "\n(لا توجد قوالب جاهزة بعد)")
      .replace("{{CONTEXT_FILES_CONTENT}}", contextContent ? `\n${contextContent}` : "")
      .replace("{{CLAUDE_MD_CONTENT}}", claudeContent ? `\n${claudeContent}` : "");

    const history = await prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const historyText = history
      .map((m) => `${m.role === "user" ? "المستخدم" : "المساعد"}: ${m.content}`)
      .join("\n\n");

    const fullPrompt = `${historyText}\n\nالمستخدم: ${message}`;

    const response = await callOpenRouter(session.user.id, systemPrompt, fullPrompt);

    // Platform-specific guardrails
    const platformIssues = enforcePlatformGuardrails(response, platform);
    let finalResponse = response;

    // Check for file modifications in AI response
    const fileEditRegex = /<تعديل\s+ملف>([\s\S]*?)<\/تعديل\s+ملف>/g;
    let fileEditMatch;
    let fileEdited = false;

    while ((fileEditMatch = fileEditRegex.exec(response)) !== null) {
      const newContent = fileEditMatch[1].trim();
      if (newContent) {
        try {
          // Attempt to detect which file to update based on content similarity
          // For now, we'll handle the case where the AI provides the full content
          // and the system tries to match it to the correct file
          const contextFiles = await prisma.contextFile.findMany({ where: { workspaceId } });
          const sopFiles = await prisma.sopFile.findMany({ where: { workspaceId } });
          const templateFiles = await prisma.templateFile.findMany({ where: { workspaceId } });
          const claudeMd = await prisma.claudeMd.findUnique({ where: { workspaceId } });

          // Try to match by checking which file's content changed the most
          let bestMatch: { category: string; type: string } | null = null;
          let bestScore = 0;

          for (const f of contextFiles) {
            if (f.content !== newContent) {
              const score = f.content.length > 50 ? 1 : 0;
              if (score > bestScore) {
                bestScore = score;
                bestMatch = { category: "context", type: f.type };
              }
            }
          }
          for (const f of sopFiles) {
            if (f.content !== newContent) {
              const score = f.content.length > 50 ? 1 : 0;
              if (score > bestScore) {
                bestScore = score;
                bestMatch = { category: "sop", type: f.type };
              }
            }
          }
          for (const f of templateFiles) {
            if (f.content !== newContent) {
              const score = f.content.length > 50 ? 1 : 0;
              if (score > bestScore) {
                bestScore = score;
                bestMatch = { category: "template", type: f.type };
              }
            }
          }
          if (claudeMd && claudeMd.content !== newContent) {
            if (1 > bestScore) {
              bestScore = 1;
              bestMatch = { category: "claudeMd", type: "claudeMd" };
            }
          }

          if (bestMatch) {
            const res = await fetch(
              `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/workspace/${workspaceId}/files`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  category: bestMatch.category,
                  type: bestMatch.type,
                  content: newContent,
                }),
              },
            );
            if (res.ok) fileEdited = true;
          }
        } catch (err) {
          console.error("File edit error:", err);
        }
      }
    }

    // Remove file edit tags from the displayed response
    finalResponse = finalResponse.replace(/<تعديل\s+ملف>[\s\S]*?<\/تعديل\s+ملف>/g, "").trim();

    if (platformIssues.length > 0) {
      const issuesText = platformIssues.map((i) => `- [${i.type}] ${i.message}`).join("\n");
      const retryPrompt = `${systemPrompt}\n\n${fullPrompt}\n\nملاحظات الجودة على المحتوى السابق:\n${issuesText}\n\nاعد كتابة المحتوى مع تجنب هذه الملاحظات تماماً.`;
      finalResponse = await callOpenRouter(session.user.id, retryPrompt, "اعد كتابة المحتوى مع تجنب الملاحظات.");
    }

    await prisma.message.create({
      data: { conversationId: convId, role: "assistant", content: finalResponse },
    });

    return NextResponse.json({
      conversationId: convId,
      response: finalResponse,
      platform,
      fileEdited,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "حدث خطأ غير متوقع" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspaceId, conversationId, type, title, content } = await req.json();

    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId: session.user.id },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId },
      });
      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    }

    const asset = await prisma.outputAsset.create({
      data: { workspaceId, conversationId, type, title, content },
    });

    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
