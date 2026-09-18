"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase/client";

type Product = {
  id: number;
  name: string;
  category: string | null;
  price: number | null;
  available: boolean;
};

type Shop = {
  id: number;
  name: string;
  owner_name: string | null;
  phone: string | null;
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

export default function ShopDashboard() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
  });

  const [settings, setSettings] = useState({
    payment_method: "Cash",
    upi_id: "",
    home_delivery: false,
    delivery_time: "",
    delivery_fee: "0",
    pickup_available: true,
  });

  // -----------------------------
  // LOAD SHOP
  // -----------------------------
  const loadShop = async () => {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("❌ Please login first.");
        setLoading(false);
        return;
      }

      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select(`
          id,
          name,
          owner_name,
          phone,
          village,
          address,
          payment_method,
          upi_id,
          home_delivery,
          delivery_time,
          delivery_fee,
          pickup_available
        `)
        .eq("owner_user_id", user.id)
        .eq("status", "approved")
        .eq("is_active", true)
        .single();

      if (shopError) {
        console.error("Shop Error:", shopError);
        setMessage(
          "❌ Approved shop nahi mili. Please admin approval check karein."
        );
        setLoading(false);
        return;
      }

      setShop(shopData);

      setSettings({
        payment_method: shopData.payment_method || "Cash",
        upi_id: shopData.upi_id || "",
        home_delivery: shopData.home_delivery ?? false,
        delivery_time: shopData.delivery_time || "",
        delivery_fee: String(shopData.delivery_fee ?? 0),
        pickup_available: shopData.pickup_available ?? true,
      });

      await Promise.all([
        loadProducts(shopData.id),
        loadRequests(shopData.id),
      ]);
    } catch (error) {
      console.error("Load Shop Error:", error);
      setMessage("❌ Dashboard load nahi ho paya.");
    }

    setLoading(false);
  };

  // -----------------------------
  // LOAD PRODUCTS
  // -----------------------------
  const loadProducts = async (shopId: number) => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, price, available")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Products Error:", error);
      return;
    }

    setProducts(data || []);
  };

  // -----------------------------
  // LOAD CUSTOMER REQUESTS
  // -----------------------------
  const loadRequests = async (shopId: number) => {
    setLoadingRequests(true);

    const { data, error } = await supabase
      .from("customer_requests")
      .select("id, requirement, status, created_at, shop_id")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Requests Error:", error);
      setLoadingRequests(false);
      return;
    }

    setRequests(data || []);
    setLoadingRequests(false);
  };

  useEffect(() => {
    loadShop();
  }, []);

  // -----------------------------
  // ADD PRODUCT
  // -----------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shop) return;

    if (!form.name.trim()) {
      alert("Please product name enter karein.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("products").insert([
      {
        shop_id: shop.id,
        name: form.name.trim(),
        category: form.category.trim() || null,
        price: form.price ? Number(form.price) : null,
        available: true,
      },
    ]);

    if (error) {
      console.error("Product Insert Error:", error);
      setMessage(`❌ Product add nahi hua: ${error.message}`);
      setSaving(false);
      return;
    }

    setForm({
      name: "",
      category: "",
      price: "",
    });

    await loadProducts(shop.id);

    setMessage("✅ Product successfully add ho gaya.");
    setSaving(false);
  };

  // -----------------------------
  // TOGGLE PRODUCT AVAILABILITY
  // -----------------------------
  const toggleAvailability = async (
    productId: number,
    currentValue: boolean
  ) => {
    const { error } = await supabase
      .from("products")
      .update({ available: !currentValue })
      .eq("id", productId);

    if (error) {
      console.error("Availability Error:", error);
      alert(`❌ Update nahi hua: ${error.message}`);
      return;
    }

    if (shop) {
      await loadProducts(shop.id);
    }
  };

  // -----------------------------
  // DELETE PRODUCT
  // -----------------------------
  const deleteProduct = async (productId: number) => {
    const confirmed = window.confirm(
      "Kya aap ye product delete karna chahte hain?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("Delete Product Error:", error);
      alert(`❌ Product delete nahi hua: ${error.message}`);
      return;
    }

    if (shop) {
      await loadProducts(shop.id);
    }

    setMessage("✅ Product delete ho gaya.");
  };

  // -----------------------------
  // UPDATE CUSTOMER REQUEST STATUS
  // -----------------------------
  const updateRequestStatus = async (
    requestId: number,
    status: string
  ) => {
    const { error } = await supabase
      .from("customer_requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      console.error("Request Status Error:", error);
      alert(`❌ Status update nahi hua: ${error.message}`);
      return;
    }

    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? { ...request, status }
          : request
      )
    );
  };

  // -----------------------------
  // SAVE SHOP SETTINGS
  // -----------------------------
  const saveSettings = async () => {
    if (!shop) return;

    setSavingSettings(true);
    setMessage("");

    const deliveryFee = Number(settings.delivery_fee);

    if (settings.home_delivery && Number.isNaN(deliveryFee)) {
      setMessage("❌ Delivery fee sahi enter karein.");
      setSavingSettings(false);
      return;
    }

    const { data, error } = await supabase
      .from("shops")
      .update({
        payment_method: settings.payment_method,
        upi_id:
          settings.payment_method === "Cash"
            ? null
            : settings.upi_id.trim() || null,
        home_delivery: settings.home_delivery,
        delivery_time: settings.home_delivery
          ? settings.delivery_time.trim() || null
          : null,
        delivery_fee: settings.home_delivery ? deliveryFee : 0,
        pickup_available: settings.pickup_available,
      })
      .eq("id", shop.id)
      .select()
      .single();

    if (error) {
      console.error("Settings Save Error:", error);
      setMessage(`❌ Settings save nahi hui: ${error.message}`);
      setSavingSettings(false);
      return;
    }

    setShop((prev) =>
      prev
        ? {
            ...prev,
            payment_method: data.payment_method,
            upi_id: data.upi_id,
            home_delivery: data.home_delivery,
            delivery_time: data.delivery_time,
            delivery_fee: data.delivery_fee,
            pickup_available: data.pickup_available,
          }
        : prev
    );

    setMessage("✅ Shop settings successfully save ho gayi.");
    setSavingSettings(false);
  };

  // -----------------------------
  // LOADING
  // -----------------------------
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 text-center shadow-lg">
          <p className="text-lg font-semibold text-gray-700">
            ⏳ Shop dashboard load ho raha hai...
          </p>
        </div>
      </main>
    );
  }

  // -----------------------------
  // NO SHOP
  // -----------------------------
  if (!shop) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900">
            🏪 GaonSathi Shop Dashboard
          </h1>

          <p className="mt-4 text-gray-600">
            {message || "Approved shop nahi mili."}
          </p>
        </div>
      </main>
    );
  }

  // -----------------------------
  // DASHBOARD UI
  // -----------------------------
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-green-600">
                ● SHOP ACTIVE
              </p>

              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                🏪 {shop.name}
              </h1>

              <p className="mt-2 text-gray-600">
                👤 {shop.owner_name || "Shopkeeper"}
              </p>

              <p className="text-gray-600">
                📍 {shop.village || "Village"}
              </p>
            </div>

            <button
              onClick={loadShop}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-100"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mt-5 rounded-2xl bg-white p-4 text-center font-semibold shadow-sm">
            {message}
          </div>
        )}

        {/* -------------------------------- */}
        {/* SHOP SETTINGS */}
        {/* -------------------------------- */}
        <section className="mt-6 rounded-3xl bg-white p-6 shadow-lg">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              ⚙️ Shop Settings
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Customer ko payment, pickup aur delivery ki information yahin se milegi.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">

            {/* PAYMENT METHOD */}
            <div>
              <label className="mb-2 block font-semibold text-gray-800">
                💳 Payment Method
              </label>

              <select
                value={settings.payment_method}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payment_method: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Both">Cash + UPI</option>
              </select>
            </div>

            {/* UPI ID */}
            <div>
              <label className="mb-2 block font-semibold text-gray-800">
                📱 UPI ID
              </label>

              <input
                type="text"
                value={settings.upi_id}
                disabled={settings.payment_method === "Cash"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    upi_id: e.target.value,
                  })
                }
                placeholder="Example: shopname@upi"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black disabled:bg-gray-100"
              />

              {settings.payment_method !== "Cash" && (
                <p className="mt-1 text-xs text-gray-500">
                  Customer ko payment ke liye ye UPI ID dikhegi.
                </p>
              )}
            </div>

            {/* HOME DELIVERY */}
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">
                    🚚 Home Delivery
                  </p>

                  <p className="text-sm text-gray-500">
                    Kya aap ghar tak samaan deliver karte hain?
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      home_delivery: !settings.home_delivery,
                    })
                  }
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    settings.home_delivery
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {settings.home_delivery ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* PICKUP */}
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">
                    📦 Store Pickup
                  </p>

                  <p className="text-sm text-gray-500">
                    Customer shop se order collect kar sakta hai?
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      pickup_available: !settings.pickup_available,
                    })
                  }
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    settings.pickup_available
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {settings.pickup_available ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* DELIVERY DETAILS */}
            {settings.home_delivery && (
              <>
                <div>
                  <label className="mb-2 block font-semibold text-gray-800">
                    ⏱️ Delivery Time
                  </label>

                  <input
                    type="text"
                    value={settings.delivery_time}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        delivery_time: e.target.value,
                      })
                    }
                    placeholder="Example: 30–60 minutes"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-semibold text-gray-800">
                    💰 Delivery Fee
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={settings.delivery_fee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        delivery_fee: e.target.value,
                      })
                    }
                    placeholder="Example: 20"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>
              </>
            )}
          </div>

          {/* SAVE SETTINGS */}
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="mt-6 w-full rounded-xl bg-black px-5 py-3 font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingSettings
              ? "⏳ Settings save ho rahi hain..."
              : "💾 Save Shop Settings"}
          </button>
        </section>

        {/* -------------------------------- */}
        {/* CUSTOMER REQUESTS */}
        {/* -------------------------------- */}
        <section className="mt-6 rounded-3xl bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                📋 Customer Requests
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Customers ki requirements yahan check karein.
              </p>
            </div>

            <button
              onClick={() => loadRequests(shop.id)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              🔄 Refresh
            </button>
          </div>

          {loadingRequests && (
            <div className="mt-5 rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
              ⏳ Requests load ho rahi hain...
            </div>
          )}

          {!loadingRequests && requests.length === 0 && (
            <div className="mt-5 rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
              Abhi koi customer request nahi hai.
            </div>
          )}

          {!loadingRequests && requests.length > 0 && (
            <div className="mt-5 space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-gray-200 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs text-gray-500">
                        Request #{request.id}
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-gray-900">
                        🛒 {request.requirement}
                      </h3>

                      <p className="mt-2 text-xs text-gray-400">
                        🕒{" "}
                        {new Date(request.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
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

                  {request.status === "pending" && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() =>
                          updateRequestStatus(request.id, "available")
                        }
                        className="rounded-xl bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700"
                      >
                        🟢 Samaan Available
                      </button>

                      <button
                        onClick={() =>
                          updateRequestStatus(request.id, "not_available")
                        }
                        className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700"
                      >
                        🔴 Not Available
                      </button>
                    </div>
                  )}

                  {request.status === "available" && (
                    <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                      🟢 Customer ko availability dikha di gayi hai.
                      <br />
                      Customer order confirm kar sakta hai.
                    </div>
                  )}

                  {request.status === "not_available" && (
                    <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                      🔴 Customer ko bata diya gaya hai ki samaan available
                      nahi hai.
                    </div>
                  )}

                  {request.status === "order_confirmed" && (
                    <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                      <p className="font-bold">
                        ✅ Customer ne Order Confirm kar diya hai.
                      </p>

                      <p className="mt-2">
                        📦 Next step:{" "}
                        {shop.pickup_available && shop.home_delivery
                          ? "Pickup / Home Delivery"
                          : shop.home_delivery
                          ? "Home Delivery"
                          : "Store Pickup"}
                      </p>

                      {shop.home_delivery && (
                        <p className="mt-1">
                          🚚 Delivery:{" "}
                          {shop.delivery_time || "Time shopkeeper se confirm hoga"}
                        </p>
                      )}

                      {shop.home_delivery && (
                        <p className="mt-1">
                          💰 Delivery Fee: ₹{shop.delivery_fee || 0}
                        </p>
                      )}

                      <p className="mt-1">
                        💳 Payment: {shop.payment_method || "Cash"}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* -------------------------------- */}
        {/* ADD PRODUCT */}
        {/* -------------------------------- */}
        <section className="mt-6 rounded-3xl bg-white p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900">
            ➕ Add Product
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Apni shop ke important products add karein.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-5 grid gap-4 md:grid-cols-3"
          >
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              placeholder="Product name"
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />

            <input
              type="text"
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value,
                })
              }
              placeholder="Category e.g. Grocery"
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />

            <input
              type="number"
              value={form.price}
              onChange={(e) =>
                setForm({
                  ...form,
                  price: e.target.value,
                })
              }
              placeholder="Price ₹"
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-black px-4 py-3 font-bold text-white hover:bg-gray-800 disabled:opacity-60 md:col-span-3"
            >
              {saving ? "⏳ Product add ho raha hai..." : "➕ Add Product"}
            </button>
          </form>
        </section>

        {/* -------------------------------- */}
        {/* PRODUCTS */}
        {/* -------------------------------- */}
        <section className="mt-6 rounded-3xl bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                📦 My Products
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Products ki availability manage karein.
              </p>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold">
              {products.length}
            </span>
          </div>

          {products.length === 0 && (
            <div className="mt-5 rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
              Abhi koi product add nahi hai.
            </div>
          )}

          {products.length > 0 && (
            <div className="mt-5 space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-bold text-gray-900">
                      🛒 {product.name}
                    </h3>

                    {product.category && (
                      <p className="text-sm text-gray-500">
                        {product.category}
                      </p>
                    )}

                    {product.price !== null && (
                      <p className="mt-1 font-semibold text-gray-800">
                        ₹{product.price}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        toggleAvailability(
                          product.id,
                          product.available
                        )
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-bold ${
                        product.available
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {product.available
                        ? "🟢 Available"
                        : "🔴 Unavailable"}
                    </button>

                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
                    >
                      🗑️ Delete
                    </button>
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