"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "./utils/supabase/client";

type Shop = {
  id: string;
  name: string;
  owner_name?: string | null;
  phone?: string | null;
  village?: string | null;
  address?: string | null;
  is_active?: boolean | null;
};

const categories = [
  { name: "Kirana", icon: "🛒" },
  { name: "Dairy", icon: "🥛" },
  { name: "Medical", icon: "💊" },
  { name: "Sabzi", icon: "🥦" },
  { name: "Hardware", icon: "🔧" },
  { name: "Stationery", icon: "📚" },
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [orderText, setOrderText] = useState("");

  // Load active shops
  useEffect(() => {
    loadShops();
  }, []);

  async function loadShops() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("shops")
        .select(
          "id,name,owner_name,phone,village,address,is_active"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error(error);
        setError("Dukaan load nahi ho paayi.");
        return;
      }

      setShops(data || []);
    } catch (err) {
      console.error(err);
      setError("Kuch problem aa gayi.");
    } finally {
      setLoading(false);
    }
  }

  const filteredShops = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return shops;

    return shops.filter((shop) => {
      const text = [
        shop.name,
        shop.owner_name,
        shop.village,
        shop.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [search, shops]);

  function openOrder(shop: Shop) {
    setSelectedShop(shop);
    setOrderText("");
    setShowOrder(true);
  }

  function submitOrder() {
    if (!orderText.trim()) {
      alert("Pehle saman ka naam likhiye.");
      return;
    }

    alert(
      `Order request ${selectedShop?.name || "shop"} ke liye note ho gayi.\n\nSaman: ${orderText}`
    );

    setShowOrder(false);
    setOrderText("");
  }

  function scrollToSection(id: string) {
    setMenuOpen(false);

    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-lg">
              🌾
            </div>

            <div className="text-left leading-tight">
              <div className="text-base font-extrabold text-green-700">
                GaonSathi
              </div>
              <div className="text-[10px] text-slate-500">
                Aapke gaon ka bazaar
              </div>
            </div>
          </button>

          {/* Desktop menu */}
          <nav className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => scrollToSection("shops")}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-green-50 hover:text-green-700"
            >
              Dukaan
            </button>

            <a
              href="/customer"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-green-50 hover:text-green-700"
            >
              Customer
            </a>

            <a
              href="/shop/login"
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Shop Login
            </a>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl sm:hidden"
            aria-label="Menu"
          >
            ☰
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 sm:hidden">
            <div className="space-y-2">
              <button
                onClick={() => scrollToSection("shops")}
                className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-left text-sm font-semibold"
              >
                🏪 Nearby Dukaan
              </button>

              <a
                href="/customer"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold"
              >
                👤 Customer
              </a>

              <a
                href="/shop/login"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"
              >
                🔐 Shop Login
              </a>

              <a
                href="/shop/register"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white"
              >
                🏪 Apni Dukaan Register Karein
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ================= HERO ================= */}
      <section className="px-4 pt-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-gradient-to-br from-green-700 to-emerald-600 px-5 py-7 text-white shadow-sm sm:px-8 sm:py-10">
            <p className="mb-2 text-sm font-medium text-green-100">
              🌾 Aapke gaon ka digital bazaar
            </p>

            <h1 className="max-w-xl text-2xl font-extrabold leading-tight sm:text-4xl">
              Bazaar jaane ki zarurat nahi.
              <br />
              Samaan ghar par mangao.
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-6 text-green-50 sm:text-base">
              Apne aas-paas ki local dukaan khojiye aur saman ke liye request
              bhejiye.
            </p>

            {/* Search */}
            <div
              id="search"
              className="mt-6 flex rounded-2xl bg-white p-1.5 shadow-lg"
            >
              <span className="flex w-10 items-center justify-center text-lg">
                🔍
              </span>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Dukaan ya gaon search karein..."
                className="min-w-0 flex-1 bg-transparent px-1 text-sm text-slate-800 outline-none"
              />

              <button
                onClick={() => scrollToSection("shops")}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white"
              >
                Khojo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="px-4 pt-7">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Popular Categories</h2>
            <span className="text-xs text-slate-500">Local shops</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => {
                  setSearch(category.name);
                  scrollToSection("shops");
                }}
                className="rounded-2xl border border-slate-200 bg-white px-2 py-4 shadow-sm transition active:scale-95"
              >
                <div className="text-2xl">{category.icon}</div>

                <div className="mt-1 text-xs font-semibold text-slate-700">
                  {category.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="px-4 pt-7">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-lg font-bold">Kaise kaam karta hai?</h2>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-2xl">🔍</div>
              <h3 className="font-bold">1. Dukaan Khojo</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Apne aas-paas ki dukaan search karein.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-2xl">📝</div>
              <h3 className="font-bold">2. Saman Batao</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Jo saman chahiye uski request bhejein.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-2xl">🏠</div>
              <h3 className="font-bold">3. Ghar Tak</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Local dukaan se saman lene ki suvidha.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SHOPS ================= */}
      <section id="shops" className="scroll-mt-20 px-4 pt-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold">Aas-paas ki Dukaan</h2>

              <p className="mt-1 text-xs text-slate-500">
                {search
                  ? `"${search}" ke liye result`
                  : "Gaon ki available local shops"}
              </p>
            </div>

            {!loading && (
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                {filteredShops.length} Shops
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
              <div className="text-2xl">⚠️</div>

              <p className="mt-2 text-sm font-semibold text-red-700">
                {error}
              </p>

              <button
                onClick={loadShops}
                className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"
              >
                Dobara Try Karein
              </button>
            </div>
          )}

          {/* No shops */}
          {!loading && !error && filteredShops.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center">
              <div className="text-4xl">🏪</div>

              <h3 className="mt-3 font-bold">
                {search
                  ? "Koi matching dukaan nahi mili"
                  : "Abhi koi dukaan available nahi hai"}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {search
                  ? "Search ko badal kar dobara try karein."
                  : "Jald hi local shops yahan dikhenगी."}
              </p>

              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-4 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white"
                >
                  Search Clear Karein
                </button>
              )}
            </div>
          )}

          {/* Shop list */}
          {!loading && !error && filteredShops.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredShops.map((shop) => (
                <div
                  key={shop.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl">
                          🏪
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-slate-900">
                            {shop.name}
                          </h3>

                          {shop.owner_name && (
                            <p className="truncate text-xs text-slate-500">
                              {shop.owner_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-slate-500">
                        {shop.village && (
                          <p>📍 {shop.village}</p>
                        )}

                        {shop.address && (
                          <p className="line-clamp-2">
                            🏠 {shop.address}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700">
                      ● Active
                    </span>
                  </div>

                  <button
                    onClick={() => openOrder(shop)}
                    className="mt-4 w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white active:bg-green-700"
                  >
                    🛒 Saman Mangayein
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= SHOPKEEPER CTA ================= */}
      <section className="px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-slate-900 p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="text-3xl">🏪</div>

              <div className="flex-1">
                <h2 className="font-bold">Aap dukandaar hain?</h2>

                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Apni local dukaan ko GaonSathi par register karein.
                </p>

                <a
                  href="/shop/register"
                  className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900"
                >
                  Dukaan Register Karein →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200 bg-white px-4 py-6">
        <div className="mx-auto max-w-5xl text-center">
          <div className="font-bold text-green-700">🌾 GaonSathi</div>

          <p className="mt-1 text-xs text-slate-500">
            Gaon ke logon ko local dukaano se jodne ka simple platform.
          </p>

          <p className="mt-3 text-[10px] text-slate-400">
            © {new Date().getFullYear()} GaonSathi
          </p>
        </div>
      </footer>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          <button
            onClick={() =>
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-green-700"
          >
            <span className="text-lg">🏠</span>
            Home
          </button>

          <button
            onClick={() => scrollToSection("search")}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-slate-600"
          >
            <span className="text-lg">🔍</span>
            Search
          </button>

          <button
            onClick={() => scrollToSection("shops")}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-slate-600"
          >
            <span className="text-lg">🏪</span>
            Dukaan
          </button>

          <a
            href="/customer"
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-slate-600"
          >
            <span className="text-lg">👤</span>
            Customer
          </a>
        </div>
      </div>

      {/* ================= ORDER MODAL ================= */}
      {showOrder && selectedShop && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  Saman Mangayein
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Dukaan:{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedShop.name}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setShowOrder(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg"
              >
                ×
              </button>
            </div>

            <label className="text-xs font-bold text-slate-700">
              Kya saman chahiye?
            </label>

            <textarea
              value={orderText}
              onChange={(e) => setOrderText(e.target.value)}
              placeholder="Jaise: 2 kg chawal, 1 litre tel, 1 kg chini..."
              rows={5}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-green-500"
            />

            <button
              onClick={submitOrder}
              className="mt-3 w-full rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white"
            >
              Request Bhejein
            </button>

            <p className="mt-3 text-center text-[10px] text-slate-400">
              Abhi order request demo mode mein hai.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}