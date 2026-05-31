import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <div className="max-w-xl mx-auto w-full px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">بناء نظام براندك</h1>
          <p className="text-gray-500 mt-2">أجب على الأسئلة التالية ليتمكن الذكاء الاصطناعي من فهم هويتك</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border">
          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
