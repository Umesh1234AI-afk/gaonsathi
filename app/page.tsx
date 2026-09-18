"use client";

import { useEffect, useState } from "react";
import { supabase } from "./utils/supabase/client";

const categories = [
  { icon: "🛒", name: "Kirana" },
  { icon: "🥛", name: "Dairy" },
  { icon: "💊", name: "Medical" },
  { icon: "🥬", name: "Sabzi" },
  { icon: "🔧", name: "Hardware" },
  { icon: "📚", name: "Stationery" },
];

type Shop = {
  id: number;
  name: string;
  owner_name: string | null;
  phone: string | null;
  village: string | null;
  address: string | null;
  is_active: boolean;
};

export default function Home() {
  const [search, setSearch] = useState("");
  const [showOrder, setShowOrder] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadShops();
  }, []);

  async function loadShops() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Shops load nahi ho pa rahi hain.");
    } else {
      setShops(data || []);
    }

    setLoading(false);
  }

  const filteredShops = shops.filter((shop) => {
    const text = `${shop.name} ${shop.village || ""} ${
      shop.address || ""
    }`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">

          <div>
            <h1 className="text-2xl font-bold text-green-700">
              🌾 GaonSathi
            </h1>

            <p className="text-xs text-slate-500">
              Aapke gaon ki shopping, ghar tak
            </p>
          </div>

          <button
            onClick={() => setShowOrder(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-700"
          >
            🛒 My Order
          </button>

        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-br from-green-700 to-emerald-500 text-white">

        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">

          <div className="max-w-3xl">

            <span className="inline-block bg-white/15 px-4 py-2 rounded-full text-sm mb-5">
              🚚 Local shops • Local delivery
            </span>

            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Bazaar jaane ki zarurat nahi.
              <br />

              <span className="text-yellow-300">
                Samaan ghar par mangao.
              </span>
            </h2>

            <p className="mt-5 text-green-50 text-lg max-w-2xl">
              Apne aas-paas ki dukaano se samaan order karo aur ghar par
              delivery pao.
            </p>

            {/* SEARCH */}
            <div className="mt-8 bg-white rounded-2xl p-2 flex flex-col sm:flex-row shadow-xl">

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Shop ya gaon search karein..."
                className="flex-1 px-4 py-4 text-slate-800 outline-none rounded-xl"
              />

              <button
                onClick={() => {
                  document
                    .getElementById("shops")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-2 sm:mt-0 bg-orange-500 hover:bg-orange-600 text-white px-7 py-4 rounded-xl font-bold"
              >
                🔍 Samaan Khojo
              </button>

            </div>

            <p className="mt-3 text-sm text-green-100">
              Example: "Kirana", "Medical", "Dairy"
            </p>

          </div>

        </div>

      </section>

      {/* CATEGORIES */}
      <section className="max-w-6xl mx-auto px-4 py-10">

        <div className="flex items-center justify-between mb-5">

          <h3 className="text-2xl font-bold">
            Kya chahiye aapko?
          </h3>

          <span className="text-sm text-slate-500">
            Local shops
          </span>

        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">

          {categories.map((category) => (

            <button
              key={category.name}
              onClick={() => setSearch(category.name)}
              className="bg-white border rounded-2xl p-5 hover:border-green-500 hover:shadow-md transition"
            >

              <div className="text-3xl">
                {category.icon}
              </div>

              <div className="mt-2 font-semibold text-sm">
                {category.name}
              </div>

            </button>

          ))}

        </div>

      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-6xl mx-auto px-4 pb-10">

        <div className="bg-white rounded-3xl border p-6 md:p-8">

          <h3 className="text-2xl font-bold">
            GaonSathi kaise kaam karega?
          </h3>

          <div className="grid md:grid-cols-3 gap-6 mt-7">

            <div>
              <div className="text-4xl">📱</div>

              <h4 className="font-bold mt-3">
                1. Samaan khojo
              </h4>

              <p className="text-sm text-slate-600 mt-1">
                Apni zarurat ka samaan ya shop search karo.
              </p>
            </div>

            <div>
              <div className="text-4xl">🏪</div>

              <h4 className="font-bold mt-3">
                2. Local shop
              </h4>

              <p className="text-sm text-slate-600 mt-1">
                Paas ki participating shop se order karo.
              </p>
            </div>

            <div>
              <div className="text-4xl">🏠</div>

              <h4 className="font-bold mt-3">
                3. Ghar par pao
              </h4>

              <p className="text-sm text-slate-600 mt-1">
                Shopkeeper ya delivery partner samaan pahunchayega.
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* REAL SHOPS */}
      <section
        id="shops"
        className="max-w-6xl mx-auto px-4 pb-14"
      >

        <div className="flex items-center justify-between mb-5">

          <h3 className="text-2xl font-bold">
            🏪 Aas-paas ki Dukane
          </h3>

          <button
            onClick={loadShops}
            className="text-sm text-green-700 font-semibold"
          >
            ↻ Refresh
          </button>

        </div>

        {/* LOADING */}
        {loading && (
          <div className="bg-white border rounded-2xl p-8 text-center">
            <div className="text-4xl">⏳</div>

            <p className="mt-3 text-slate-600">
              Shops load ho rahi hain...
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">

            <p className="text-red-700 font-semibold">
              {error}
            </p>

            <button
              onClick={loadShops}
              className="mt-4 bg-red-600 text-white px-5 py-2 rounded-xl"
            >
              Dobara Try Karein
            </button>

          </div>
        )}

        {/* NO SHOPS */}
        {!loading && !error && filteredShops.length === 0 && (
          <div className="bg-white border rounded-2xl p-10 text-center">

            <div className="text-5xl">
              🏪
            </div>

            <h4 className="text-xl font-bold mt-4">
              Abhi koi shop registered nahi hai
            </h4>

            <p className="text-slate-500 mt-2">
              Jaise hi shopkeepers GaonSathi par register karenge,
              yahan automatically dikhne lagenge.
            </p>

          </div>
        )}

        {/* REAL DATABASE SHOPS */}
        {!loading && !error && filteredShops.length > 0 && (

          <div className="grid md:grid-cols-3 gap-5">

            {filteredShops.map((shop) => (

              <div
                key={shop.id}
                className="bg-white border rounded-2xl p-5 hover:shadow-lg transition"
              >

                <div className="flex items-center gap-4">

                  <div className="text-4xl bg-green-50 p-3 rounded-xl">
                    🏪
                  </div>

                  <div>

                    <h4 className="font-bold">
                      {shop.name}
                    </h4>

                    {shop.owner_name && (
                      <p className="text-sm text-slate-500">
                        Owner: {shop.owner_name}
                      </p>
                    )}

                  </div>

                </div>

                <div className="mt-5 space-y-2 text-sm">

                  {shop.village && (
                    <p className="text-slate-600">
                      📍 {shop.village}
                    </p>
                  )}

                  {shop.address && (
                    <p className="text-slate-500">
                      🏠 {shop.address}
                    </p>
                  )}

                  <p className="text-green-600 font-semibold">
                    ● Open
                  </p>

                </div>

                <button
                  onClick={() => {
                    setSearch(shop.name);
                    setShowOrder(true);
                  }}
                  className="w-full mt-4 bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700"
                >
                  Shop se Order Karein
                </button>

              </div>

            ))}

          </div>

        )}

      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white">

        <div className="max-w-6xl mx-auto px-4 py-8 text-center">

          <h3 className="text-xl font-bold">
            🌾 GaonSathi
          </h3>

          <p className="text-slate-400 text-sm mt-2">
            Local dukandaar • Local customers • Local delivery
          </p>

          <p className="text-slate-500 text-xs mt-5">
            Made for villages ❤️
          </p>

        </div>

      </footer>

      {/* ORDER POPUP */}
      {showOrder && (

        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">

          <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl">

            <div className="flex justify-between items-center">

              <h3 className="text-2xl font-bold">
                🛒 Order Request
              </h3>

              <button
                onClick={() => setShowOrder(false)}
                className="text-2xl text-slate-500"
              >
                ×
              </button>

            </div>

            <p className="text-slate-600 mt-3">
              Apni requirement likhiye. Ye request GaonSathi
              order system mein save hogi.
            </p>

            <textarea
              defaultValue={search}
              placeholder="Jaise: 5 kg atta, 2 litre milk..."
              className="w-full border rounded-xl p-4 mt-5 h-28 outline-none focus:ring-2 focus:ring-green-500"
            />

            <button
              onClick={() => {
                alert("Order request demo successfully submitted!");
                setShowOrder(false);
              }}
              className="w-full bg-green-600 text-white py-3 rounded-xl mt-4 font-bold hover:bg-green-700"
            >
              Request Send Karein
            </button>

          </div>

        </div>

      )}

    </main>
  );
}