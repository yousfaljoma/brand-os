"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900">حدث خطأ غير متوقع</h1>
        <p className="text-gray-500">{error.message || "يرجى المحاولة مرة أخرى"}</p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
