"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabase/client";

type Product = {
  id: number;
  shop_id: number;
  name: string;
  category: string | null;
  price: number;
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
  products?: Product[];
};

type CustomerRequest = {
  id: string | number;
  requirement: string;
  status: string;
  created_at: string;
  shop_id: number;

  product_id: number | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  estimated_amount: number | null;

  order_amount: number | null;
  payment_method: string | null;
  payment_status: string | null;
  payment_reference: string | null;

  customer_confirmed_at: string | null;
  shopkeeper_confirmed_at: string | null;
  paid_at: string | null;

  shop?: Shop;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  available: "Available",
  customer_confirmed: "Customer Confirmed",
  order_confirmed: "Order Confirmed",
  preparing: "Preparing",
  packed: "Packed",
  handed_to_delivery: "Delivery Boy Ko Diya",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  available: "bg-blue-100 text-blue-800",
  customer_confirmed: "bg-purple-100 text-purple-800",
  order_confirmed: "bg-green-100 text-green-800",
  preparing: "bg-orange-100 text-orange-800",
  packed: "bg-indigo-100 text-indigo-800",
  handed_to_delivery: "bg-cyan-100 text-cyan-800",
  out_for_delivery: "bg-violet-100 text-violet-800",
  delivered: "bg-green-200 text-green-900",
};

export default function CustomerPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [customRequirement, setCustomRequirement] = useState("");

  const [sendingShopId, setSendingShopId] = useState<number | null>(null);

  const [paymentRequest, setPaymentRequest] =
    useState<CustomerRequest | null>(null);

  const [paymentLoading, setPaymentLoading] = useState(false);

  // --------------------------------------------------
  // LOAD SHOPS + PRODUCTS
  // --------------------------------------------------

  async function loadShops() {
    setLoading(true);

    try {
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
        .eq("status", "approved")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(30);

      if (shopError) {
        console.error("SHOP LOAD ERROR:", shopError);
        setMessage("Dukaan load nahi ho pa rahi.");
        setLoading(false);
        return;
      }

      const shopIds = (shopData || []).map((shop) => shop.id);

      let productData: Product[] = [];

      if (shopIds.length > 0) {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            shop_id,
            name,
            category,
            price,
            available
          `)
          .in("shop_id", shopIds)
          .eq("available", true)
          .order("name", { ascending: true });

        if (error) {
          console.error("PRODUCT LOAD ERROR:", error);
        } else {
          productData = (data || []) as Product[];
        }
      }

      const finalShops: Shop[] = (shopData || []).map((shop) => ({
        ...shop,
        products: productData.filter(
          (product) => product.shop_id === shop.id
        ),
      }));

      setShops(finalShops);
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong.");
    }

    setLoading(false);
  }

  // --------------------------------------------------
  // LOAD CUSTOMER REQUESTS
  // --------------------------------------------------

  async function loadRequests() {
    setLoadingRequests(true);

    try {
      const savedIdsRaw = localStorage.getItem("gaonsathi_request_ids");

      if (!savedIdsRaw) {
        setRequests([]);
        setLoadingRequests(false);
        return;
      }

      let savedIds: (string | number)[] = [];

      try {
        savedIds = JSON.parse(savedIdsRaw);
      } catch {
        savedIds = [];
      }

      if (!savedIds.length) {
        setRequests([]);
        setLoadingRequests(false);
        return;
      }

      const { data, error } = await supabase
        .from("customer_requests")
        .select(`
          id,
          requirement,
          status,
          created_at,
          shop_id,
          product_id,
          product_name,
          quantity,
          unit_price,
          estimated_amount,
          order_amount,
          payment_method,
          payment_status,
          payment_reference,
          customer_confirmed_at,
          shopkeeper_confirmed_at,
          paid_at
        `)
        .in("id", savedIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("LOAD REQUESTS ERROR:", error);
        setLoadingRequests(false);
        return;
      }

      const requestData = (data || []) as CustomerRequest[];

      // Shop details attach karo
      const shopIds = [
        ...new Set(requestData.map((request) => request.shop_id)),
      ];

      let requestShops: Shop[] = [];

      if (shopIds.length > 0) {
        const { data: shopData } = await supabase
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
          .in("id", shopIds);

        requestShops = (shopData || []) as Shop[];
      }

      const finalRequests = requestData.map((request) => ({
        ...request,
        shop: requestShops.find(
          (shop) => shop.id === request.shop_id
        ),
      }));

      setRequests(finalRequests);
    } catch (error) {
      console.error("REQUEST ERROR:", error);
    }

    setLoadingRequests(false);
  }

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    loadShops();
    loadRequests();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadRequests();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------
  // FILTER SHOPS
  // --------------------------------------------------

  const filteredShops = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return shops;

    return shops.filter((shop) => {
      return (
        shop.name?.toLowerCase().includes(text) ||
        shop.village?.toLowerCase().includes(text) ||
        shop.address?.toLowerCase().includes(text)
      );
    });
  }, [shops, search]);

  // --------------------------------------------------
  // OPEN SHOP
  // --------------------------------------------------

  function openShop(shop: Shop) {
    setSelectedShop(shop);
    setSelectedProduct(null);
    setQuantity(1);
    setCustomRequirement("");
    setMessage("");
  }

  // --------------------------------------------------
  // SELECT PRODUCT
  // --------------------------------------------------

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    setQuantity(1);
    setCustomRequirement("");
  }

  // --------------------------------------------------
  // TOTAL
  // --------------------------------------------------

  const estimatedTotal =
    selectedProduct && quantity > 0
      ? Number(selectedProduct.price) * Number(quantity)
      : 0;

  // --------------------------------------------------
  // SEND PRODUCT REQUEST
  // --------------------------------------------------

  async function sendProductRequest() {
    if (!selectedShop) {
      setMessage("Pehle dukaan select karein.");
      return;
    }

    if (!selectedProduct) {
      setMessage("Pehle product select karein.");
      return;
    }

    if (quantity <= 0) {
      setMessage("Quantity 1 ya usse zyada honi chahiye.");
      return;
    }

    setSendingShopId(selectedShop.id);
    setMessage("");

    const requirement = `${selectedProduct.name} x ${quantity}`;

    const { data, error } = await supabase
      .from("customer_requests")
      .insert({
        requirement,
        shop_id: selectedShop.id,
        status: "pending",

        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity,
        unit_price: Number(selectedProduct.price),
        estimated_amount: estimatedTotal,

        payment_status: "not_selected",
      })
      .select("id")
      .single();

    if (error) {
      console.error("SEND REQUEST ERROR:", error);
      setMessage(error.message || "Request send nahi hui.");
      setSendingShopId(null);
      return;
    }

    if (data?.id !== undefined) {
      const oldIdsRaw = localStorage.getItem("gaonsathi_request_ids");

      let oldIds: (string | number)[] = [];

      try {
        oldIds = oldIdsRaw ? JSON.parse(oldIdsRaw) : [];
      } catch {
        oldIds = [];
      }

      const newIds = [
        data.id,
        ...oldIds.filter((id) => String(id) !== String(data.id)),
      ].slice(0, 30);

      localStorage.setItem(
        "gaonsathi_request_ids",
        JSON.stringify(newIds)
      );
    }

    setMessage(
      `${selectedProduct.name} ki request ₹${estimatedTotal.toFixed(
        2
      )} estimated amount ke saath bhej di gayi.`
    );

    setSelectedProduct(null);
    setSelectedShop(null);
    setQuantity(1);

    await loadRequests();

    setSendingShopId(null);
  }

  // --------------------------------------------------
  // CUSTOM REQUEST
  // --------------------------------------------------

  async function sendCustomRequest(shop: Shop) {
    const requirement = customRequirement.trim();

    if (!requirement) {
      setMessage("Requirement likhiye.");
      return;
    }

    setSendingShopId(shop.id);
    setMessage("");

    const { data, error } = await supabase
      .from("customer_requests")
      .insert({
        requirement,
        shop_id: shop.id,
        status: "pending",
        payment_status: "not_selected",
      })
      .select("id")
      .single();

    if (error) {
      console.error("CUSTOM REQUEST ERROR:", error);
      setMessage(error.message || "Request send nahi hui.");
      setSendingShopId(null);
      return;
    }

    if (data?.id !== undefined) {
      const oldIdsRaw = localStorage.getItem("gaonsathi_request_ids");

      let oldIds: (string | number)[] = [];

      try {
        oldIds = oldIdsRaw ? JSON.parse(oldIdsRaw) : [];
      } catch {
        oldIds = [];
      }

      const newIds = [
        data.id,
        ...oldIds.filter((id) => String(id) !== String(data.id)),
      ].slice(0, 30);

      localStorage.setItem(
        "gaonsathi_request_ids",
        JSON.stringify(newIds)
      );
    }

    setMessage("Custom request bhej di gayi.");
    setCustomRequirement("");

    await loadRequests();

    setSendingShopId(null);
  }

  // --------------------------------------------------
  // REMOVE REQUEST FROM CUSTOMER LIST
  // NOTE: Database order/request is NOT deleted.
  // It is only removed from this customer's browser list.
  // --------------------------------------------------

  function removeRequestFromMyList(requestId: string | number) {
    const ok = window.confirm(
      "Kya aap is request ko apni Customer list se hatana chahte hain? Database record delete nahi hoga."
    );

    if (!ok) return;

    const id = String(requestId);

    try {
      const raw = localStorage.getItem("gaonsathi_request_ids");
      const ids: (string | number)[] = raw ? JSON.parse(raw) : [];

      const updatedIds = ids.filter((item) => String(item) !== id);

      localStorage.setItem(
        "gaonsathi_request_ids",
        JSON.stringify(updatedIds)
      );
    } catch (error) {
      console.error("REMOVE REQUEST LOCAL STORAGE ERROR:", error);
    }

    setRequests((prev) =>
      prev.filter((item) => String(item.id) !== id)
    );

    setMessage("✅ Request Customer list se hata di gayi.");
  }

  // --------------------------------------------------
  // CUSTOMER CONFIRM ORDER
  // --------------------------------------------------

  async function confirmOrder(request: CustomerRequest) {
    const { error } = await supabase
      .from("customer_requests")
      .update({
        status: "customer_confirmed",
        customer_confirmed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (error) {
      console.error("CONFIRM ORDER ERROR:", error);
      setMessage(error.message || "Order confirm nahi hua.");
      return;
    }

    setMessage("Order shopkeeper ko confirmation ke liye bhej diya gaya.");
    await loadRequests();
  }

  // --------------------------------------------------
  // PAYMENT
  // --------------------------------------------------

  function openPayment(request: CustomerRequest) {
    setPaymentRequest(request);
  }

  async function choosePayment(
    request: CustomerRequest,
    method: "cash" | "upi"
  ) {
    setPaymentLoading(true);

    const { error } = await supabase
      .from("customer_requests")
      .update({
        payment_method: method,
        payment_status:
          method === "cash" ? "cash_pending" : "upi_pending",
      })
      .eq("id", request.id);

    if (error) {
      console.error("PAYMENT METHOD ERROR:", error);
      setMessage(error.message || "Payment method save nahi hua.");
      setPaymentLoading(false);
      return;
    }

    setPaymentRequest(null);
    await loadRequests();

    if (method === "upi") {
      const amount = Number(request.order_amount || 0);
      const upiId = request.shop?.upi_id;

      if (upiId && amount > 0) {
        const shopName = encodeURIComponent(
          request.shop?.name || "GaonSathi Shop"
        );

        const upiUrl =
          `upi://pay?pa=${encodeURIComponent(
            upiId
          )}&pn=${shopName}&am=${amount.toFixed(2)}&cu=INR`;

        window.location.href = upiUrl;
      }
    }

    setPaymentLoading(false);
  }

  async function markUpiPaid(request: CustomerRequest) {
    setPaymentLoading(true);

    const { error } = await supabase
      .from("customer_requests")
      .update({
        payment_status: "customer_claimed",
        payment_reference: `UPI-${Date.now()}`,
      })
      .eq("id", request.id);

    if (error) {
      console.error("UPI PAID ERROR:", error);
      setMessage(error.message || "Payment update nahi hua.");
      setPaymentLoading(false);
      return;
    }

    setMessage(
      "Payment claim shopkeeper ko bhej diya gaya. Verification ke baad paid mark hoga."
    );

    await loadRequests();

    setPaymentLoading(false);
  }

  // --------------------------------------------------
  // PAYMENT STATUS
  // --------------------------------------------------

  function paymentText(request: CustomerRequest) {
    switch (request.payment_status) {
      case "cash_pending":
        return "Cash payment delivery/pickup par dena hai";

      case "upi_pending":
        return "UPI payment pending";

      case "customer_claimed":
        return "UPI payment customer ne paid bataya hai";

      case "paid":
        return "Payment Received";

      default:
        return "Payment Not Selected";
    }
  }

  // --------------------------------------------------
  // STATUS
  // --------------------------------------------------

  function getStatusLabel(status: string) {
    return STATUS_LABELS[status] || status;
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-green-700">
              GaonSathi
            </h1>

            <p className="text-xs text-gray-500">
              Customer Panel
            </p>
          </div>

          <a
            href="/"
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium"
          >
            Home
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* MESSAGE */}

        {message && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {message}
          </div>
        )}

        {/* SEARCH */}

        <section className="mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dukaan ya village search karein..."
            className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-green-500"
          />
        </section>

        {/* MY REQUESTS */}

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              Meri Requests
            </h2>

            <button
              onClick={loadRequests}
              className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm"
            >
              Refresh
            </button>
          </div>

          {loadingRequests ? (
            <div className="rounded-xl bg-white p-5 text-sm text-gray-500">
              Requests load ho rahi hain...
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl bg-white p-5 text-sm text-gray-500">
              Abhi koi request nahi hai.
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const shop = request.shop;

                return (
                  <div
                    key={String(request.id)}
                    className="rounded-2xl border bg-white p-4 shadow-sm"
                  >
                    {/* REQUEST HEADER */}

                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">
                          {request.product_name ||
                            request.requirement}
                        </h3>

                        <p className="text-xs text-gray-500">
                          Request #
                          {String(request.id).slice(0, 8)}
                        </p>

                        {shop && (
                          <p className="mt-1 text-sm text-green-700">
                            🏪 {shop.name}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            STATUS_COLORS[request.status] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {getStatusLabel(request.status)}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeRequestFromMyList(request.id)
                          }
                          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600"
                        >
                          🗑️ Hatao
                        </button>
                      </div>
                    </div>

                    {/* PRODUCT PRICE */}

                    {request.product_name && (
                      <div className="mb-3 rounded-xl bg-gray-50 p-3">
                        <div className="flex justify-between">
                          <span className="text-sm">
                            {request.product_name}
                          </span>

                          <span className="font-semibold">
                            ₹
                            {Number(
                              request.unit_price || 0
                            ).toFixed(2)}
                          </span>
                        </div>

                        <div className="mt-1 flex justify-between text-sm text-gray-600">
                          <span>
                            Quantity:{" "}
                            {request.quantity || 1}
                          </span>

                          <span>
                            Estimated: ₹
                            {Number(
                              request.estimated_amount || 0
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* FINAL AMOUNT */}

                    {request.status !== "pending" &&
                      request.status !== "available" &&
                      request.order_amount !== null && (
                        <div className="mb-3 rounded-xl bg-green-50 p-3">
                          <div className="flex justify-between">
                            <span className="font-medium">
                              Final Order Amount
                            </span>

                            <span className="text-lg font-bold text-green-700">
                              ₹
                              {Number(
                                request.order_amount
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                    {/* SHOPKEEPER AVAILABLE */}

                    {request.status === "available" && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                        <p className="mb-3 text-sm text-blue-800">
                          Shopkeeper ne samaan available bataya hai.
                        </p>

                        <button
                          onClick={() =>
                            confirmOrder(request)
                          }
                          className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
                        >
                          Confirm Order
                        </button>
                      </div>
                    )}

                    {/* CUSTOMER CONFIRMED */}

                    {request.status === "customer_confirmed" && (
                      <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
                        <p className="text-sm text-purple-800">
                          Aapne order confirm kar diya hai.
                          Shopkeeper final amount confirm karega.
                        </p>
                      </div>
                    )}

                    {/* ORDER CONFIRMED */}

                    {request.status === "order_confirmed" && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                        <p className="mb-2 text-sm font-semibold text-green-800">
                          ✅ Shopkeeper ne order accept kar liya.
                        </p>

                        <p className="mb-3 text-sm">
                          {paymentText(request)}
                        </p>

                        {request.payment_status !== "paid" && (
                          <button
                            onClick={() =>
                              openPayment(request)
                            }
                            className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
                          >
                            Payment Choose Karein
                          </button>
                        )}
                      </div>
                    )}

                    {/* PREPARING */}

                    {request.status === "preparing" && (
                      <div className="rounded-xl bg-orange-50 p-3 text-sm text-orange-800">
                        🧑‍🍳 Shopkeeper aapka order prepare kar raha hai.
                      </div>
                    )}

                    {/* PACKED */}

                    {request.status === "packed" && (
                      <div className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">
                        📦 Aapka order pack ho gaya hai.
                      </div>
                    )}

                    {/* HANDED TO DELIVERY */}

                    {request.status === "handed_to_delivery" && (
                      <div className="rounded-xl bg-cyan-50 p-3 text-sm text-cyan-800">
                        🛵 Order delivery boy ko de diya gaya hai.
                      </div>
                    )}

                    {/* OUT FOR DELIVERY */}

                    {request.status === "out_for_delivery" && (
                      <div className="rounded-xl bg-violet-50 p-3 text-sm text-violet-800">
                        🛵 Order aapke address ki taraf aa raha hai.
                      </div>
                    )}

                    {/* DELIVERED */}

                    {request.status === "delivered" && (
                      <div className="rounded-xl bg-green-100 p-3 text-sm text-green-900">
                        <p className="font-semibold">
                          🎉 Order Delivered
                        </p>

                        <p className="mt-1">
                          {paymentText(request)}
                        </p>
                      </div>
                    )}

                    {/* UPI CLAIM */}

                    {request.payment_status ===
                      "upi_pending" && (
                      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                        <p className="mb-3 text-sm">
                          Agar UPI payment kar diya hai to
                          neeche button dabayein.
                        </p>

                        <button
                          onClick={() =>
                            markUpiPaid(request)
                          }
                          disabled={paymentLoading}
                          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
                        >
                          {paymentLoading
                            ? "Saving..."
                            : "I Have Paid"}
                        </button>
                      </div>
                    )}

                    {/* CUSTOMER CLAIMED */}

                    {request.payment_status ===
                      "customer_claimed" && (
                      <div className="mt-3 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                        ⏳ Payment verification pending.
                      </div>
                    )}

                    {/* PAID */}

                    {request.payment_status === "paid" && (
                      <div className="mt-3 rounded-xl bg-green-100 p-3 text-sm font-semibold text-green-800">
                        ✅ Payment Received
                      </div>
                    )}

                    {/* SHOP DETAILS */}

                    {shop && (
                      <div className="mt-4 border-t pt-3 text-xs text-gray-600">
                        {shop.address && (
                          <p>📍 {shop.address}</p>
                        )}

                        {shop.village && (
                          <p>🏘️ {shop.village}</p>
                        )}

                        {shop.phone && (
                          <p>📞 {shop.phone}</p>
                        )}

                        {shop.home_delivery && (
                          <p>
                            🚚 Home Delivery
                            {shop.delivery_time
                              ? ` • ${shop.delivery_time}`
                              : ""}
                            {shop.delivery_fee !== null
                              ? ` • ₹${shop.delivery_fee}`
                              : ""}
                          </p>
                        )}

                        {shop.pickup_available && (
                          <p>🛍️ Pickup Available</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SHOPS */}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Nearby Dukaan
              </h2>

              <p className="text-xs text-gray-500">
                {filteredShops.length} Shops
              </p>
            </div>

            <button
              onClick={loadShops}
              className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl bg-white p-5 text-sm text-gray-500">
              Dukaan load ho rahi hain...
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="rounded-xl bg-white p-5 text-sm text-gray-500">
              Koi dukaan nahi mili.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredShops.map((shop) => (
                <div
                  key={shop.id}
                  className="rounded-2xl border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold">
                        {shop.name}
                      </h3>

                      {shop.owner_name && (
                        <p className="text-sm text-gray-500">
                          {shop.owner_name}
                        </p>
                      )}

                      {shop.village && (
                        <p className="mt-1 text-sm text-gray-600">
                          📍 {shop.village}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                      Active
                    </span>
                  </div>

                  {/* PRODUCTS PREVIEW */}

                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold">
                      Available Products
                    </p>

                    {shop.products &&
                    shop.products.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {shop.products.slice(0, 6).map(
                          (product) => (
                            <button
                              key={product.id}
                              onClick={() => {
                                openShop(shop);
                                setTimeout(() => {
                                  setSelectedProduct(
                                    product
                                  );
                                }, 0);
                              }}
                              className="rounded-xl border bg-gray-50 p-3 text-left hover:border-green-500"
                            >
                              <p className="truncate text-sm font-medium">
                                {product.name}
                              </p>

                              <p className="mt-1 font-bold text-green-700">
                                ₹
                                {Number(
                                  product.price
                                ).toFixed(2)}
                              </p>
                            </button>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Products available nahi hain.
                      </p>
                    )}
                  </div>

                  {/* SHOP BUTTON */}

                  <button
                    onClick={() => openShop(shop)}
                    className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
                  >
                    Dukaan Open Karein
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* SHOP / PRODUCT MODAL */}

      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedShop.name}
                </h2>

                <p className="text-sm text-gray-500">
                  Product select karein
                </p>
              </div>

              <button
                onClick={() => setSelectedShop(null)}
                className="rounded-full bg-gray-100 px-3 py-2"
              >
                ✕
              </button>
            </div>

            {/* PRODUCTS */}

            <div className="space-y-2">
              {selectedShop.products &&
              selectedShop.products.length > 0 ? (
                selectedShop.products.map((product) => {
                  const isSelected =
                    selectedProduct?.id === product.id;

                  return (
                    <button
                      key={product.id}
                      onClick={() =>
                        selectProduct(product)
                      }
                      className={`w-full rounded-xl border p-4 text-left ${
                        isSelected
                          ? "border-green-600 bg-green-50"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {product.name}
                          </p>

                          {product.category && (
                            <p className="text-xs text-gray-500">
                              {product.category}
                            </p>
                          )}
                        </div>

                        <p className="font-bold text-green-700">
                          ₹
                          {Number(
                            product.price
                          ).toFixed(2)}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Is shop mein abhi products available nahi hain.
                </div>
              )}
            </div>

            {/* SELECTED PRODUCT */}

            {selectedProduct && (
              <div className="mt-5 rounded-2xl bg-green-50 p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold">
                      {selectedProduct.name}
                    </p>

                    <p className="text-sm text-gray-600">
                      ₹
                      {Number(
                        selectedProduct.price
                      ).toFixed(2)}{" "}
                      / unit
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-600">
                      Quantity
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          Math.max(
                            1,
                            Number(e.target.value) || 1
                          )
                        )
                      }
                      className="w-24 rounded-lg border bg-white px-3 py-2 text-center"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-between border-t pt-3">
                  <span className="font-medium">
                    Estimated Total
                  </span>

                  <span className="text-xl font-bold text-green-700">
                    ₹{estimatedTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={sendProductRequest}
                  disabled={
                    sendingShopId === selectedShop.id
                  }
                  className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 font-bold text-white disabled:opacity-50"
                >
                  {sendingShopId === selectedShop.id
                    ? "Sending..."
                    : "Request Bhejein"}
                </button>
              </div>
            )}

            {/* CUSTOM REQUEST */}

            <div className="mt-5 border-t pt-5">
              <p className="mb-2 text-sm font-semibold">
                Ya custom requirement bhejein
              </p>

              <textarea
                value={customRequirement}
                onChange={(e) =>
                  setCustomRequirement(e.target.value)
                }
                placeholder="Jaise: 2 kg aata, 1 packet namkeen..."
                rows={3}
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-500"
              />

              <button
                onClick={() =>
                  sendCustomRequest(selectedShop)
                }
                disabled={
                  sendingShopId === selectedShop.id
                }
                className="mt-2 w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                Custom Request Bhejein
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}

      {paymentRequest && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Payment
                </h2>

                <p className="text-sm text-gray-500">
                  Order Amount: ₹
                  {Number(
                    paymentRequest.order_amount || 0
                  ).toFixed(2)}
                </p>
              </div>

              <button
                onClick={() => setPaymentRequest(null)}
                className="rounded-full bg-gray-100 px-3 py-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() =>
                  choosePayment(
                    paymentRequest,
                    "cash"
                  )
                }
                disabled={paymentLoading}
                className="w-full rounded-2xl border p-4 text-left hover:border-green-500"
              >
                <p className="font-bold">
                  💵 Cash
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Delivery/Pickup ke time cash dein.
                </p>
              </button>

              <button
                onClick={() =>
                  choosePayment(
                    paymentRequest,
                    "upi"
                  )
                }
                disabled={paymentLoading}
                className="w-full rounded-2xl border p-4 text-left hover:border-green-500"
              >
                <p className="font-bold">
                  📱 UPI
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  UPI app se payment karein.
                </p>
              </button>
            </div>

            {paymentRequest.shop?.upi_id && (
              <p className="mt-4 text-center text-xs text-gray-500">
                UPI ID: {paymentRequest.shop.upi_id}
              </p>
            )}
          </div>
        </div>
      )}

      {/* MOBILE NAV */}

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          <a
            href="/"
            className="flex flex-col items-center px-4 py-2 text-xs text-gray-600"
          >
            <span className="text-lg">🏠</span>
            Home
          </a>

          <a
            href="/customer"
            className="flex flex-col items-center px-4 py-2 text-xs font-semibold text-green-700"
          >
            <span className="text-lg">🛒</span>
            Customer
          </a>

          <a
            href="/shop/login"
            className="flex flex-col items-center px-4 py-2 text-xs text-gray-600"
          >
            <span className="text-lg">🏪</span>
            Shop
          </a>
        </div>
      </nav>
    </main>
  );
}