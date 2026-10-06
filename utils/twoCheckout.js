import crypto from "crypto";

const CHECKOUT_URL = "https://secure.2checkout.com/checkout/buy";

// 2Checkout serialises a value as <byte length><value>
const ser = (value) => {
    const v = value === undefined || value === null ? "" : String(value);
    return `${Buffer.byteLength(v)}${v}`;
};

const serArrayOrValue = (value) =>
    Array.isArray(value) ? value.map(ser).join("") : ser(value);

const safeEqual = (a, b) => {
    const x = Buffer.from(String(a).toLowerCase());
    const y = Buffer.from(String(b).toLowerCase());
    return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export const isConfigured = () =>
    Boolean(process.env.TWOCHECKOUT_MERCHANT_CODE && process.env.TWOCHECKOUT_BUYLINK_SECRET);

// ---- Buy link (ConvertPlus hosted checkout) ----

// signature = HMAC-SHA256(secret, serialised params sorted by name, signature excluded)
export const signBuyLinkParams = (params, secret) => {
    const payload = Object.keys(params)
        .sort()
        .map((k) => ser(params[k]))
        .join("");
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

const clean = (text) => String(text).replace(/[;&=]/g, " ").trim();

export const buildBuyLink = (order, user) => {
    const params = {
        merchant: process.env.TWOCHECKOUT_MERCHANT_CODE,
        dynamic: "1",
        currency: order.currency,
        prod: order.items.map((i) => clean(i.name)).join(";"),
        price: order.items.map((i) => i.price.toFixed(2)).join(";"),
        qty: order.items.map((i) => i.quantity).join(";"),
        type: order.items.map(() => "PRODUCT").join(";"),
        tangible: order.items.map(() => "1").join(";"),
        "order-ext-ref": order._id.toString(),
        "customer-ext-ref": user._id.toString(),
        email: user.email,
        "return-url": process.env.PAYMENT_RETURN_URL,
        "return-type": "redirect"
    };

    if (process.env.TWOCHECKOUT_TEST_MODE !== "false") {
        params.test = "1";
    }

    params.signature = signBuyLinkParams(params, process.env.TWOCHECKOUT_BUYLINK_SECRET);

    return `${CHECKOUT_URL}?${new URLSearchParams(params).toString()}`;
};

// ---- IPN (server-to-server notification) ----

// HASH = HMAC-MD5(secretKey, serialised values of every field except HASH, in received order)
export const computeIpnHash = (body, secretKey) => {
    const payload = Object.keys(body)
        .filter((k) => k !== "HASH")
        .map((k) => serArrayOrValue(body[k]))
        .join("");
    return crypto.createHmac("md5", secretKey).update(payload).digest("hex");
};

export const verifyIpn = (body, secretKey) => {
    if (!secretKey || !body || !body.HASH) return false;
    return safeEqual(computeIpnHash(body, secretKey), body.HASH);
};

const first = (v) => (Array.isArray(v) ? v[0] : v);

const formatDate = (d) => d.toISOString().replace(/[-:T]/g, "").slice(0, 14);

// the body 2Checkout expects back so it stops retrying the IPN
export const buildIpnAck = (body, secretKey) => {
    const date = formatDate(new Date());
    const payload =
        ser(first(body["IPN_PID[]"])) +
        ser(first(body["IPN_PNAME[]"])) +
        ser(body["IPN_DATE"]) +
        ser(date);
    const hash = crypto.createHmac("md5", secretKey).update(payload).digest("hex");
    return `<EPAYMENT>${date}|${hash}</EPAYMENT>`;
};
