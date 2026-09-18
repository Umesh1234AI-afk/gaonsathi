"use client";

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase/client";

type Shop = {
  id: number;
  name: string;
  owner_name: string | null;
  village: string | null;
  address: string | null;
  payment_method: string | null;
  upi_id: string | null;
  home_delivery: boolean;
  delivery_time: string | null;
  delivery_fee: number | null;
  pickup_available: boolean;
};

type CustomerRequest = {
  id: number;
  requirement: string;
  status: string;
  created_at: string;
  shop_id: number;
};

export default function CustomerPage() {
  const [need, setNeed] = useState("");
  const [sendingShopId, setSendingShopId] = useState<number | null>(null);

  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);

  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [confirmingOrderId, setConfirmingOrderId] = useState<number | null>(
    null
  );

  const [orderMessage, setOrderMessage] = useState("");

  // --------------------------------
  // LOAD APPROVED SHOPS
  // --------------------------------
  const loadShops = async () => {
    setLoadingShops(true);

    const { data, error } = await supabase
      .from("shops")
      .select(`
        id,
        name,
        owner_name,
        village,
        address,
        payment_method,
        upi_id,
        home_delivery,
        delivery_time,
        delivery_fee,
        pickup_available
      `)
      .eq("status", "approved")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Shops Error:", error);
      setLoadingShops(false);
      return;
    }

    setShops(data || []);
    setLoadingShops(false);
  };

  // --------------------------------
  // LOAD CUSTOMER REQUESTS
  // --------------------------------
  const loadRequests = async () => {
    setLoadingRequests(true);

    try {
      const savedIds = localStorage.getItem("gaonsathi_request_ids");

      if (!savedIds) {
        setRequests([]);
        setLoadingRequests(false);
        return;
      }

      const requestIds: number[] = JSON.parse(savedIds);

      if (!requestIds.length) {
        setRequests([]);
        setLoadingRequests(false);
        return;
      }

      const { data, error } = await supabase
        .from("customer_requests")
        .select("id, requirement, status, created_at, shop_id")
        .in("id", requestIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Request Load Error:", error);
        setLoadingRequests(false);
        return;
      }

      setRequests(data || []);
    } catch (error) {
      console.error("Request loading error:", error);
    }

    setLoadingRequests(false);
  };

  // --------------------------------
  // INITIAL LOAD
  // --------------------------------
  useEffect(() => {
    loadShops();
    loadRequests();

    const interval = setInterval(() => {
      loadRequests();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // --------------------------------
  // SEND REQUEST TO SHOP
  // --------------------------------
  const sendRequestToShop = async (shop: Shop) => {
    if (!need.trim()) {
      alert("⚠️ Pehle batayein ki aapko kya chahiye.");
      return;
    }

    setSendingShopId(shop.id);

    try {
      const { data, error } = await supabase
        .from("customer_requests")
        .insert([
          {
            requirement: need.trim(),
            shop_id: shop.id,
            status: "pending",
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Request Error:", error);

        alert(
          `❌ Request send nahi hui.\n\n${error.message}`
        );

        setSendingShopId(null);
        return;
      }

      const existingIdsString = localStorage.getItem(
        "gaonsathi_request_ids"
      );

      let existingIds: number[] = [];

      if (existingIdsString) {
        try {
          existingIds = JSON.parse(existingIdsString);
        } catch {
          existingIds = [];
        }
      }

      const updatedIds = [
        data.id,
        ...existingIds.filter((id) => id !== data.id),
      ].slice(0, 20);

      localStorage.setItem(
        "gaonsathi_request_ids",
        JSON.stringify(updatedIds)
      );

      alert(
        `✅ Request successfully bhej di gayi!\n\nShop: ${shop.name}\nRequest ID: ${data.id}`
      );

      setNeed("");

      await loadRequests();
    } catch (error) {
      console.error("Unexpected Error:", error);
      alert("❌ Kuch problem aa gayi.");
    }

    setSendingShopId(null);
  };

  // --------------------------------
  // CONFIRM ORDER
  // --------------------------------
  const confirmOrder = async (request: CustomerRequest) => {
    const confirm = window.confirm(
      `Kya aap is request ka order confirm karna chahte hain?\n\n${request.requirement}`
    );

    if (!confirm) return;

    setConfirmingOrderId(request.id);
    setOrderMessage("");

    const { error } = await supabase
      .from("customer_requests")
      .update({
        status: "order_confirmed",
      })
      .eq("id", request.id);

    if (error) {
      console.error("Confirm Order Error:", error);

      setOrderMessage(
        `❌ Order confirm nahi hua: ${error.message}`
      );

      setConfirmingOrderId(null);
      return;
    }

    setRequests((prev) =>
      prev.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: "order_confirmed",
            }
          : item
      )
    );

    setOrderMessage(
      "✅ Order confirm ho gaya! Shopkeeper ko order confirmation mil gaya."
    );

    setConfirmingOrderId(null);
  };

  // --------------------------------
  // GET SHOP NAME
  // --------------------------------
  const getShopName = (shopId: number) => {
    const shop = shops.find((item) => item.id === shopId);

    return shop?.name || "Selected Shop";
  };

  // --------------------------------
  // GET SHOP DETAILS FOR REQUEST
  // --------------------------------
  const getShopDetails = (shopId: number) => {
    return shops.find((item) => item.id === shopId);
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">

        {/* HEADER */}
        <div className="rounded-3xl bg-white p-6 shadow-lg">

          <h1 className="text-3xl font-bold text-gray-900">
            🛒 GaonSathi
          </h1>

          <p className="mt-2 text-gray-600">
            Ghar baithe nearby shop se apna samaan mangwayein.
          </p>

          {/* -------------------------------- */}
          {/* CUSTOMER REQUESTS */}
          {/* -------------------------------- */}
          <div className="mt-8 rounded-2xl bg-gray-50 p-5">

            <div className="flex items-center justify-between gap-3">

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  📋 Meri Requests
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Shopkeeper ke response yahan dikhenge.
                </p>
              </div>

              <button
                onClick={loadRequests}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                🔄 Refresh
              </button>

            </div>

            {loadingRequests && (
              <div className="mt-4 rounded-xl bg-white p-5 text-center text-gray-500">
                ⏳ Status check ho raha hai...
              </div>
            )}

            {!loadingRequests && requests.length === 0 && (
              <div className="mt-4 rounded-xl bg-white p-5 text-center text-gray-500">
                Abhi koi request nahi hai.
              </div>
            )}

            {!loadingRequests && requests.length > 0 && (
              <div className="mt-4 space-y-4">

                {requests.map((request) => {
                  const requestShop = getShopDetails(request.shop_id);

                  return (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >

                      {/* REQUEST HEADER */}
                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <p className="text-xs text-gray-500">
                            Request #{request.id}
                          </p>

                          <h3 className="mt-1 font-bold text-gray-900">
                            🛒 {request.requirement}
                          </h3>

                          <p className="mt-2 text-sm text-gray-500">
                            🏪 {getShopName(request.shop_id)}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            🕒{" "}
                            {new Date(
                              request.created_at
                            ).toLocaleString("en-IN")}
                          </p>

                        </div>

                        <span
                          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
                            request.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : request.status === "available"
                              ? "bg-green-100 text-green-700"
                              : request.status === "not_available"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {request.status === "pending"
                            ? "⏳ Pending"
                            : request.status === "available"
                            ? "🟢 Available"
                            : request.status === "not_available"
                            ? "🔴 Not Available"
                            : "🔵 Order Confirmed"}
                        </span>

                      </div>

                      {/* PENDING */}
                      {request.status === "pending" && (
                        <div className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-700">
                          ⏳ Shopkeeper aapki requirement check kar raha hai...
                        </div>
                      )}

                      {/* AVAILABLE */}
                      {request.status === "available" && (
                        <div className="mt-4">

                          <div className="rounded-xl bg-green-50 p-4 text-green-700">

                            <p className="font-bold">
                              🟢 Samaan Available Hai!
                            </p>

                            <p className="mt-1 text-sm">
                              Shopkeeper ne confirm kiya hai ki
                              aapka samaan available hai.
                            </p>

                          </div>

                          {/* SHOP PAYMENT / DELIVERY INFO */}
                          {requestShop && (
                            <div className="mt-3 rounded-xl bg-gray-50 p-4">

                              <p className="font-bold text-gray-800">
                                🏪 Shop Information
                              </p>

                              {requestShop.address && (
                                <p className="mt-2 text-sm text-gray-600">
                                  📍 {requestShop.address}
                                </p>
                              )}

                              <p className="mt-2 text-sm text-gray-600">
                                💳 Payment:{" "}
                                {requestShop.payment_method || "Cash"}
                              </p>

                              {requestShop.payment_method !== "Cash" &&
                                requestShop.upi_id && (
                                  <p className="mt-1 text-sm text-gray-600">
                                    📱 UPI: {requestShop.upi_id}
                                  </p>
                                )}

                              <p className="mt-1 text-sm text-gray-600">
                                📦 Store Pickup:{" "}
                                {requestShop.pickup_available
                                  ? "Available"
                                  : "Not Available"}
                              </p>

                              <p className="mt-1 text-sm text-gray-600">
                                🚚 Home Delivery:{" "}
                                {requestShop.home_delivery
                                  ? "Available"
                                  : "Not Available"}
                              </p>

                              {requestShop.home_delivery && (
                                <>
                                  <p className="mt-1 text-sm text-gray-600">
                                    ⏱️ Delivery Time:{" "}
                                    {requestShop.delivery_time ||
                                      "Shopkeeper se confirm karein"}
                                  </p>

                                  <p className="mt-1 text-sm text-gray-600">
                                    💰 Delivery Fee: ₹
                                    {requestShop.delivery_fee || 0}
                                  </p>
                                </>
                              )}

                            </div>
                          )}

                          <button
                            onClick={() => confirmOrder(request)}
                            disabled={
                              confirmingOrderId === request.id
                            }
                            className="mt-3 w-full rounded-xl bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            {confirmingOrderId === request.id
                              ? "⏳ Order confirm ho raha hai..."
                              : "✅ Confirm Order"}
                          </button>

                        </div>
                      )}

                      {/* NOT AVAILABLE */}
                      {request.status === "not_available" && (
                        <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">

                          <p className="font-bold">
                            🔴 Samaan Available Nahi Hai
                          </p>

                          <p className="mt-1 text-sm">
                            Is shopkeeper ke paas aapki requested
                            requirement available nahi hai.
                          </p>

                        </div>
                      )}

                      {/* ORDER CONFIRMED */}
                      {request.status === "order_confirmed" && (
                        <div className="mt-4">

                          <div className="rounded-xl bg-blue-50 p-4 text-blue-700">

                            <p className="font-bold">
                              ✅ Order Confirmed
                            </p>

                            <p className="mt-1 text-sm">
                              Aapka order shopkeeper ko confirm ho gaya hai.
                            </p>

                            {requestShop && (
                              <div className="mt-3 border-t border-blue-200 pt-3">

                                {requestShop.address && (
                                  <p className="text-sm">
                                    📍 Shop Address:{" "}
                                    {requestShop.address}
                                  </p>
                                )}

                                <p className="mt-1 text-sm">
                                  💳 Payment:{" "}
                                  {requestShop.payment_method || "Cash"}
                                </p>

                                {requestShop.payment_method !== "Cash" &&
                                  requestShop.upi_id && (
                                    <p className="mt-1 text-sm">
                                      📱 UPI: {requestShop.upi_id}
                                    </p>
                                  )}

                                <p className="mt-1 text-sm">
                                  📦 Pickup:{" "}
                                  {requestShop.pickup_available
                                    ? "Available"
                                    : "Not Available"}
                                </p>

                                <p className="mt-1 text-sm">
                                  🚚 Home Delivery:{" "}
                                  {requestShop.home_delivery
                                    ? "Available"
                                    : "Not Available"}
                                </p>

                                {requestShop.home_delivery && (
                                  <>
                                    <p className="mt-1 text-sm">
                                      ⏱️ Delivery:{" "}
                                      {requestShop.delivery_time ||
                                        "Shopkeeper se confirm karein"}
                                    </p>

                                    <p className="mt-1 text-sm">
                                      💰 Delivery Fee: ₹
                                      {requestShop.delivery_fee || 0}
                                    </p>
                                  </>
                                )}

                              </div>
                            )}

                            <p className="mt-3 text-sm font-semibold">
                              📦 Next: Pickup / Home Delivery
                            </p>

                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}

              </div>
            )}

          </div>

          {/* ORDER MESSAGE */}
          {orderMessage && (
            <div className="mt-5 rounded-xl bg-white p-4 text-center font-semibold shadow-sm">
              {orderMessage}
            </div>
          )}

          {/* -------------------------------- */}
          {/* REQUIREMENT */}
          {/* -------------------------------- */}
          <div className="mt-8">

            <label className="mb-2 block font-semibold text-gray-800">
              Aapko kya chahiye?
            </label>

            <textarea
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              placeholder="Example: 2 kg atta, 1 litre oil, Maggi aur biscuit"
              className="h-32 w-full rounded-2xl border border-gray-300 p-4 outline-none focus:border-black"
            />

            <p className="mt-2 text-sm text-gray-500">
              💡 Ek saath jitne samaan chahiye, sab likh sakte hain.
            </p>

          </div>

          {/* -------------------------------- */}
          {/* AVAILABLE SHOPS */}
          {/* -------------------------------- */}
          <div className="mt-8">

            <div className="flex items-center justify-between">

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  🏪 Available Shops
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Aapki requirement kis shop ko bhejni hai?
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold">
                {shops.length} Shops
              </span>

            </div>

            {/* LOADING */}
            {loadingShops && (
              <div className="mt-5 rounded-2xl bg-gray-100 p-6 text-center">
                ⏳ Shops load ho rahi hain...
              </div>
            )}

            {/* NO SHOPS */}
            {!loadingShops && shops.length === 0 && (
              <div className="mt-5 rounded-2xl bg-gray-100 p-6 text-center text-gray-600">
                Abhi koi approved shop available nahi hai.
              </div>
            )}

            {/* SHOPS */}
            {!loadingShops && shops.length > 0 && (
              <div className="mt-5 space-y-4">

                {shops.map((shop) => (
                  <div
                    key={shop.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >

                    {/* SHOP HEADER */}
                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <h3 className="text-lg font-bold text-gray-900">
                          🏪 {shop.name}
                        </h3>

                        <p className="mt-2 text-gray-600">
                          👤 {shop.owner_name || "Shopkeeper"}
                        </p>

                        <p className="text-gray-600">
                          📍 {shop.village || "Village not available"}
                        </p>

                        {shop.address && (
                          <p className="mt-1 text-sm text-gray-500">
                            🏠 {shop.address}
                          </p>
                        )}

                      </div>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        ● Active
                      </span>

                    </div>

                    {/* PAYMENT & DELIVERY INFO */}
                    <div className="mt-4 rounded-xl bg-gray-50 p-4">

                      <p className="font-semibold text-gray-800">
                        ℹ️ Shop Information
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        💳 Payment:{" "}
                        {shop.payment_method || "Cash"}
                      </p>

                      {shop.payment_method !== "Cash" &&
                        shop.upi_id && (
                          <p className="mt-1 text-sm text-gray-600">
                            📱 UPI: {shop.upi_id}
                          </p>
                        )}

                      <p className="mt-1 text-sm text-gray-600">
                        📦 Store Pickup:{" "}
                        {shop.pickup_available
                          ? "Available"
                          : "Not Available"}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        🚚 Home Delivery:{" "}
                        {shop.home_delivery
                          ? "Available"
                          : "Not Available"}
                      </p>

                      {shop.home_delivery && (
                        <>
                          <p className="mt-1 text-sm text-gray-600">
                            ⏱️ Delivery Time:{" "}
                            {shop.delivery_time ||
                              "Shopkeeper se confirm karein"}
                          </p>

                          <p className="mt-1 text-sm text-gray-600">
                            💰 Delivery Fee: ₹
                            {shop.delivery_fee || 0}
                          </p>
                        </>
                      )}

                    </div>

                    {/* REQUEST BUTTON */}
                    <button
                      onClick={() => sendRequestToShop(shop)}
                      disabled={sendingShopId !== null}
                      className="mt-5 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingShopId === shop.id
                        ? "⏳ Request bheji ja rahi hai..."
                        : "🛒 Is Shop Ko Request Bhejein"}
                    </button>

                  </div>
                ))}

              </div>
            )}

          </div>

          {/* -------------------------------- */}
          {/* HOW IT WORKS */}
          {/* -------------------------------- */}
          <div className="mt-8 rounded-2xl bg-gray-100 p-5">

            <h2 className="font-bold text-gray-900">
              Kaise kaam karega?
            </h2>

            <div className="mt-4 space-y-3 text-gray-700">

              <p>1️⃣ Apni zarurat likhiye</p>

              <p>2️⃣ Nearby shop select kijiye</p>

              <p>3️⃣ Shopkeeper ko request milegi</p>

              <p>4️⃣ Shopkeeper availability batayega</p>

              <p>5️⃣ Available hone par Order Confirm kijiye</p>

              <p>6️⃣ Pickup ya home delivery</p>

            </div>

          </div>

        </div>
      </div>
    </main>
  );
}