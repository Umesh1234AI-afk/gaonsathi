"use client";

import { useState } from "react";
import { supabase } from "../../utils/supabase/client";

export default function ShopRegister() {
  const [form, setForm] = useState({
    name: "",
    owner_name: "",
    phone: "",
    village: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.owner_name || !form.phone || !form.village) {
      setMessage("⚠️ Please required details fill karein.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("shops").insert([
      {
        name: form.name,
        owner_name: form.owner_name,
        phone: form.phone,
        village: form.village,
        address: form.address,
        is_active: true,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error(error);
      setMessage("❌ Shop register nahi hui. Please dobara try karein.");
      return;
    }

    setMessage("✅ Shop successfully registered!");

    setForm({
      name: "",
      owner_name: "",
      phone: "",
      village: "",
      address: "",
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl">🏪</div>

          <h1 className="text-3xl font-bold text-green-700 mt-3">
            GaonSathi
          </h1>

          <p className="text-slate-500 mt-1">
            Apni shop register karein
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-lg border p-6 md:p-8">

          <h2 className="text-2xl font-bold text-slate-900">
            Shop Registration
          </h2>

          <p className="text-sm text-slate-500 mt-1 mb-6">
            GaonSathi par apni dukaan add karein.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Shop Name */}
            <div>
              <label className="block font-semibold mb-2">
                🏪 Shop Name *
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Jaise: Sharma General Store"
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Owner */}
            <div>
              <label className="block font-semibold mb-2">
                👤 Owner Name *
              </label>

              <input
                type="text"
                name="owner_name"
                value={form.owner_name}
                onChange={handleChange}
                placeholder="Dukandaar ka naam"
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block font-semibold mb-2">
                📱 Mobile Number *
              </label>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="10 digit mobile number"
                maxLength={10}
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Village */}
            <div>
              <label className="block font-semibold mb-2">
                📍 Village *
              </label>

              <input
                type="text"
                name="village"
                value={form.village}
                onChange={handleChange}
                placeholder="Gaon ka naam"
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block font-semibold mb-2">
                🏠 Shop Address
              </label>

              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Shop ka complete address"
                rows={3}
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3.5 rounded-xl font-bold text-lg transition"
            >
              {loading ? "⏳ Registering..." : "✅ Register My Shop"}
            </button>

          </form>

          {/* Message */}
          {message && (
            <div className="mt-5 p-4 rounded-xl bg-slate-100 text-center font-semibold">
              {message}
            </div>
          )}

        </div>

        {/* Back */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-green-700 font-semibold hover:underline"
          >
            ← GaonSathi Home
          </a>
        </div>

      </div>
    </main>
  );
}