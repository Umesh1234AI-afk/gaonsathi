"use client";

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase/client";

type DeliveryBoy = {
  id: number;
  shop_id: number;
  name: string;
  phone: string | null;
  is_active: boolean;
};

type Order = {
  id: string | number;
  requirement: string;
  status: string;
  created_at: string;
  shop_id: number;
  order_amount: number | null;
  payment_method: string | null;
  payment_status: string | null;
  delivery_boy_id: number | null;
  delivery_boy_name: string | null;
  delivery_boy_phone: string | null;
  delivery_status: string | null;
  delivery_assigned_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  cash_amount: number | null;
  cash_status: string | null;
  cash_received_at: string | null;
  cash_received_by: string | null;
  cash_handed_to_shop: boolean | null;
  cash_handed_to_shop_at?: string | null;
};

type Shop = {
  id: number;
  name: string;
  phone: string | null;
  village: string | null;
  address: string | null;
};

export default function DeliveryPage() {
  const [boys, setBoys] = useState<DeliveryBoy[]>([]);
  const [selectedBoy, setSelectedBoy] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Record<string, Shop>>({});
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [message, setMessage] = useState("");

  async function loadDeliveryBoys() {
    const { data, error } = await supabase
      .from("delivery_boys")
      .select("id, shop_id, name, phone, is_active")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("DELIVERY BOYS ERROR:", error);
      setMessage("Delivery boys load nahi ho rahe.");
      setLoading(false);
      return;
    }

    setBoys(data || []);

    const saved = localStorage.getItem("gaonsathi_delivery_boy_id");

    if (saved && data?.some((b) => String(b.id) === saved)) {
      setSelectedBoy(Number(saved));
    } else if (data && data.length > 0) {
      setSelectedBoy(data[0].id);
      localStorage.setItem(
        "gaonsathi_delivery_boy_id",
        String(data[0].id)
      );
    }

    setLoading(false);
  }

  async function loadOrders(boyId: number) {
    setLoadingOrders(true);

    const { data, error } = await supabase
      .from("customer_requests")
      .select(`
        id,
        requirement,
        status,
        created_at,
        shop_id,
        order_amount,
        payment_method,
        payment_status,
        delivery_boy_id,
        delivery_boy_name,
        delivery_boy_phone,
        delivery_status,
        delivery_assigned_at,
        out_for_delivery_at,
        delivered_at,
        cash_amount,
        cash_status,
        cash_received_at,
        cash_received_by,
        cash_handed_to_shop,
        cash_handed_to_shop_at
      `)
      .eq("delivery_boy_id", boyId)
      .in("status", [
        "handed_to_delivery",
        "out_for_delivery",
        "delivered",
      ])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ORDERS ERROR:", error);
      setMessage("Orders load nahi ho rahe.");
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setOrders((data || []) as Order[]);

    const shopIds = [
      ...new Set(
        (data || [])
          .map((order) => order.shop_id)
          .filter(Boolean)
      ),
    ];

    if (shopIds.length > 0) {
      const { data: shopData } = await supabase
        .from("shops")
        .select("id, name, phone, village, address")
        .in("id", shopIds);

      const map: Record<string, Shop> = {};

      (shopData || []).forEach((shop) => {
        map[String(shop.id)] = shop;
      });

      setShops(map);
    } else {
      setShops({});
    }

    setLoadingOrders(false);
  }

  useEffect(() => {
    loadDeliveryBoys();
  }, []);

  useEffect(() => {
    if (!selectedBoy) return;

    localStorage.setItem(
      "gaonsathi_delivery_boy_id",
      String(selectedBoy)
    );

    loadOrders(selectedBoy);

    const timer = setInterval(() => {
      loadOrders(selectedBoy);
    }, 15000);

    return () => clearInterval(timer);
  }, [selectedBoy]);

  async function startDelivery(order: Order) {
    setMessage("");

    const { error } = await supabase
      .from("customer_requests")
      .update({
        status: "out_for_delivery",
        delivery_status: "out_for_delivery",
        out_for_delivery_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (error) {
      console.error("START DELIVERY ERROR:", error);
      setMessage("Delivery start nahi ho payi.");
      return;
    }

    setMessage("🚚 Order Out for Delivery ho gaya.");

    if (selectedBoy) await loadOrders(selectedBoy);
  }

  async function cashReceived(order: Order) {
    const method = String(order.payment_method || "").toLowerCase();

    if (method !== "cash" && method !== "cod") {
      setMessage("Ye Cash/COD order nahi hai.");
      return;
    }

    const amount = Number(
      order.cash_amount || order.order_amount || 0
    );

    if (amount <= 0) {
      setMessage("Order amount missing hai.");
      return;
    }

    const boy = boys.find((b) => b.id === selectedBoy);

    const { error } = await supabase
      .from("customer_requests")
      .update({
        cash_amount: amount,
        cash_status: "received",
        cash_received_at: new Date().toISOString(),
        cash_received_by:
          boy?.name || order.delivery_boy_name || "",
      })
      .eq("id", order.id);

    if (error) {
      console.error("CASH RECEIVED ERROR:", error);
      setMessage("Cash status save nahi hua.");
      return;
    }

    setMessage(`💵 ₹${amount.toFixed(2)} cash receive ho gaya.`);

    if (selectedBoy) await loadOrders(selectedBoy);
  }

  async function handoverCashToShop(order: Order) {
    const method = String(order.payment_method || "").toLowerCase();

    if (method !== "cash" && method !== "cod") {
      setMessage("Ye Cash/COD order nahi hai.");
      return;
    }

    if (!order.cash_received_at) {
      setMessage(
        "⚠️ Pehle customer se Cash Received confirm karein."
      );
      return;
    }

    if (order.cash_handed_to_shop) {
      setMessage("Cash already shopkeeper ko handover ho chuka hai.");
      return;
    }

    const ok = window.confirm(
      `₹${Number(
        order.cash_amount || order.order_amount || 0
      ).toFixed(2)} cash shopkeeper ko handover kar diya hai?`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("customer_requests")
      .update({
        cash_handed_to_shop: true,
        cash_handed_to_shop_at: new Date().toISOString(),
        cash_status: "handed_to_shop",
      })
      .eq("id", order.id);

    if (error) {
      console.error("CASH HANDOVER ERROR:", error);
      setMessage(
        "Cash handover status save nahi hua. Database column/policy check karein."
      );
      return;
    }

    setMessage("✅ Cash shopkeeper ko handover marked ho gaya.");

    if (selectedBoy) await loadOrders(selectedBoy);
  }

  async function deliverOrder(order: Order) {
    const method = String(order.payment_method || "").toLowerCase();
    const isCash = method === "cash" || method === "cod";

    if (isCash) {
      if (!order.cash_received_at) {
        setMessage(
          "⚠️ COD order hai. Pehle Cash Received confirm karein."
        );
        return;
      }

      if (!order.cash_handed_to_shop) {
        setMessage(
          "⚠️ Pehle cash shopkeeper ko handover karke confirm karein."
        );
        return;
      }
    }

    if (
      method === "upi" &&
      order.payment_status !== "paid"
    ) {
      setMessage(
        "⚠️ UPI payment abhi shopkeeper ne received/paid confirm nahi kiya hai."
      );
      return;
    }

    const { error } = await supabase
      .from("customer_requests")
      .update({
        status: "delivered",
        delivery_status: "delivered",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (error) {
      console.error("DELIVER ORDER ERROR:", error);
      setMessage("Order delivered mark nahi ho paya.");
      return;
    }

    setMessage("✅ Order successfully delivered.");

    if (selectedBoy) await loadOrders(selectedBoy);
  }

  function paymentText(order: Order) {
    const method = String(order.payment_method || "").toLowerCase();

    if (method === "cash" || method === "cod") {
      if (order.cash_handed_to_shop) {
        return "💰 Cash Shopkeeper Ko Mil Gaya";
      }

      if (order.cash_received_at) {
        return "💵 Cash Delivery Boy Ke Paas";
      }

      return "💵 Cash Pending";
    }

    if (method === "upi") {
      if (order.payment_status === "paid") {
        return "✅ UPI Paid";
      }

      if (order.payment_status === "customer_claimed") {
        return "🟡 Customer Paid Claim";
      }

      return "📱 UPI Pending";
    }

    return "Payment Not Selected";
  }

  function statusText(status: string) {
    switch (status) {
      case "handed_to_delivery":
        return "📦 Delivery Ke Liye Mila";
      case "out_for_delivery":
        return "🚚 Out for Delivery";
      case "delivered":
        return "✅ Delivered";
      default:
        return status;
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600 font-medium">
          Loading Delivery Panel...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-10">
      <header className="bg-green-700 text-white sticky top-0 z-50 shadow">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">
                🚚 Delivery Panel
              </h1>
              <p className="text-xs text-green-100 mt-1">
                GaonSathi Delivery Boy
              </p>
            </div>

            <button
              onClick={() =>
                selectedBoy && loadOrders(selectedBoy)
              }
              className="bg-white text-green-700 px-3 py-2 rounded-lg text-sm font-semibold"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5">
        <section className="bg-white rounded-2xl shadow-sm border p-4 mb-5">
          <label className="block text-sm font-semibold mb-2">
            Delivery Boy Select Karein
          </label>

          {boys.length === 0 ? (
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
              Abhi koi active delivery boy nahi hai.
              <br />
              Shopkeeper Dashboard se delivery boy add karein.
            </div>
          ) : (
            <select
              value={selectedBoy ?? ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedBoy(id);
                localStorage.setItem(
                  "gaonsathi_delivery_boy_id",
                  String(id)
                );
              }}
              className="w-full border rounded-xl px-4 py-3 bg-white outline-none"
            >
              {boys.map((boy) => (
                <option key={boy.id} value={boy.id}>
                  {boy.name}
                  {boy.phone ? ` - ${boy.phone}` : ""}
                </option>
              ))}
            </select>
          )}
        </section>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 mb-5 text-sm font-medium">
            {message}
          </div>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">My Deliveries</h2>
            <span className="text-sm text-slate-500">
              {orders.length} Orders
            </span>
          </div>

          {loadingOrders ? (
            <div className="bg-white rounded-2xl border p-6 text-center text-slate-500">
              Orders loading...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl border p-8 text-center">
              <div className="text-4xl mb-3">📦</div>
              <h3 className="font-semibold text-lg">
                No Delivery Orders
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Jab shopkeeper order assign karega, yahan dikhai
                dega.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const shop = shops[String(order.shop_id)];

                const amount = Number(
                  order.cash_amount ||
                    order.order_amount ||
                    0
                );

                const method = String(
                  order.payment_method || ""
                ).toLowerCase();

                const isCash =
                  method === "cash" || method === "cod";

                const canDeliver =
                  !isCash ||
                  (!!order.cash_received_at &&
                    !!order.cash_handed_to_shop);

                const upiPaid =
                  method === "upi" &&
                  order.payment_status === "paid";

                const canComplete =
                  method === "upi" ? upiPaid : canDeliver;

                return (
                  <article
                    key={String(order.id)}
                    className="bg-white border rounded-2xl shadow-sm overflow-hidden"
                  >
                    <div className="p-4 border-b">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-500">
                            Request #{String(order.id).slice(0, 8)}
                          </p>

                          <h3 className="font-bold text-lg mt-1">
                            {order.requirement}
                          </h3>
                        </div>

                        <span
                          className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap ${
                            order.status === "delivered"
                              ? "bg-green-100 text-green-700"
                              : order.status ===
                                "out_for_delivery"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {statusText(order.status)}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500 mb-1">
                          Pickup From
                        </p>

                        <p className="font-bold">
                          {shop?.name || "Shop"}
                        </p>

                        {shop?.phone && (
                          <a
                            href={`tel:${shop.phone}`}
                            className="text-green-700 text-sm block mt-1"
                          >
                            📞 {shop.phone}
                          </a>
                        )}

                        {shop?.address && (
                          <p className="text-sm text-slate-600 mt-1">
                            📍 {shop.address}
                          </p>
                        )}

                        {shop?.village && (
                          <p className="text-xs text-slate-500">
                            {shop.village}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between border rounded-xl p-3">
                        <div>
                          <p className="text-xs text-slate-500">
                            Order Amount
                          </p>
                          <p className="text-xl font-bold">
                            ₹{amount.toFixed(2)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-500">
                            Payment
                          </p>
                          <p className="text-sm font-semibold">
                            {paymentText(order)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                        <p className="text-xs text-blue-600">
                          Payment Method
                        </p>

                        <p className="font-semibold text-blue-900">
                          {method === "cash" ||
                          method === "cod"
                            ? "💵 Cash / COD"
                            : method === "upi"
                            ? "📱 UPI"
                            : "❓ Not Selected"}
                        </p>
                      </div>

                      {order.status === "handed_to_delivery" && (
                        <button
                          onClick={() => startDelivery(order)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold"
                        >
                          🚚 Start Delivery
                        </button>
                      )}

                      {order.status === "out_for_delivery" && (
                        <div className="space-y-3">
                          {isCash && !order.cash_received_at && (
                            <button
                              onClick={() => cashReceived(order)}
                              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3.5 rounded-xl font-bold"
                            >
                              💵 Cash Received ₹
                              {amount.toFixed(2)}
                            </button>
                          )}

                          {isCash && order.cash_received_at && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                              <strong>💵 Cash Received</strong>
                              <br />
                              ₹{amount.toFixed(2)} cash delivery
                              boy ke paas hai.
                            </div>
                          )}

                          {isCash &&
                            order.cash_received_at &&
                            !order.cash_handed_to_shop && (
                              <button
                                onClick={() =>
                                  handoverCashToShop(order)
                                }
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-bold"
                              >
                                🏪 Cash Shopkeeper Ko Handover
                              </button>
                            )}

                          {isCash &&
                            order.cash_handed_to_shop && (
                              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                                <strong>
                                  ✅ Cash Shopkeeper Ko Handover Ho Gaya
                                </strong>
                              </div>
                            )}

                          {method === "upi" && (
                            <div
                              className={`rounded-xl p-3 border text-sm ${
                                order.payment_status === "paid"
                                  ? "bg-green-50 border-green-200 text-green-800"
                                  : "bg-yellow-50 border-yellow-200 text-yellow-800"
                              }`}
                            >
                              {order.payment_status === "paid"
                                ? "✅ UPI payment shopkeeper ne received confirm kiya hai."
                                : order.payment_status ===
                                  "customer_claimed"
                                ? "🟡 Customer ne payment paid bataya hai. Shopkeeper confirmation pending hai."
                                : "⏳ UPI payment confirmation pending hai."}
                            </div>
                          )}

                          <button
                            onClick={() => deliverOrder(order)}
                            disabled={!canComplete}
                            className={`w-full text-white py-3.5 rounded-xl font-bold ${
                              canComplete
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-slate-300 cursor-not-allowed"
                            }`}
                          >
                            {canComplete
                              ? "✅ Mark Delivered"
                              : "🔒 Payment/Cash Complete Karein"}
                          </button>
                        </div>
                      )}

                      {order.status === "delivered" && (
                        <div className="space-y-3">
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <p className="font-bold text-green-800">
                              ✅ Order Delivered
                            </p>

                            {order.delivered_at && (
                              <p className="text-xs text-green-700 mt-1">
                                {new Date(
                                  order.delivered_at
                                ).toLocaleString("en-IN")}
                              </p>
                            )}
                          </div>

                          {isCash && (
                            <div
                              className={`rounded-xl p-4 border ${
                                order.cash_handed_to_shop
                                  ? "bg-green-50 border-green-200"
                                  : order.cash_received_at
                                  ? "bg-yellow-50 border-yellow-200"
                                  : "bg-red-50 border-red-200"
                              }`}
                            >
                              <p className="font-semibold">
                                💵 Cash Status
                              </p>

                              <p className="text-sm mt-1">
                                {order.cash_handed_to_shop
                                  ? "Cash shopkeeper ko mil gaya."
                                  : order.cash_received_at
                                  ? "Cash delivery boy ke paas hai. Shopkeeper ko handover karein."
                                  : "Cash receive nahi hua."}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 bg-white border rounded-2xl p-4">
          <h3 className="font-bold mb-3">Delivery Flow</h3>

          <div className="space-y-2 text-sm text-slate-600">
            <p>1️⃣ Shopkeeper → Delivery Boy ko order deta hai</p>
            <p>2️⃣ Delivery Boy → Start Delivery</p>
            <p>3️⃣ COD hai → Customer se Cash Received</p>
            <p>4️⃣ Cash → Shopkeeper ko Handover</p>
            <p>5️⃣ UPI → Shopkeeper payment received confirm kare</p>
            <p>6️⃣ Sab complete → Mark Delivered</p>
          </div>
        </section>
      </div>
    </main>
  );
}
