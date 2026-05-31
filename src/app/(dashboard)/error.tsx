"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900">حدث خطأ</h1>
        <p className="text-gray-500">{error.message || "حدث خطأ أثناء تحميل هذه الصفحة"}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
          <a
            href="/dashboard"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            العودة للوحة التحكم
          </a>
        </div>
      </div>
    </div>
  );
}
