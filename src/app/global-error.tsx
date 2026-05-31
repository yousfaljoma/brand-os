"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="h-full">
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center space-y-4 max-w-md mx-auto px-4">
            <div className="text-5xl">💥</div>
            <h1 className="text-2xl font-bold text-gray-900">خطأ جذري</h1>
            <p className="text-gray-500">حدث خطأ غير متوقع في التطبيق. يرجى تحديث الصفحة.</p>
            <button
              onClick={reset}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
