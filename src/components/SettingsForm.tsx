"use client";

import { useState } from "react";

export function SettingsForm({ hasExistingKey }: { hasExistingKey: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/apikey", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل الحفظ");
      }

      setMessage({ type: "success", text: "تم حفظ المفتاح بنجاح" });
      setApiKey("");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "حدث خطأ" });
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {hasExistingKey && (
        <div className="text-sm text-green-600 flex items-center gap-2">
          <span>✅</span>
          <span>لديك مفتاح API مخزّن مسبقاً. تحديثه سيستبدله.</span>
        </div>
      )}

      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={hasExistingKey ? "أدخل مفتاح جديد لتحديثه..." : "أدخل مفتاح OpenRouter API"}
        className="w-full px-4 py-3 border rounded-lg text-center font-mono"
        dir="ltr"
        required
      />

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={!apiKey.trim() || saving}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {saving ? "جاري التحقق والحفظ..." : hasExistingKey ? "تحديث المفتاح" : "حفظ المفتاح"}
      </button>
    </form>
  );
}
