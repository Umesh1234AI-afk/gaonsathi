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

  // ------------------------------------------
  // LOAD DELIVERY BOYS
  // ------------------------------------------
  async function loadDeliveryBoys() {
    const { data, error } = await supabase
      .from("delivery_boys")
      .select("id, shop_id, name, phone, is_active")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("DELIVERY BOYS ERROR:", error);
      setMessage("Delivery boys load nahi ho rahe.");
      return;
    }

    setBoys(data || []);

    // Previously selected boy
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

  // ------------------------------------------
  // LOAD ORDERS
  // ------------------------------------------
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
        cash_handed_to_shop
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

    setOrders(data || []);

    // Load shop information
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
    }

    setLoadingOrders(false);
  }

  // ------------------------------------------
  // INITIAL
  // ------------------------------------------
  useEffect(() => {
    loadDeliveryBoys();
  }, []);

  // ------------------------------------------
  // BOY CHANGE
  // ------------------------------------------
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

  // ------------------------------------------
  // START DELIVERY
  // ------------------------------------------
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
      console.error(error);
      setMessage("Delivery start nahi ho payi.");
      return;
    }

    setMessage("🚚 Order Out for Delivery ho gaya.");

    if (selectedBoy) {
      await loadOrders(selectedBoy);
    }
  }

  // ------------------------------------------
  // CASH RECEIVED
  // ------------------------------------------
  async function cashReceived(order: Order) {
    if (
      order.payment_method !== "cash" &&
      order.payment_method !== "cod"
    ) {
      return;
    }

    const amount =
      Number(order.cash_amount || order.order_amount || 0);

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
        cash_received_by: boy?.name || order.delivery_boy_name || "",
      })
      .eq("id", order.id);

    if (error) {
      console.error(error);
      setMessage("Cash status save nahi hua.");
      return;
    }

    setMessage(`💵 ₹${amount.toFixed(2)} cash receive ho gaya.`);

    if (selectedBoy) {
      await loadOrders(selectedBoy);
    }
  }

  // ------------------------------------------
  // DELIVER ORDER
  // ------------------------------------------
  async function deliverOrder(order: Order) {
    const isCash =
      order.payment_method === "cash" ||
      order.payment_method === "cod";

    if (isCash && !order.cash_received_at) {
      setMessage(
        "⚠️ COD order hai. Pehle Cash Received confirm karein."
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
      console.error(error);
      setMessage("Order delivered mark nahi ho paya.");
      return;
    }

    setMessage("✅ Order successfully delivered.");

    if (selectedBoy) {
      await loadOrders(selectedBoy);
    }
  }

  // ------------------------------------------
  // PAYMENT TEXT
  // ------------------------------------------
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

  // ------------------------------------------
  // STATUS TEXT
  // ------------------------------------------
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

      {/* HEADER */}
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

        {/* DELIVERY BOY SELECT */}
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

        {/* MESSAGE */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 mb-5 text-sm font-medium">
            {message}
          </div>
        )}

        {/* ORDERS */}
        <section>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">
              My Deliveries
            </h2>

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
                Jab shopkeeper order assign karega,
                yahan दिखाई देगा.
              </p>
            </div>
          ) : (
            <div className="space-y-4">

              {orders.map((order) => {
                const shop = shops[String(order.shop_id)];

                const amount =
                  Number(
                    order.cash_amount ||
                    order.order_amount ||
                    0
                  );

                const isCash =
                  order.payment_method === "cash" ||
                  order.payment_method === "cod";

                return (
                  <article
                    key={String(order.id)}
                    className="bg-white border rounded-2xl shadow-sm overflow-hidden"
                  >

                    {/* ORDER TOP */}
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
                              : order.status === "out_for_delivery"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {statusText(order.status)}
                        </span>

                      </div>

                    </div>

                    {/* SHOP */}
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

                      {/* AMOUNT */}
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

                      {/* CUSTOMER PAYMENT */}
                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">

                        <p className="text-xs text-blue-600">
                          Payment Method
                        </p>

                        <p className="font-semibold text-blue-900">
                          {order.payment_method === "cash" ||
                          order.payment_method === "cod"
                            ? "💵 Cash / COD"
                            : order.payment_method === "upi"
                            ? "📱 UPI"
                            : "❓ Not Selected"}
                        </p>

                      </div>

                      {/* ACTIONS */}
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
                              <strong>
                                💵 Cash Received
                              </strong>

                              <br />

                              ₹{amount.toFixed(2)} cash
                              delivery boy ke paas hai.
                            </div>
                          )}

                          <button
                            onClick={() => deliverOrder(order)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold"
                          >
                            ✅ Mark Delivered
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

        {/* FLOW INFO */}
        <section className="mt-6 bg-white border rounded-2xl p-4">

          <h3 className="font-bold mb-3">
            Delivery Flow
          </h3>

          <div className="space-y-2 text-sm text-slate-600">
            <p>1️⃣ Shopkeeper → Delivery Boy ko order deta hai</p>
            <p>2️⃣ Delivery Boy → Start Delivery</p>
            <p>3️⃣ COD hai → Cash Received</p>
            <p>4️⃣ Customer ko order deliver</p>
            <p>5️⃣ Delivery Boy cash shopkeeper ko deta hai</p>
            <p>6️⃣ Shopkeeper → Cash Received Confirm</p>
          </div>

        </section>

      </div>
    </main>
  );
}