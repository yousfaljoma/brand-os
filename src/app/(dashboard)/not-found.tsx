import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="text-5xl">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900">الصفحة غير موجودة</h1>
        <p className="text-gray-500">المشروع أو الصفحة التي تبحث عنها غير موجودة.</p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          العودة للوحة التحكم
        </Link>
      </div>
    </div>
  );
}
