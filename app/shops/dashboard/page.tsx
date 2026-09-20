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
  latitude: number | null;
  longitude: number | null;
};

type DeliveryBoy = {
  id: number;
  shop_id: number;
  name: string;
  phone: string | null;
  is_active: boolean;
};

type CustomerRequest = {
  id: number | string;
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

  delivery_boy_id: number | null;
  delivery_boy_name: string | null;
  delivery_boy_phone: string | null;
  delivery_status: string | null;
  delivery_assigned_at: string | null;
  out_for_delivery_at: string | null;

  cash_amount: number | null;
  cash_status: string | null;
  cash_received_at: string | null;
  cash_received_by: string | null;
  cash_handed_to_shop: boolean;
  cash_handed_to_shop_at: string | null;

  delivered_at: string | null;
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

export default function ShopDashboard() {
  const [shop, setShop] = useState<Shop | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [message, setMessage] = useState("");

  const [productForm, setProductForm] = useState({
    name: "",
    category: "",
    price: "",
  });

  const [settings, setSettings] = useState({
    payment_method: "cash",
    upi_id: "",
    home_delivery: false,
    delivery_time: "",
    delivery_fee: "0",
    pickup_available: true,
    latitude: "",
    longitude: "",
  });

  const [orderAmounts, setOrderAmounts] = useState<
    Record<string, string>
  >({});

  const [selectedDeliveryBoys, setSelectedDeliveryBoys] =
    useState<Record<string, string>>({});

  const [deliveryBoyForm, setDeliveryBoyForm] = useState({
    name: "",
    phone: "",
  });

  // --------------------------------------------------
  // LOAD SHOP
  // --------------------------------------------------

  async function loadShop() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("Please login first.");
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

      if (shopError || !shopData) {
        console.error("SHOP ERROR:", shopError);
        setMessage(
          "Approved shop nahi mili. Please shop approval check karein."
        );
        setLoading(false);
        return;
      }

      const currentShop = shopData as Shop;

      setShop(currentShop);

      setSettings({
        payment_method:
          currentShop.payment_method || "cash",
        upi_id: currentShop.upi_id || "",
        home_delivery:
          currentShop.home_delivery ?? false,
        delivery_time:
          currentShop.delivery_time || "",
        delivery_fee: String(
          currentShop.delivery_fee ?? 0
        ),
        pickup_available:
          currentShop.pickup_available ?? true,
        latitude:
          currentShop.latitude != null
            ? String(currentShop.latitude)
            : "",
        longitude:
          currentShop.longitude != null
            ? String(currentShop.longitude)
            : "",
      });

      await Promise.all([
        loadProducts(currentShop.id),
        loadRequests(currentShop.id),
        loadDeliveryBoys(currentShop.id),
      ]);
    } catch (error) {
      console.error(error);
      setMessage("Dashboard load error.");
    }

    setLoading(false);
  }

  // --------------------------------------------------
  // LOAD PRODUCTS
  // --------------------------------------------------

  async function loadProducts(shopId: number) {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        category,
        price,
        available
      `)
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("PRODUCT ERROR:", error);
      return;
    }

    setProducts((data || []) as Product[]);
  }

  // --------------------------------------------------
  // LOAD REQUESTS
  // --------------------------------------------------

  async function loadRequests(shopId: number) {
    setLoadingRequests(true);

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
        paid_at,

        delivery_boy_id,
        delivery_boy_name,
        delivery_boy_phone,
        delivery_status,
        delivery_assigned_at,
        out_for_delivery_at,

        cash_amount,
        cash_status,
        cash_received_at,
        cash_received_by,
        cash_handed_to_shop,
        cash_handed_to_shop_at,

        delivered_at
      `)
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("REQUEST LOAD ERROR:", error);
      setMessage(`❌ Requests load error: ${error.message}`);
      setLoadingRequests(false);
      return;
    }

    setRequests((data || []) as CustomerRequest[]);
    setLoadingRequests(false);
  }

  // --------------------------------------------------
  // LOAD DELIVERY BOYS
  // --------------------------------------------------

  async function loadDeliveryBoys(shopId: number) {
    const { data, error } = await supabase
      .from("delivery_boys")
      .select(`
        id,
        shop_id,
        name,
        phone,
        is_active
      `)
      .eq("shop_id", shopId)
      .order("name", { ascending: true });

    if (error) {
      console.error("DELIVERY BOY ERROR:", error);
      return;
    }

    setDeliveryBoys((data || []) as DeliveryBoy[]);
  }

  // --------------------------------------------------
  // INITIAL
  // --------------------------------------------------

  useEffect(() => {
    loadShop();
  }, []);

  // --------------------------------------------------
  // ADD PRODUCT
  // --------------------------------------------------

  async function addProduct() {
    if (!shop) return;

    const name = productForm.name.trim();
    const category = productForm.category.trim();
    const price = Number(productForm.price);

    if (!name) {
      setMessage("Product name likhiye.");
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      setMessage("Valid price enter karein.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("products")
      .insert({
        shop_id: shop.id,
        name,
        category: category || null,
        price,
        available: true,
      });

    if (error) {
      console.error("ADD PRODUCT ERROR:", error);
      setMessage(`❌ Product add nahi hua: ${error.message}`);
      setSaving(false);
      return;
    }

    setProductForm({
      name: "",
      category: "",
      price: "",
    });

    await loadProducts(shop.id);

    setMessage("✅ Product successfully add ho gaya.");
    setSaving(false);
  }

  // --------------------------------------------------
  // TOGGLE PRODUCT
  // --------------------------------------------------

  async function toggleProduct(
    product: Product
  ) {
    const { error } = await supabase
      .from("products")
      .update({
        available: !product.available,
      })
      .eq("id", product.id);

    if (error) {
      setMessage(`❌ ${error.message}`);
      return;
    }

    if (shop) {
      await loadProducts(shop.id);
    }
  }

  // --------------------------------------------------
  // DELETE PRODUCT
  // --------------------------------------------------

  async function deleteProduct(
    productId: number
  ) {
    const ok = window.confirm(
      "Kya aap ye product delete karna chahte hain?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      setMessage(`❌ ${error.message}`);
      return;
    }

    if (shop) {
      await loadProducts(shop.id);
    }

    setMessage("Product delete ho gaya.");
  }
  async function deleteCustomerRequest(requestId: number | string) {
  const ok = window.confirm(
    "⚠️ Kya aap is request ko permanently delete karna chahte hain?\n\nYe request Customer aur Shopkeeper dono ki list se hat jayegi."
  );

  if (!ok) return;

  const { error } = await supabase
    .from("customer_requests")
    .delete()
    .eq("id", requestId);

  if (error) {
    console.error("DELETE CUSTOMER REQUEST ERROR:", error);
    setMessage(`❌ Request delete nahi hui: ${error.message}`);
    return;
  }

  setRequests((prev) =>
    prev.filter(
      (item) => String(item.id) !== String(requestId)
    )
  );

  setMessage(
    "✅ Request Customer aur Shopkeeper dono ki list se delete ho gayi."
  );
}

  // --------------------------------------------------
  // SAVE SETTINGS
  // --------------------------------------------------

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("❌ Is mobile/browser me location support nahi hai.");
      return;
    }

    setMessage("📍 Location permission maang raha hai...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setSettings((current) => ({
          ...current,
          latitude: String(latitude),
          longitude: String(longitude),
        }));

        setMessage(
          `📍 Location mil gayi: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}. Ab Save Settings dabayein.`
        );
      },
      (error) => {
        console.error("LOCATION ERROR:", error);
        setMessage(
          "❌ Location nahi mili. Mobile me GPS/Location ON karein aur browser permission Allow karein."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  function openShopLocation() {
    const lat = Number(settings.latitude);
    const lng = Number(settings.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMessage("❌ Pehle shop ki location save karein.");
      return;
    }

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "_blank"
    );
  }

  async function saveSettings() {
    if (!shop) return;

    const deliveryFee = Number(
      settings.delivery_fee || 0
    );

    if (
      settings.home_delivery &&
      (Number.isNaN(deliveryFee) || deliveryFee < 0)
    ) {
      setMessage("Valid delivery fee enter karein.");
      return;
    }

    setSavingSettings(true);
    setMessage("");

    const { data, error } = await supabase
      .from("shops")
      .update({
        payment_method:
          settings.payment_method,
        upi_id:
          settings.payment_method === "cash"
            ? null
            : settings.upi_id.trim() || null,

        home_delivery:
          settings.home_delivery,

        delivery_time:
          settings.home_delivery
            ? settings.delivery_time.trim() || null
            : null,

        delivery_fee:
          settings.home_delivery
            ? deliveryFee
            : 0,

        pickup_available:
          settings.pickup_available,

        latitude:
          settings.latitude.trim()
            ? Number(settings.latitude)
            : null,

        longitude:
          settings.longitude.trim()
            ? Number(settings.longitude)
            : null,
      })
      .eq("id", shop.id)
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
        pickup_available,
        latitude,
        longitude
      `)
      .single();

    if (error) {
      console.error("SETTINGS ERROR:", error);
      setMessage(
        `❌ Settings save nahi hui: ${error.message}`
      );
      setSavingSettings(false);
      return;
    }

    setShop(data as Shop);

    setSettings({
      payment_method:
        data.payment_method || "cash",
      upi_id: data.upi_id || "",
      home_delivery:
        data.home_delivery ?? false,
      delivery_time:
        data.delivery_time || "",
      delivery_fee: String(
        data.delivery_fee ?? 0
      ),
      pickup_available:
        data.pickup_available ?? true,
      latitude:
        data.latitude != null
          ? String(data.latitude)
          : "",
      longitude:
        data.longitude != null
          ? String(data.longitude)
          : "",
    });

    setMessage("✅ Settings successfully saved.");
    setSavingSettings(false);
  }

  // --------------------------------------------------
  // ADD DELIVERY BOY
  // --------------------------------------------------

  async function addDeliveryBoy() {
    if (!shop) return;

    const name =
      deliveryBoyForm.name.trim();

    const phone =
      deliveryBoyForm.phone.trim();

    if (!name) {
      setMessage("Delivery Boy ka naam likhiye.");
      return;
    }

    const { error } = await supabase
      .from("delivery_boys")
      .insert({
        shop_id: shop.id,
        name,
        phone: phone || null,
        is_active: true,
      });

    if (error) {
      console.error(
        "ADD DELIVERY BOY ERROR:",
        error
      );

      setMessage(
        `❌ Delivery Boy add nahi hua: ${error.message}`
      );

      return;
    }

    setDeliveryBoyForm({
      name: "",
      phone: "",
    });

    await loadDeliveryBoys(shop.id);

    setMessage(
      "✅ Delivery Boy successfully add ho gaya."
    );
  }

  // --------------------------------------------------
  // TOGGLE DELIVERY BOY
  // --------------------------------------------------

  async function toggleDeliveryBoy(
    boy: DeliveryBoy
  ) {
    const { error } = await supabase
      .from("delivery_boys")
      .update({
        is_active: !boy.is_active,
      })
      .eq("id", boy.id);

    if (error) {
      setMessage(`❌ ${error.message}`);
      return;
    }

    if (shop) {
      await loadDeliveryBoys(shop.id);
    }
  }

  // --------------------------------------------------
  // ACCEPT CUSTOMER ORDER
  // IMPORTANT:
  // DO NOT OVERWRITE CUSTOMER PAYMENT SELECTION
  // --------------------------------------------------

  async function acceptCustomerOrder(
    request: CustomerRequest
  ) {
    const amount = Number(
      orderAmounts[String(request.id)] ||
        request.estimated_amount ||
        0
    );

    if (Number.isNaN(amount) || amount <= 0) {
      setMessage(
        "Final order amount valid enter karein."
      );
      return;
    }

    const existingPaymentMethod =
      request.payment_method;

    let paymentStatus =
      request.payment_status ||
      "not_selected";

    // Customer ne Cash pehle hi select kiya tha
    if (existingPaymentMethod === "cash") {
      paymentStatus = "cash_pending";
    }

    // Customer ne UPI select kiya tha
    if (existingPaymentMethod === "upi") {
      paymentStatus = "upi_pending";
    }

    const updateData: Record<string, any> = {
      status: "order_confirmed",
      order_amount: amount,
      shopkeeper_confirmed_at:
        new Date().toISOString(),

      payment_method:
        existingPaymentMethod,

      payment_status:
        paymentStatus,
    };

    // COD ke liye cash tracking
    if (existingPaymentMethod === "cash") {
      updateData.cash_amount = amount;
      updateData.cash_status = "pending";
    }

    const { error } = await supabase
      .from("customer_requests")
      .update(updateData)
      .eq("id", request.id);

    if (error) {
      console.error(
        "ACCEPT ORDER ERROR:",
        error
      );

      setMessage(
        `❌ Order accept nahi hua: ${error.message}`
      );

      return;
    }

    setMessage(
      existingPaymentMethod === "cash"
        ? `✅ Order confirmed. Cash ₹${amount.toFixed(
            2
          )} delivery par collect hoga.`
        : "✅ Order successfully confirmed."
    );

    if (shop) {
      await loadRequests(shop.id);
    }
  }

  // --------------------------------------------------
  // ORDER STAGE
  // --------------------------------------------------

  async function updateOrderStage(
    request: CustomerRequest,
    newStatus: string
  ) {
    const updateData: Record<string, any> = {
      status: newStatus,
    };

    if (newStatus === "out_for_delivery") {
      updateData.out_for_delivery_at =
        new Date().toISOString();
    }

    if (newStatus === "delivered") {
      updateData.delivered_at =
        new Date().toISOString();
    }

    const { error } = await supabase
      .from("customer_requests")
      .update(updateData)
      .eq("id", request.id);

    if (error) {
      console.error(
        "STATUS UPDATE ERROR:",
        error
      );

      setMessage(
        `❌ Status update nahi hua: ${error.message}`
      );

      return;
    }

    setMessage(
      `Order status: ${STATUS_LABELS[newStatus] || newStatus}`
    );

    if (shop) {
      await loadRequests(shop.id);
    }
  }

  // --------------------------------------------------
  // ASSIGN DELIVERY BOY
  // --------------------------------------------------

  async function assignDeliveryBoy(
    request: CustomerRequest
  ) {
    const selectedId =
      selectedDeliveryBoys[
        String(request.id)
      ];

    if (!selectedId) {
      setMessage(
        "Pehle Delivery Boy select karein."
      );
      return;
    }

    const boy = deliveryBoys.find(
      (item) =>
        String(item.id) ===
        String(selectedId)
    );

    if (!boy) {
      setMessage(
        "Delivery Boy nahi mila."
      );
      return;
    }

    const { error } = await supabase
      .from("customer_requests")
      .update({
        delivery_boy_id: boy.id,
        delivery_boy_name: boy.name,
        delivery_boy_phone: boy.phone,
        delivery_status: "assigned",
        delivery_assigned_at:
          new Date().toISOString(),

        status: "handed_to_delivery",
      })
      .eq("id", request.id);

    if (error) {
      console.error(
        "ASSIGN DELIVERY ERROR:",
        error
      );

      setMessage(
        `❌ Delivery Boy assign nahi hua: ${error.message}`
      );

      return;
    }

    setMessage(
      `🛵 ${boy.name} ko order de diya gaya.`
    );

    if (shop) {
      await loadRequests(shop.id);
    }
  }

  // --------------------------------------------------
  // MARK PAYMENT RECEIVED BY SHOP
  // --------------------------------------------------

  async function markPaymentReceived(
    request: CustomerRequest
  ) {
    const { error } = await supabase
      .from("customer_requests")
      .update({
        payment_status: "paid",
        paid_at:
          new Date().toISOString(),

        cash_status:
          request.payment_method === "cash"
            ? "received"
            : request.cash_status,
      })
      .eq("id", request.id);

    if (error) {
      console.error(
        "PAYMENT RECEIVED ERROR:",
        error
      );

      setMessage(
        `❌ Payment update nahi hua: ${error.message}`
      );

      return;
    }

    setMessage(
      `✅ ₹${Number(
        request.order_amount || 0
      ).toFixed(2)} payment received mark ho gaya.`
    );

    if (shop) {
      await loadRequests(shop.id);
    }
  }

  // --------------------------------------------------
  // CASH HANDED TO SHOP
  // --------------------------------------------------

  async function confirmCashFromDeliveryBoy(
    request: CustomerRequest
  ) {
    if (!request.cash_received_at) {
      setMessage(
        "Delivery Boy ne abhi cash receive confirm nahi kiya."
      );
      return;
    }

    const { error } = await supabase
      .from("customer_requests")
      .update({
        cash_handed_to_shop: true,
        cash_handed_to_shop_at:
          new Date().toISOString(),
        payment_status: "paid",
        paid_at:
          new Date().toISOString(),
        cash_status: "handed_to_shop",
      })
      .eq("id", request.id);

    if (error) {
      console.error(
        "CASH HANDOVER ERROR:",
        error
      );

      setMessage(
        `❌ Cash confirmation nahi hua: ${error.message}`
      );

      return;
    }

    setMessage(
      `✅ Delivery Boy se ₹${Number(
        request.cash_amount ||
          request.order_amount ||
          0
      ).toFixed(2)} cash receive confirm ho gaya.`
    );

    if (shop) {
      await loadRequests(shop.id);
    }
  }

  // --------------------------------------------------
  // PAYMENT TEXT
  // --------------------------------------------------

  function getPaymentText(
    request: CustomerRequest
  ) {
    if (request.payment_method === "cash") {
      if (
        request.cash_handed_to_shop
      ) {
        return "🟢 Cash Shopkeeper Ko Received";
      }

      if (request.cash_received_at) {
        return "🟡 Cash Delivery Boy Ke Paas";
      }

      return "🔴 Cash Pending";
    }

    if (
      request.payment_method === "upi"
    ) {
      if (
        request.payment_status ===
        "paid"
      ) {
        return "🟢 UPI Payment Received";
      }

      if (
        request.payment_status ===
        "customer_claimed"
      ) {
        return "🟡 UPI Verification Pending";
      }

      return "🔴 UPI Payment Pending";
    }

    return "⚠️ Payment Not Selected";
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 text-center">
          Dashboard loading...
        </div>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8">
          <h1 className="text-xl font-bold">
            Shop Dashboard
          </h1>

          <p className="mt-3 text-red-600">
            {message ||
              "Shop information available nahi hai."}
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* HEADER */}

      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-green-700">
                {shop.name}
              </h1>

              <p className="text-sm text-gray-500">
                Shopkeeper Dashboard
              </p>
            </div>

            <a
              href="/"
              className="w-fit rounded-lg bg-gray-100 px-4 py-2 text-sm"
            >
              Home
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* MESSAGE */}

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {message}
          </div>
        )}

        {/* SHOP INFO */}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">
            🏪 Shop Information
          </h2>

          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <b>Owner:</b>{" "}
              {shop.owner_name || "-"}
            </p>

            <p>
              <b>Phone:</b>{" "}
              {shop.phone || "-"}
            </p>

            <p>
              <b>Village:</b>{" "}
              {shop.village || "-"}
            </p>

            <p>
              <b>Address:</b>{" "}
              {shop.address || "-"}
            </p>
          </div>
        </section>

        {/* PRODUCTS */}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">
            📦 Products
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              value={productForm.name}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  name: e.target.value,
                })
              }
              placeholder="Product name"
              className="rounded-xl border px-4 py-3"
            />

            <input
              value={productForm.category}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  category: e.target.value,
                })
              }
              placeholder="Category"
              className="rounded-xl border px-4 py-3"
            />

            <input
              type="number"
              value={productForm.price}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  price: e.target.value,
                })
              }
              placeholder="Price ₹"
              className="rounded-xl border px-4 py-3"
            />
          </div>

          <button
            onClick={addProduct}
            disabled={saving}
            className="mt-3 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white"
          >
            {saving
              ? "Adding..."
              : "Add Product"}
          </button>

          <div className="mt-5 space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {product.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {product.category || "General"} • ₹
                    {Number(
                      product.price || 0
                    ).toFixed(2)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      toggleProduct(product)
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      product.available
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {product.available
                      ? "Available"
                      : "Unavailable"}
                  </button>

                  <button
                    onClick={() =>
                      deleteProduct(
                        product.id
                      )
                    }
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SETTINGS */}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">
            ⚙️ Shop Settings
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Payment, pickup aur home delivery settings.
          </p>

          <div className="mt-5 space-y-4">
            {/* SHOP LOCATION */}

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">📍 Shop Location</p>
                  <p className="mt-1 text-xs text-gray-600">
                    Customer ko map par aapki exact shop location dikhane ke liye.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white sm:w-auto"
                >
                  📍 Use Current Location
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  value={settings.latitude}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      latitude: e.target.value,
                    })
                  }
                  placeholder="Latitude"
                  inputMode="decimal"
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                />

                <input
                  value={settings.longitude}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      longitude: e.target.value,
                    })
                  }
                  placeholder="Longitude"
                  inputMode="decimal"
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                />
              </div>

              {settings.latitude && settings.longitude && (
                <button
                  type="button"
                  onClick={openShopLocation}
                  className="mt-3 w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-700"
                >
                  🗺️ Check Shop Location in Google Maps
                </button>
              )}
            </div>

            {/* PAYMENT */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Payment Method
              </label>

              <select
                value={settings.payment_method}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payment_method:
                      e.target.value,
                  })
                }
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="cash">
                  Cash
                </option>

                <option value="upi">
                  UPI
                </option>

                <option value="both">
                  Cash + UPI
                </option>
              </select>
            </div>

            {/* UPI */}

            {settings.payment_method !==
              "cash" && (
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  UPI ID
                </label>

                <input
                  value={settings.upi_id}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      upi_id:
                        e.target.value,
                    })
                  }
                  placeholder="example@upi"
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>
            )}

            {/* DELIVERY */}

            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    Home Delivery
                  </p>

                  <p className="text-xs text-gray-500">
                    Customer ke ghar delivery.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      home_delivery:
                        !settings.home_delivery,
                    })
                  }
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    settings.home_delivery
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {settings.home_delivery
                    ? "ON"
                    : "OFF"}
                </button>
              </div>
            </div>

            {settings.home_delivery && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Delivery Time
                  </label>

                  <input
                    value={
                      settings.delivery_time
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        delivery_time:
                          e.target.value,
                      })
                    }
                    placeholder="30–60 min"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Delivery Fee
                  </label>

                  <input
                    type="number"
                    value={
                      settings.delivery_fee
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        delivery_fee:
                          e.target.value,
                      })
                    }
                    placeholder="20"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
              </>
            )}

            {/* PICKUP */}

            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    Pickup Available
                  </p>
                </div>

                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      pickup_available:
                        !settings.pickup_available,
                    })
                  }
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    settings.pickup_available
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {settings.pickup_available
                    ? "ON"
                    : "OFF"}
                </button>
              </div>
            </div>

            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="w-full rounded-xl bg-green-600 px-4 py-3 font-bold text-white"
            >
              {savingSettings
                ? "Saving..."
                : "Save Settings"}
            </button>
          </div>
        </section>

        {/* DELIVERY BOYS */}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">
            🛵 Delivery Boys
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Delivery Boy add karke orders assign karein.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={deliveryBoyForm.name}
              onChange={(e) =>
                setDeliveryBoyForm({
                  ...deliveryBoyForm,
                  name: e.target.value,
                })
              }
              placeholder="Delivery Boy Name"
              className="rounded-xl border px-4 py-3"
            />

            <input
              value={deliveryBoyForm.phone}
              onChange={(e) =>
                setDeliveryBoyForm({
                  ...deliveryBoyForm,
                  phone: e.target.value,
                })
              }
              placeholder="Mobile Number"
              className="rounded-xl border px-4 py-3"
            />
          </div>

          <button
            onClick={addDeliveryBoy}
            className="mt-3 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            + Add Delivery Boy
          </button>

          <div className="mt-5 space-y-2">
            {deliveryBoys.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                Abhi koi delivery boy add nahi hai.
              </p>
            ) : (
              deliveryBoys.map((boy) => (
                <div
                  key={boy.id}
                  className="flex items-center justify-between rounded-xl border p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {boy.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {boy.phone || "Phone not added"}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      toggleDeliveryBoy(boy)
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      boy.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {boy.is_active
                      ? "Active"
                      : "Inactive"}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* CUSTOMER REQUESTS */}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                🛒 Customer Orders
              </h2>

              <p className="text-sm text-gray-500">
                Customer requests aur orders.
              </p>
            </div>

            <button
              onClick={() =>
                shop && loadRequests(shop.id)
              }
              className="rounded-lg bg-gray-100 px-3 py-2 text-xs"
            >
              Refresh
            </button>
          </div>

          {loadingRequests ? (
            <div className="mt-5 rounded-xl bg-gray-50 p-5 text-sm">
              Requests loading...
            </div>
          ) : requests.length === 0 ? (
            <div className="mt-5 rounded-xl bg-gray-50 p-5 text-sm text-gray-500">
              Abhi koi customer request nahi hai.
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {requests.map((request) => (
                <div
                  key={String(request.id)}
                  className="rounded-2xl border p-4"
                >
                  {/* HEADER */}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs text-gray-500">
                        Request #
                        {String(
                          request.id
                        ).slice(0, 8)}
                      </p>

                      <h3 className="text-lg font-bold">
                        {request.product_name ||
                          request.requirement}
                      </h3>

                      {request.product_name && (
                        <p className="mt-1 text-sm text-gray-600">
                          Quantity:{" "}
                          {request.quantity || 1}
                          {" × "}
                          ₹
                          {Number(
                            request.unit_price || 0
                          ).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                        {STATUS_LABELS[
                          request.status
                        ] ||
                          request.status}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          deleteCustomerRequest(request.id)
                        }
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                      >
                        🗑️ Hatao
                      </button>
                    </div>
                  </div>

                  {/* ESTIMATED */}

                  {request.product_name && (
                    <div className="mt-4 rounded-xl bg-blue-50 p-3">
                      <div className="flex justify-between text-sm">
                        <span>
                          Estimated Amount
                        </span>

                        <b>
                          ₹
                          {Number(
                            request.estimated_amount ||
                              0
                          ).toFixed(2)}
                        </b>
                      </div>
                    </div>
                  )}

                  {/* PENDING */}

                  {request.status ===
                    "pending" && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        onClick={() =>
                          updateOrderStage(
                            request,
                            "available"
                          )
                        }
                        className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
                      >
                        Samaan Available
                      </button>

                      <button
                        onClick={() =>
                          updateOrderStage(
                            request,
                            "not_available"
                          )
                        }
                        className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white"
                      >
                        Not Available
                      </button>
                    </div>
                  )}

                  {/* CUSTOMER CONFIRMED */}

                  {request.status ===
                    "customer_confirmed" && (
                    <div className="mt-4 rounded-xl bg-purple-50 p-4">
                      <p className="font-semibold text-purple-800">
                        Customer ne order confirm
                        kiya hai.
                      </p>

                      <div className="mt-3 flex gap-2">
                        <input
                          type="number"
                          placeholder="Final Amount ₹"
                          value={
                            orderAmounts[
                              String(
                                request.id
                              )
                            ] || ""
                          }
                          onChange={(e) =>
                            setOrderAmounts({
                              ...orderAmounts,
                              [String(
                                request.id
                              )]:
                                e.target.value,
                            })
                          }
                          className="flex-1 rounded-xl border px-4 py-3"
                        />

                        <button
                          onClick={() =>
                            acceptCustomerOrder(
                              request
                            )
                          }
                          className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
                        >
                          Confirm Order
                        </button>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        Customer ki selected payment
                        method preserve rahegi.
                      </p>
                    </div>
                  )}

                  {/* ORDER CONFIRMED */}

                  {[
                    "order_confirmed",
                    "preparing",
                    "packed",
                    "handed_to_delivery",
                    "out_for_delivery",
                    "delivered",
                  ].includes(
                    request.status
                  ) && (
                    <div className="mt-4 space-y-3">
                      {/* ORDER SUMMARY */}

                      <div className="rounded-xl bg-gray-50 p-4">
                        <div className="flex justify-between">
                          <span>
                            Order Amount
                          </span>

                          <b className="text-lg">
                            ₹
                            {Number(
                              request.order_amount ||
                                0
                            ).toFixed(2)}
                          </b>
                        </div>

                        <div className="mt-2 flex justify-between">
                          <span>
                            Payment
                          </span>

                          <b>
                            {getPaymentText(
                              request
                            )}
                          </b>
                        </div>

                        {request.payment_method ===
                          "cash" && (
                          <p className="mt-2 text-sm text-orange-700">
                            💵 COD Amount: ₹
                            {Number(
                              request.cash_amount ||
                                request.order_amount ||
                                0
                            ).toFixed(2)}
                          </p>
                        )}
                      </div>

                      {/* PREPARING */}

                      {request.status ===
                        "order_confirmed" && (
                        <button
                          onClick={() =>
                            updateOrderStage(
                              request,
                              "preparing"
                            )
                          }
                          className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white"
                        >
                          🧑‍🍳 Start Preparing
                        </button>
                      )}

                      {/* PACKED */}

                      {request.status ===
                        "preparing" && (
                        <button
                          onClick={() =>
                            updateOrderStage(
                              request,
                              "packed"
                            )
                          }
                          className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white"
                        >
                          📦 Mark as Packed
                        </button>
                      )}

                      {/* PACKED + DELIVERY */}

                      {request.status ===
                        "packed" &&
                        shop.home_delivery && (
                          <div className="rounded-xl bg-cyan-50 p-4">
                            <p className="font-semibold">
                              Delivery Boy Assign Karein
                            </p>

                            <select
                              value={
                                selectedDeliveryBoys[
                                  String(
                                    request.id
                                  )
                                ] || ""
                              }
                              onChange={(e) =>
                                setSelectedDeliveryBoys(
                                  {
                                    ...selectedDeliveryBoys,
                                    [String(
                                      request.id
                                    )]:
                                      e.target
                                        .value,
                                  }
                                )
                              }
                              className="mt-3 w-full rounded-xl border bg-white px-4 py-3"
                            >
                              <option value="">
                                Select Delivery Boy
                              </option>

                              {deliveryBoys
                                .filter(
                                  (boy) =>
                                    boy.is_active
                                )
                                .map((boy) => (
                                  <option
                                    key={
                                      boy.id
                                    }
                                    value={
                                      boy.id
                                    }
                                  >
                                    {boy.name}
                                    {boy.phone
                                      ? ` - ${boy.phone}`
                                      : ""}
                                  </option>
                                ))}
                            </select>

                            <button
                              onClick={() =>
                                assignDeliveryBoy(
                                  request
                                )
                              }
                              className="mt-3 w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white"
                            >
                              🛵 Delivery Boy Ko De Do
                            </button>
                          </div>
                        )}

                      {/* PICKUP */}

                      {request.status ===
                        "packed" &&
                        !shop.home_delivery && (
                          <button
                            onClick={() =>
                              updateOrderStage(
                                request,
                                "delivered"
                              )
                            }
                            className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
                          >
                            🛍️ Customer Ko De Diya
                          </button>
                        )}

                      {/* DELIVERY BOY INFO */}

                      {request.delivery_boy_name && (
                        <div className="rounded-xl bg-blue-50 p-4">
                          <p className="font-semibold">
                            🛵 Delivery Boy
                          </p>

                          <p className="mt-1 text-sm">
                            {request.delivery_boy_name}
                          </p>

                          {request.delivery_boy_phone && (
                            <p className="text-sm text-gray-600">
                              📞{" "}
                              {
                                request.delivery_boy_phone
                              }
                            </p>
                          )}
                        </div>
                      )}

                      {/* OUT FOR DELIVERY */}

                      {request.status ===
                        "handed_to_delivery" && (
                        <button
                          onClick={() =>
                            updateOrderStage(
                              request,
                              "out_for_delivery"
                            )
                          }
                          className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white"
                        >
                          🛵 Out for Delivery
                        </button>
                      )}

                      {/* DELIVERED */}

                      {request.status ===
                        "out_for_delivery" && (
                        <div className="rounded-xl bg-yellow-50 p-4">
                          <p className="font-semibold">
                            Delivery Boy customer
                            ke paas hai.
                          </p>

                          <p className="mt-1 text-sm text-gray-600">
                            Cash payment Delivery Boy
                            confirm karega.
                          </p>
                        </div>
                      )}

                      {/* CASH RECEIVED */}

                      {request.cash_received_at && (
                        <div className="rounded-xl bg-green-50 p-4">
                          <p className="font-semibold text-green-800">
                            💵 Cash Received by Delivery
                            Boy
                          </p>

                          <p className="mt-1">
                            ₹
                            {Number(
                              request.cash_amount ||
                                request.order_amount ||
                                0
                            ).toFixed(2)}
                          </p>

                          <p className="text-xs text-gray-500">
                            Received by:{" "}
                            {request.cash_received_by ||
                              request.delivery_boy_name ||
                              "Delivery Boy"}
                          </p>

                          {!request.cash_handed_to_shop && (
                            <button
                              onClick={() =>
                                confirmCashFromDeliveryBoy(
                                  request
                                )
                              }
                              className="mt-3 w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
                            >
                              💰 Cash Shopkeeper Ko Mil Gaya
                            </button>
                          )}
                        </div>
                      )}

                      {/* DELIVERED STATUS */}

                      {request.status ===
                        "delivered" && (
                        <div className="rounded-xl bg-green-100 p-4">
                          <p className="font-bold text-green-800">
                            🏠 Order Delivered
                          </p>

                          <p className="mt-1 text-sm">
                            Customer ko order successfully
                            deliver ho gaya.
                          </p>
                        </div>
                      )}

                      {/* PAYMENT RECEIVED MANUAL */}

                      {request.payment_method ===
                        "upi" &&
                        request.payment_status !==
                          "paid" && (
                          <button
                            onClick={() =>
                              markPaymentReceived(
                                request
                              )
                            }
                            className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
                          >
                            ✅ UPI Payment Received
                          </button>
                        )}

                      {/* PAYMENT PAID */}

                      {request.payment_status ===
                        "paid" && (
                        <div className="rounded-xl bg-green-100 p-4 text-green-800">
                          <p className="font-bold">
                            ✅ Payment Received
                          </p>

                          <p className="text-sm">
                            ₹
                            {Number(
                              request.order_amount ||
                                0
                            ).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}