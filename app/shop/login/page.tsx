"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase/client";

export default function ShopkeeperLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState("");

  // Already logged in hai to direct dashboard
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        router.replace("/shops/dashboard");
        return;
      }

      setCheckingSession(false);
    };

    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setMessage("⚠️ Email aur password dono fill karein.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("LOGIN ERROR:", error);
      setLoading(false);
      setMessage("❌ Login failed. Email ya password check karein.");
      return;
    }

    setMessage("✅ Login successful! Dashboard open ho raha hai...");

    // Supabase session save karega
    setTimeout(() => {
      router.replace("/shop/dashboard");
    }, 400);
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <div className="text-3xl mb-3">⏳</div>
          <p className="font-semibold text-gray-800">
            Session check ho raha hai...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="text-center mb-7">
          <div className="text-5xl mb-3">🏪</div>

          <h1 className="text-2xl font-bold text-gray-900">
            Shopkeeper Login
          </h1>

          <p className="text-gray-500 mt-2">
            Apni dukaan ka dashboard kholen
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shopkeeper@gmail.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                autoComplete="current-password"
              />
            </div>

            {message && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3.5 transition"
            >
              {loading ? "Login ho raha hai..." : "Login Karein"}
            </button>
          </form>

          {/* Register */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-3">
              Nayi dukaan register karni hai?
            </p>

            <button
              type="button"
              onClick={() => router.push("/shop/register")}
              className="w-full rounded-xl border-2 border-green-600 text-green-700 font-bold py-3 hover:bg-green-50"
            >
              🏪 Apni Shop Register Karein
            </button>
          </div>

          {/* Home */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full mt-4 text-sm text-gray-500 hover:text-green-700"
          >
            ← Home par wapas
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          Login ke baad aapki session active rahegi.
        </p>
      </div>
    </main>
  );
}