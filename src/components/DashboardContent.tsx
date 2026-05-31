"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export function DashboardContent({
  workspaces,
  needsOnboarding,
}: {
  workspaces: Workspace[];
  needsOnboarding: boolean;
}) {
  const router = useRouter();

  if (needsOnboarding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center space-y-6 max-w-lg mx-auto px-4">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold text-gray-900">مرحباً بك في Brand OS!</h1>
          <p className="text-lg text-gray-500">
            لنبدأ ببناء نظام تشغيل براندك. أجب على بعض الأسئلة ليتمكن الذكاء الاصطناعي من فهم هويتك.
          </p>
          <button
            onClick={() => router.push("/dashboard/onboarding")}
            className="px-10 py-4 bg-blue-600 text-white rounded-xl text-lg font-medium hover:bg-blue-700 transition-all shadow-lg"
          >
            ابدأ — أجب على الأسئلة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Brand OS</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/settings")}
              className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
            >
              الإعدادات
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">مشاريعي</h2>

        {workspaces.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">لا توجد مشاريع بعد</p>
            <button
              onClick={() => router.push("/dashboard/onboarding")}
              className="mt-4 text-blue-600 hover:underline"
            >
              أنشئ أول مشروع لك
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => router.push(`/dashboard/w/${ws.id}`)}
                className="p-6 bg-white rounded-xl border shadow-sm hover:shadow-md transition-all text-right"
              >
                <h3 className="font-bold text-lg mb-2">{ws.name}</h3>
                {ws.description && (
                  <p className="text-sm text-gray-500 mb-3">{ws.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  {new Date(ws.createdAt).toLocaleDateString("ar-SA")}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
