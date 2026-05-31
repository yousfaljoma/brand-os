import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { callOpenRouter, validateApiKey } from "@/lib/openrouter";
import {
  ONBOARDING_QUESTIONS,
  SOP_TYPES,
  SOP_LABELS,
  SOP_GENERATION_INSTRUCTIONS,
  TEMPLATE_TYPES,
  TEMPLATE_LABELS,
  TEMPLATE_GENERATION_INSTRUCTIONS,
} from "@/lib/prompts";

const CONTEXT_TYPES = ["brandContext", "offerContext", "voiceGuide", "growthContext", "styleGuide"] as const;

const CONTEXT_LABELS: Record<string, string> = {
  brandContext: "Brand Context",
  offerContext: "Product/Offer Context",
  voiceGuide: "Brand Voice Guide",
  growthContext: "Growth Marketing Context",
  styleGuide: "Brand Style Guide",
};

const CONTEXT_INSTRUCTIONS: Record<string, string> = {
  brandContext: "اكتب ملف Brand Context بتفاصيل عميقة لا تنطبق على أي براند آخر.\n- الجمهور: عمر، مهنة، مشكلة أعمق، طموحات، مخاوف — ليس مجرد 'مهتمون'\n- فرق واحد محدد عن المنافسين — ليس 'نحن الأفضل' بل 'نحن الوحيدون الذين يفعلون X'\n- قيمة البراند: جملة ≤15 كلمة لا يمكن قولها عن غيرك\n- منصات الظهور: بالاسم، نوع المحتوى، التردد، تفاعل الجمهور\n- رحلة الجمهور: كيف ينتقل من المشكلة إلى الحل معك\n- قاعدة الذهب: لو حذفنا اسم البراند، يظل القارئ يعرف من أنت",

  offerContext: "اكتب ملف Offer Depth يجيب على أسئلة المشتري الحقيقية قبل أن يطرحها.\n- لكل منتج: المشكلة الجذرية التي يحلها، وليس فقط وصفه السطحي\n- التسعير: فئات سعرية محددة مع مبرر لكل سعر\n- 5-7 فوائد قابلة للقياس (توفير وقت، زيادة دخل، تقليل مجهود)\n- صف شكل الحياة قبل وبعد 30 يوماً من الاستخدام — قصة تحول وليس وعوداً\n- 3 اعتراضات حقيقية مع ردود مقنعة لكل منها\n- دليل اجتماعي: شهادات، نتائج، أرقام حقيقية",

  voiceGuide: "اكتب ملف Voice Guide يمنع أي نموذج من تشبيه صوت براند آخر.\n- 4-5 صفات نبرة محددة (فضولي، يميل للأسئلة، يستخدم الاستعارات الرياضية)\n- 10-15 كلمة مفضلة حقيقية — كلمات يكررها البراند في كل محتوى\n- 10-15 كلمة ممنوعة — كلمات تضعف الصوت\n- 3 فقرات on-brand (كما يكتب البراند بالضبط)\n- 3 فقرات off-brand (كيف لا يتكلم أبداً)\n- قواعد أسلوبية تفصيلية: طول الجمل، علامات الترقيم، استخدام الأسئلة، متى يستخدم bold",

  growthContext: "اكتب ملف Growth Strategy يرسم خريطة نمو دقيقة قابلة للتنفيذ.\n- 4-6 قنوات تسويقية: نوع المحتوى لكل قناة، الجمهور المستهدف، تردد النشر، مؤشرات النجاح\n- 3-4 منافسين: اسم/وصف دقيق، نقاط قوة، نقاط ضعف، استراتيجياتهم\n- أهداف ذكية (SMART): 'زيادة X بنسبة Y% خلال Z' — مع خطة الوصول\n- تحدي حقيقي — وليس 'قلة وقت' — مع تحليل أسبابه وحلول مقترحة\n- صف الجمهور الحالي: من هم، أين يتواجدون، كيف يتفاعلون",

  styleGuide: "اكتب ملف Style Guide يمنع التخمين في أي قرار بصري.\n- ألوان: أكواد hex دقيقة (أساسي، ثانوي، خلفيات، نص، نقاط تفاعل)\n- خطوط: اسم الخط للعناوين والنصوص مع أمثلة استخدام\n- المود البصري: 7 صفات محددة مع وصف كل صفة\n- أسلوب الصور: حقيقية أم مخزنة؟ إضاءة؟ خلفية؟ ألوان سائدة؟ مشاعر؟\n- 7 Do's و7 Don'ts مع شرح عميق لكل قاعدة (لماذا هذا مناسب وليس ذاك)\n- مثال بصري مفصّل: صف تصميم معين (صفحة، بوست، إعلان) يعبر عن روح البراند",
};

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

    // Build one combined prompt with all answers
    const sections = CONTEXT_TYPES.map((type) => {
      const userAnswers = answers[type];
      if (!userAnswers || !Array.isArray(userAnswers) || userAnswers.length === 0) return "";
      const questions = ONBOARDING_QUESTIONS[type];
      const qa = userAnswers
        .map((a, i) => `س: ${questions[i] || ""}\nج: ${a}`)
        .join("\n");
      return `<section type="${type}">\n${qa}\n</section>`;
    }).filter(Boolean).join("\n\n");

    const sopTypesForPrompt = [...SOP_TYPES];
    const templateTypesForPrompt = [...TEMPLATE_TYPES];

    const prompt = `أنت خبير في بناء أنظمة الذكاء الاصطناعي للبراندات الشخصية. دخلك: إجابات مستخدم في 5 مجالات. مطلوبك: **13 ملفاً بالضبط** — 5 Context + CLAUDE.md + 3 SOP + 4 Templates.

قاعدة أساسية: كل جملة يجب أن تحمل تفاصيل **لا يمكن استبدالها ببراند آخر**. لو حذفنا اسم البراند، يظل القارئ يعرف من أنت. أي جملة عامة تنطبق على غيرك تعني فشل المهمة. إذا إجابة المستخدم عامة، استنتج تفاصيل منطقية من السياق.

طول الملفات:
- ملفات Context: 800-1200 كلمة لكل ملف
- ملفات SOP: 600-1000 كلمة لكل ملف
- ملفات Templates: 500-800 كلمة لكل ملف

إجابات المستخدم:
${sections}

أخرج 13 ملفاً بالضبط بالصيغة التالية — كل ملف بين <file> tags. لا تكتب أي شيء خارج هذه tags:

${CONTEXT_TYPES.map((t) => `<file type="${t}">
[${CONTEXT_LABELS[t]} — بصيغة Markdown]
</file>`).join("\n")}
<file type="claudeMd">
[CLAUDE.md — يوجّه النموذج لاستخدام جميع الملفات عند توليد المحتوى]
</file>
${sopTypesForPrompt.map((t) => `<file type="sop_${t}">
[${SOP_LABELS[t]} — بصيغة Markdown]
</file>`).join("\n")}
${templateTypesForPrompt.map((t) => `<file type="template_${t}">
[${TEMPLATE_LABELS[t]} — بصيغة Markdown]
</file>`).join("\n")}

تعليمات الملفات:

--- ملفات السياق (5) ---
${CONTEXT_TYPES.map((t) => `### ${CONTEXT_LABELS[t]}\n${CONTEXT_INSTRUCTIONS[t]}`).join("\n\n")}

--- ملفات SOP (3) ---
${sopTypesForPrompt.map((t) => `### ${SOP_LABELS[t]}\n${SOP_GENERATION_INSTRUCTIONS[t]}`).join("\n\n")}

--- ملفات القوالب (4) ---
${templateTypesForPrompt.map((t) => `### ${TEMPLATE_LABELS[t]}\n${TEMPLATE_GENERATION_INSTRUCTIONS[t]}`).join("\n\n")}

--- CLAUDE.md ---
اكتب ملف CLAUDE.md متكاملاً يوجّه النموذج لاستخدام جميع الملفات (Context + SOP + Templates) عند توليد المحتوى. يجب أن يشرح:
- هيكل المشروع والمجلدات
- أي ملف يقرأ في أي نوع مهمة
- متى يتبع SOPs ومتى يستخدم القوالب
- قواعد الحفظ والتوجيه
- قواعد الصوت والستايل العامة

قواعد نهائية:
- لا جمل عامة. كل جملة = تفاصيل حصرية لا تنطبق على غيرك.
- استخدم أرقاماً ونسباً وأمثلة محددة.
- العمق أولاً: كل ملف يجب أن يكون مرجعاً كافياً بذاته لكتابة محتوى متعمق.
- تخيل أن هذه الملفات ستُقرأ بواسطة كاتب محتوى محترف — يجب أن تكون كافية لتوليد محتوى أصيل.
- تأكد أن tags الفتح والإغلاق صحيحة 100%.
- **يجب أن يكون الناتج 13 ملفاً بالضبط: brandContext, offerContext, voiceGuide, growthContext, styleGuide, claudeMd, sop_contentCreation, sop_campaignManagement, sop_clientOnboarding, template_socialPost, template_article, template_email, template_landingPage**`;

    const response = await callOpenRouter(
      session.user.id,
      prompt,
      "أنشئ 13 ملفاً: 5 Context + CLAUDE.md + 3 SOP + 4 Templates بالصيغة المطلوبة.",
    );

    // Parse all context files from the response
    let parsedCount = 0;
    for (const type of CONTEXT_TYPES) {
      const regex = new RegExp(`<file\\s+type="${type}">([\\s\\S]*?)<\\/file>`, "i");
      const match = response.match(regex);
      const content = match?.[1]?.trim();
      if (content) {
        await prisma.contextFile.create({
          data: { workspaceId: workspace.id, type, content },
        });
        parsedCount++;
      }
    }

    // Parse CLAUDE.md
    const claudeRegex = /<file\s+type="claudeMd">([\s\S]*?)<\/file>/i;
    const claudeMatch = response.match(claudeRegex);
    const claudeContent = claudeMatch?.[1]?.trim();

    if (claudeContent) {
      await prisma.claudeMd.create({
        data: { workspaceId: workspace.id, content: claudeContent },
      });
      parsedCount++;
    }

    // Fallback: if CLAUDE.md wasn't parsed, save the full response as it
    if (!claudeContent) {
      console.warn("CLAUDE.md not found in response, saving full response as fallback");
      await prisma.claudeMd.create({
        data: { workspaceId: workspace.id, content: response },
      });
    }

    // Parse SOP files
    for (const type of SOP_TYPES) {
      const regex = new RegExp(`<file\\s+type="sop_${type}">([\\s\\S]*?)<\\/file>`, "i");
      const match = response.match(regex);
      const content = match?.[1]?.trim();
      if (content) {
        await prisma.sopFile.create({
          data: { workspaceId: workspace.id, type, content },
        });
        parsedCount++;
      }
    }

    // Parse Template files
    for (const type of TEMPLATE_TYPES) {
      const regex = new RegExp(`<file\\s+type="template_${type}">([\\s\\S]*?)<\\/file>`, "i");
      const match = response.match(regex);
      const content = match?.[1]?.trim();
      if (content) {
        await prisma.templateFile.create({
          data: { workspaceId: workspace.id, type, content },
        });
        parsedCount++;
      }
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
