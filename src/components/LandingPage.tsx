"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LoginForm, RegisterForm } from "./AuthForms";

function GuestButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGuest = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.ok) {
        window.location.href = "/dashboard";
      } else {
        setError("فشل تسجيل الدخول التلقائي");
      }
    } catch {
      setError("حدث خطأ");
    }
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={handleGuest}
        disabled={loading}
        className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl text-sm hover:border-gray-400 hover:text-gray-600 disabled:opacity-50"
      >
        {loading ? "جاري..." : "⚡ دخول سريع للتجربة (حساب مؤقت)"}
      </button>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </>
  );
}

export function LandingPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  if (isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center space-y-6 max-w-lg mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900">مرحباً بك مرة أخرى!</h1>
          <p className="text-lg text-gray-500">أنت مسجل الدخول بالفعل. تفضل إلى لوحة التحكم.</p>
          <a
            href="/dashboard"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-xl text-lg font-medium hover:bg-blue-700 transition-colors"
          >
            الذهاب إلى لوحة التحكم
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center space-y-8 max-w-2xl mx-auto px-4">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight">
            Brand OS
          </h1>
          <p className="text-xl text-gray-500">
            نظام تشغيل براندك الشخصي — ذكاء اصطناعي يفهم هويتك وينتج محتوى يشبهك
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          {!showLogin && !showRegister ? (
            <>
              <button
                onClick={() => setShowRegister(true)}
                className="px-10 py-4 bg-blue-600 text-white rounded-xl text-lg font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                ابدأ — أنشئ نظامك الآن
              </button>
              <button
                onClick={() => setShowLogin(true)}
                className="text-blue-600 hover:underline text-sm"
              >
                لديك حساب؟ سجل دخول
              </button>
              <div className="w-full max-w-xs pt-2 border-t border-gray-200">
                <GuestButton />
              </div>
            </>
          ) : showRegister ? (
            <div className="w-full max-w-sm space-y-4">
              <h2 className="text-2xl font-bold text-center">إنشاء حساب جديد</h2>
              <RegisterForm onSuccess={() => window.location.href = "/dashboard"} />
              <button
                onClick={() => { setShowRegister(false); setShowLogin(true); }}
                className="text-blue-600 hover:underline text-sm w-full text-center"
              >
                لديك حساب؟ سجل دخول
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-4">
              <h2 className="text-2xl font-bold text-center">تسجيل الدخول</h2>
              <LoginForm />
              <button
                onClick={() => { setShowLogin(false); setShowRegister(true); }}
                className="text-blue-600 hover:underline text-sm w-full text-center"
              >
                ليس لديك حساب؟ أنشئ واحداً
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-right">
          <div className="p-6 bg-white rounded-xl shadow-sm border">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-bold mb-2">أسئلة ذكية</h3>
            <p className="text-sm text-gray-500">نجمع معلومات براندك عبر أسئلة موجّهة، ونبني ملفات معرفة كاملة</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm border">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold mb-2">توليد فوري</h3>
            <p className="text-sm text-gray-500">النموذج يقرأ هويتك وينتج محتوى تسويقي متسق مع صوتك</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm border">
            <div className="text-3xl mb-3">📂</div>
            <h3 className="font-bold mb-2">مساحة عمل</h3>
            <p className="text-sm text-gray-500">كل محتواك ومشاريعك محفوظة ومنظمة — تعود لها متى شئت</p>
          </div>
        </div>
      </div>
    </div>
  );
}
