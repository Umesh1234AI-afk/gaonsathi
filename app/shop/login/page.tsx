"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase/client";

export default function ShopkeeperLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setMessage("⚠️ Email aur password dono fill karein.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setMessage("❌ Login failed. Email ya password check karein.");
      return;
    }

    setMessage("✅ Login successful!");

    setTimeout(() => {
      router.push("/shop/register");
    }, 700);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 px-4 py-10">
      <div className="max-w-md mx-auto">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏪</div>

          <h1 className="text-3xl font-bold text-green-800">
            Shopkeeper Login
          </h1>

          <p className="text-gray-600 mt-2">
            Apni shop manage karne ke liye login karein
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">

          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shopkeeper@email.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {message && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Login ho raha hai..." : "Login"}
            </button>

          </form>

          <div className="text-center mt-6 text-sm text-gray-600">
            Shopkeeper account nahi hai?
          </div>

          <button
            onClick={() => router.push("/shop/register")}
            className="w-full mt-2 border-2 border-green-600 text-green-700 font-semibold py-3 rounded-xl hover:bg-green-50"
          >
            Apni Shop Register Karein
          </button>

        </div>

      </div>
    </main>
  );
}