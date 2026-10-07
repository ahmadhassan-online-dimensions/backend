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

// buy links are signed with the buy-link secret word; the account Secret key is accepted as a fallback
const buyLinkSecret = () => process.env.TWOCHECKOUT_BUYLINK_SECRET || process.env.TWOCHECKOUT_SECRET_KEY;

export const isConfigured = () =>
    Boolean(process.env.TWOCHECKOUT_MERCHANT_CODE && buyLinkSecret());

// ---- Buy link (ConvertPlus hosted checkout) ----

// 2Checkout only signs these buy-link parameters. merchant, dynamic, test, email, ... must NOT be
// part of the signature, otherwise 2Checkout rejects it and opens an empty cart.
const SIGNED_PARAMS = [
    "currency", "prod", "price", "qty", "tangible", "type", "opt", "description",
    "recurrence", "duration", "renewal-price", "item-ext-ref",
    "return-url", "return-type", "expiration", "order-ext-ref", "customer-ref", "customer-ext-ref", "lock"
];

// signature = HMAC-SHA256(buy-link secret word, serialised signed params sorted by name)
export const signBuyLinkParams = (params, secret) => {
    const payload = Object.keys(params)
        .filter((k) => SIGNED_PARAMS.includes(k))
        .sort()
        .map((k) => ser(params[k]))
        .join("");
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

// 2Checkout's firewall answers "Error 15 / Access denied" to buy links whose return-url points at
// localhost, 127.x, or a private LAN address. Only send return-url when it is a public address.
const isPublicUrl = (value) => {
    try {
        const { hostname, protocol } = new URL(value);
        if (!["http:", "https:"].includes(protocol)) return false;
        if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) return false;
        if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(hostname)) return false;
        if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
        if (hostname === "::1" || hostname === "[::1]") return false;
        return true;
    } catch {
        return false;
    }
};

const clean = (text) => String(text).replace(/[;&=]/g, " ").trim();

export const buildBuyLink = (order, user) => {
    // Catalog mode: every product has a code created in the 2Checkout panel -> link by code.
    // Otherwise dynamic mode: the product name and price travel inside the (signed) link.
    const catalog = order.items.every((i) => i.checkoutCode);

    const params = {
        merchant: process.env.TWOCHECKOUT_MERCHANT_CODE,
        currency: order.currency,
        ...(catalog
            ? {
                prod: order.items.map((i) => i.checkoutCode).join(";"),
                qty: order.items.map((i) => i.quantity).join(";")
            }
            : {
                dynamic: "1",
                prod: order.items.map((i) => clean(i.name)).join(";"),
                price: order.items.map((i) => i.price.toFixed(2)).join(";"),
                qty: order.items.map((i) => i.quantity).join(";"),
                type: order.items.map(() => "PRODUCT").join(";"),
                tangible: "1" // a single boolean for the whole cart: physical delivery
            }),
        "order-ext-ref": order._id.toString(),
        "customer-ext-ref": user._id.toString(),
        email: user.email
    };

    if (isPublicUrl(process.env.PAYMENT_RETURN_URL)) {
        params["return-url"] = process.env.PAYMENT_RETURN_URL;
        params["return-type"] = "redirect";
    }

    if (process.env.TWOCHECKOUT_TEST_MODE !== "false") {
        params.test = "1";
    }

    params.signature = signBuyLinkParams(params, buyLinkSecret());

    // %20 (not "+") for spaces so the value 2Checkout decodes is exactly the value that was signed
    const query = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");

    return `${CHECKOUT_URL}?${query}`;
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
