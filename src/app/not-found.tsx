import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="text-5xl">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900">الصفحة غير موجودة</h1>
        <p className="text-gray-500">عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها.</p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          العودة إلى الرئيسية
        </Link>
      </div>
    </div>
  );
}
