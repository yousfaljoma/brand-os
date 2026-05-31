"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_QUESTIONS, DEFAULT_ANSWERS } from "@/lib/prompts";

type Step = "api-key" | "workspace" | keyof typeof ONBOARDING_QUESTIONS | "generating" | "complete";

const STEP_LABELS: Record<Step, string> = {
  "api-key": "مفتاح OpenRouter API",
  workspace: "اسم المشروع",
  brandContext: "هوية البراند",
  offerContext: "المنتجات والعروض",
  voiceGuide: "صوت البراند",
  growthContext: "النمو والتسويق",
  styleGuide: "التوجيه البصري",
  generating: "جاري توليد الملفات...",
  complete: "اكتمل!",
};

const STEP_ORDER: Step[] = [
  "api-key",
  "workspace",
  "brandContext",
  "offerContext",
  "voiceGuide",
  "growthContext",
  "styleGuide",
];

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("api-key");
  const [apiKey, setApiKey] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string[]>>(() =>
    structuredClone(DEFAULT_ANSWERS)
  );
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const currentStepIndex = STEP_ORDER.indexOf(step as any);
  const progress = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

  const handleNext = () => {
    const currentSection = step as keyof typeof ONBOARDING_QUESTIONS;
    const questions = ONBOARDING_QUESTIONS[currentSection];

    if (!questions) {
      moveNext();
      return;
    }

    const sectionAnswers = answers[currentSection] || [];
    const answer = currentAnswer.trim() || sectionAnswers[currentQIndex]?.trim() || "";

    if (!answer) {
      setError("الرجاء إدخال إجابة");
      return;
    }

    setError("");

    const updatedAnswers = { ...answers, [currentSection]: [...(answers[currentSection] || [])] };
    updatedAnswers[currentSection][currentQIndex] = answer;
    setAnswers(updatedAnswers);

    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
      setCurrentAnswer("");
    } else {
      setCurrentQIndex(0);
      setCurrentAnswer("");
      if (step === "styleGuide") {
        handleGenerate(updatedAnswers);
      } else {
        moveNext();
      }
    }
  };

  const moveNext = () => {
    const idx = STEP_ORDER.indexOf(step as any);
    if (idx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[idx + 1]);
    }
  };

  const handleGenerate = async (latestAnswers?: Record<string, string[]>) => {
    setGenerating(true);
    setError("");
    setStep("generating");

    const finalAnswers = latestAnswers || answersRef.current;

    try {
      const res = await fetch("/api/onboarding/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openRouterApiKey: apiKey,
          workspaceName,
          answers: finalAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حدث خطأ");
        setGenerating(false);
        return;
      }

      setStep("complete");
      setTimeout(() => {
        router.push(`/dashboard/w/${data.workspaceId}`);
      }, 2000);
    } catch {
      setError("حدث خطأ في الاتصال");
      setGenerating(false);
    }
  };

  // API Key step
  if (step === "api-key") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">مفتاح OpenRouter API</h2>
          <p className="text-gray-500 mt-2">أدخل مفتاح API الخاص بك من OpenRouter.ai</p>
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-or-v1-..."
          className="w-full px-4 py-3 border rounded-lg text-center text-lg font-mono"
          dir="ltr"
        />
        <div className="text-sm text-gray-400 text-center">
          مفتاحك يُشفر ويُحفظ بشكل آمن. النظام سيختار تلقائياً أفضل نموذج مجاني متاح.
        </div>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <button
          onClick={() => { setError(""); moveNext(); }}
          disabled={!apiKey.trim()}
          className="w-full py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          التالي
        </button>
      </div>
    );
  }

  // Workspace name step
  if (step === "workspace") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">اسم المشروع</h2>
          <p className="text-gray-500 mt-2">ماذا تسمي براندك أو مشروعك؟</p>
        </div>
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="مثال: برندي الشخصي"
          className="w-full px-4 py-3 border rounded-lg text-lg text-center"
          dir="auto"
        />
        <button
          onClick={() => { setError(""); moveNext(); }}
          disabled={!workspaceName.trim()}
          className="w-full py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          ابدأ الأسئلة
        </button>
      </div>
    );
  }

  // Question steps
  if (step === "brandContext" || step === "offerContext" || step === "voiceGuide" || step === "growthContext" || step === "styleGuide") {
    const questions = ONBOARDING_QUESTIONS[step];
    const sectionAnswers = answers[step] || [];

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{STEP_LABELS[step]}</h2>
          <p className="text-gray-500 mt-1">
            سؤال {currentQIndex + 1} من {questions.length}
          </p>
        </div>

        <div className="bg-gray-100 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <p className="text-lg font-medium mb-4">{questions[currentQIndex]}</p>
          <textarea
            value={currentAnswer || sectionAnswers[currentQIndex] || ""}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg min-h-[120px] resize-y"
            dir="auto"
            placeholder="اكتب إجابتك هنا..."
          />
        </div>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <div className="flex gap-3">
          {currentQIndex > 0 && (
            <button
              onClick={() => {
                const sectionAnswers = answers[step] || [];
                sectionAnswers[currentQIndex] = currentAnswer;
                setAnswers({ ...answers, [step]: sectionAnswers });
                setCurrentQIndex(currentQIndex - 1);
                setCurrentAnswer(sectionAnswers[currentQIndex - 1] || "");
              }}
              className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              السابق
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {currentQIndex < questions.length - 1 ? "التالي" : "إنهاء هذا القسم"}
          </button>
        </div>
      </div>
    );
  }

  // Generating
  if (step === "generating") {
    return (
      <div className="text-center space-y-6 py-12">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <h2 className="text-2xl font-bold">جاري إنشاء نظامك الذكي...</h2>
        <p className="text-gray-500">
          يقوم الذكاء الاصطناعي بتوليد ملفات Context و CLAUDE.md بناءً على إجاباتك
        </p>
        {error && <p className="text-red-500">{error}</p>}
      </div>
    );
  }

  // Complete
  return (
    <div className="text-center space-y-6 py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold">تم إنشاء نظامك بنجاح!</h2>
      <p className="text-gray-500">جاري نقلك إلى مساحة العمل...</p>
    </div>
  );
}
