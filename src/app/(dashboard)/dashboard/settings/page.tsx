import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const apiKey = await prisma.apiKey.findFirst({
    where: { userId: session.user.id, provider: "openrouter" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
              ← العودة
            </a>
            <h1 className="text-xl font-bold">الإعدادات</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-bold mb-1">الحساب</h2>
          <p className="text-sm text-gray-500 mb-4">معلومات حسابك الشخصي</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
              <p className="text-gray-900">{session.user.email}</p>
            </div>
            {session.user.name && (
              <div>
                <label className="block text-sm font-medium text-gray-700">الاسم</label>
                <p className="text-gray-900">{session.user.name}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-bold mb-1">مفتاح OpenRouter API</h2>
          <p className="text-sm text-gray-500 mb-4">
            مفتاح API من OpenRouter.ai. النظام يختار تلقائياً أفضل نموذج مجاني متاح. يُشفر ويُحفظ بشكل آمن.
          </p>
          <SettingsForm hasExistingKey={!!apiKey} />
        </div>
      </main>
    </div>
  );
}
