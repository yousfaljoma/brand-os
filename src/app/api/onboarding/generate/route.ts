import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { validateApiKey } from "@/lib/openrouter";
import { ONBOARDING_QUESTIONS } from "@/lib/prompts";

const CONTEXT_TYPES = ["brandContext", "offerContext", "voiceGuide", "growthContext", "styleGuide"] as const;

function formatAnswersAsContext(type: (typeof CONTEXT_TYPES)[number], answers: string[]): string {
  const questions = ONBOARDING_QUESTIONS[type];
  const lines = [
    `# ${type}`,
    "",
    "الإجابات المباشرة من المستخدم:",
    "",
  ];
  answers.forEach((a, i) => {
    if (questions[i]) {
      lines.push(`## ${questions[i]}`);
      lines.push(a);
      lines.push("");
    }
  });
  return lines.join("\n");
}

const DEFAULT_SOP_CONTENT = `# إجراء تشغيلي قياسي

## خطوات العمل
1. حدد الهدف من المهمة
2. اجمع المعلومات اللازمة
3. نفذ الخطوات حسب التعليمات
4. راجع الجودة
5. سلم النتيجة

## معايير الجودة
- الدقة في التنفيذ
- الالتزام بصوت البراند
- المراجعة قبل التسليم
`;

const DEFAULT_TEMPLATE_CONTENT = `# قالب

## الهيكل العام
- افتتاحية
- محتوى رئيسي
- خاتمة
- دعوة للتفاعل

## إرشادات الاستخدام
1. اقرأ ملفات السياق أولاً
2. اختر النبرة المناسبة للمنصة
3. اكتب المحتوى حسب الهيكل
4. راجع الصوت والستايل
`;

const DEFAULT_CLAUDE_MD = `# Brand OS — دليل عمل الذكاء الاصطناعي

## هيكل المشروع
- **\_context/**: ملفات سياق البراند (Brand Context, Offer, Voice, Growth, Style)
- **\_sop/**: الإجراءات التشغيلية القياسية
- **\_templates/**: قوالب المحتوى الجاهزة

## قواعد العمل
1. اقرأ ملفات السياق قبل أي مهمة
2. استخدم الإجراءات التشغيلية كدليل إجرائي
3. استخدم القوالب كمرجع أسلوبي
4. حافظ على صوت البراند في كل المخرجات
5. راجع الجودة قبل تسليم المحتوى

## قواعد الصوت
- تحدث كإنسان، لا كخوارزمية
- استخدم "أنت" لمخاطبة القارئ
- قدم قيمة حقيقية في كل محتوى
- التزم بملفات السياق ولا تخترع معلومات خارجها
`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { openRouterApiKey, workspaceName, answers } = await req.json();

    if (!openRouterApiKey || !answers || !workspaceName) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const validation = await validateApiKey(openRouterApiKey);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "مفتاح OpenRouter غير صالح." },
        { status: 400 },
      );
    }

    const encryptedKey = encrypt(openRouterApiKey);
    const existingKey = await prisma.apiKey.findFirst({
      where: { userId: session.user.id, provider: "openrouter" },
    });
    if (existingKey) {
      await prisma.apiKey.update({ where: { id: existingKey.id }, data: { encryptedKey } });
    } else {
      await prisma.apiKey.create({
        data: { userId: session.user.id, encryptedKey, provider: "openrouter" },
      });
    }

    const workspace = await prisma.workspace.create({
      data: { userId: session.user.id, name: workspaceName },
    });

    // Save raw answers as context files (no AI call to avoid timeout)
    for (const type of CONTEXT_TYPES) {
      const userAnswers = answers[type];
      if (userAnswers && Array.isArray(userAnswers) && userAnswers.length > 0) {
        await prisma.contextFile.create({
          data: { workspaceId: workspace.id, type, content: formatAnswersAsContext(type, userAnswers) },
        });
      }
    }

    // Create default CLAUDE.md
    await prisma.claudeMd.create({
      data: { workspaceId: workspace.id, content: DEFAULT_CLAUDE_MD },
    });

    // Create default SOP files
    const sopTypes = ["contentCreation", "campaignManagement", "clientOnboarding"] as const;
    for (const type of sopTypes) {
      await prisma.sopFile.create({
        data: { workspaceId: workspace.id, type, content: DEFAULT_SOP_CONTENT },
      });
    }

    // Create default Template files
    const templateTypes = ["socialPost", "article", "email", "landingPage"] as const;
    for (const type of templateTypes) {
      await prisma.templateFile.create({
        data: { workspaceId: workspace.id, type, content: DEFAULT_TEMPLATE_CONTENT },
      });
    }

    return NextResponse.json({ success: true, workspaceId: workspace.id });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "حدث خطأ غير متوقع" },
      { status: 500 },
    );
  }
}
