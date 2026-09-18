"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase/client";

type Shop = {
  id: number;
  name: string;
  owner_name: string | null;
  phone: string | null;
  village: string | null;
  address: string | null;
  status: string | null;
  is_active: boolean | null;
  created_at: string;
};

export default function AdminShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadShops = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("❌ Shops load nahi ho rahi hain.");
      setLoading(false);
      return;
    }

    setShops(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadShops();
  }, []);

  const updateShopStatus = async (
    id: number,
    status: "approved" | "rejected"
  ) => {
    const { error } = await supabase
      .from("shops")
      .update({
        status,
        is_active: status === "approved",
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      setMessage("❌ Status update nahi hua.");
      return;
    }

    setMessage(
      status === "approved"
        ? "✅ Shop approve ho gayi."
        : "❌ Shop reject ho gayi."
    );

    loadShops();
  };

  const pendingShops = shops.filter(
    (shop) => shop.status === "pending" || !shop.status
  );

  const approvedShops = shops.filter(
    (shop) => shop.status === "approved"
  );

  const rejectedShops = shops.filter(
    (shop) => shop.status === "rejected"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white rounded-2xl p-6 mb-8 shadow-lg">
          <p className="text-green-100 text-sm">GaonSathi Admin</p>

          <h1 className="text-3xl font-bold mt-1">
            🏪 Shop Approval Dashboard
          </h1>

          <p className="mt-2 text-green-50">
            Registered shops ko review aur approve karein.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          <div className="bg-white rounded-2xl p-5 shadow">
            <p className="text-gray-500 text-sm">Pending Shops</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">
              {pendingShops.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow">
            <p className="text-gray-500 text-sm">Approved Shops</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {approvedShops.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow">
            <p className="text-gray-500 text-sm">Rejected Shops</p>
            <p className="text-3xl font-bold text-red-600 mt-1">
              {rejectedShops.length}
            </p>
          </div>

        </div>

        {message && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow text-center font-semibold">
            {message}
          </div>
        )}

        {/* Pending Shops */}
        <section className="bg-white rounded-2xl shadow-lg p-6">

          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Pending Shops
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Approval ka wait kar rahi shops
              </p>
            </div>

            <button
              onClick={loadShops}
              className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-500">
              Shops load ho rahi hain...
            </div>
          ) : pendingShops.length === 0 ? (
            <div className="text-center py-10 bg-green-50 rounded-xl">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-semibold text-green-700">
                Koi pending shop nahi hai.
              </p>
            </div>
          ) : (
            <div className="space-y-4">

              {pendingShops.map((shop) => (
                <div
                  key={shop.id}
                  className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        🏪 {shop.name}
                      </h3>

                      <div className="mt-3 space-y-1 text-gray-600 text-sm">
                        <p>
                          <strong>Owner:</strong>{" "}
                          {shop.owner_name || "Not provided"}
                        </p>

                        <p>
                          <strong>Mobile:</strong>{" "}
                          {shop.phone || "Not provided"}
                        </p>

                        <p>
                          <strong>Village:</strong>{" "}
                          {shop.village || "Not provided"}
                        </p>

                        <p>
                          <strong>Address:</strong>{" "}
                          {shop.address || "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">

                      <button
                        onClick={() =>
                          updateShopStatus(shop.id, "approved")
                        }
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-3 rounded-xl"
                      >
                        ✅ Approve
                      </button>

                      <button
                        onClick={() =>
                          updateShopStatus(shop.id, "rejected")
                        }
                        className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-5 py-3 rounded-xl"
                      >
                        ❌ Reject
                      </button>

                    </div>

                  </div>
                </div>
              ))}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}