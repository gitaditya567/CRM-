// 💬 WhatsApp Business — Meta Cloud API
// Required .env:
//   WHATSAPP_ACCESS_TOKEN       Permanent System User token (WhatsApp Business Management + Messaging)
//   WHATSAPP_PHONE_NUMBER_ID    Phone number ID from Meta App → WhatsApp → API Setup
// Optional .env:
//   WHATSAPP_TEMPLATE_NAME      Approved template for dispatch messages (recommended, see below)
//   WHATSAPP_TEMPLATE_LANG      Template language code (default "en")
//   WHATSAPP_API_VERSION        Graph API version (default "v21.0")
//   WHATSAPP_WEBHOOK_VERIFY_TOKEN  Any secret string — also entered in Meta webhook settings
//   WHATSAPP_APP_SECRET         Meta App secret — used to verify webhook signatures
//
// Template mode: business-initiated messages MUST use an approved template. Its body must have
// exactly these 6 variables, in order:
//   {{1}} Client name   {{2}} PO number   {{3}} Transporter   {{4}} Tracking / AWB no
//   {{5}} Dispatch date {{6}} Dispatched items (single line)
// Without a template, free text is sent — Meta only delivers that if the client messaged
// your number in the last 24 hours, otherwise the status turns "failed" (error 131047).

const crypto = require("crypto");

const getConfig = () => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "";
    return {
        enabled: Boolean(accessToken && phoneNumberId),
        accessToken,
        phoneNumberId,
        templateName,
        templateLang: process.env.WHATSAPP_TEMPLATE_LANG || "en",
        apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
        mode: templateName ? "template" : "text"
    };
};

// Template variables cannot contain new lines, tabs or more than 4 consecutive spaces
const cleanTemplateParam = (value, maxLen = 900) => {
    const text = String(value ?? "").replace(/[\r\n\t]+/g, " | ").replace(/ {2,}/g, " ").trim() || "-";
    return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
};

const normalizePhone = (phone) => {
    let digits = String(phone || "").replace(/[^0-9]/g, "");
    if (digits.length === 10) digits = "91" + digits;
    return digits;
};

// Returns { ok: true, messageId } or { ok: false, error }
const sendMessage = async ({ to, text, templateParams }) => {
    const cfg = getConfig();
    if (!cfg.enabled) {
        return { ok: false, error: "WhatsApp API not configured (set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend/.env)" };
    }

    const payload = { messaging_product: "whatsapp", recipient_type: "individual", to: normalizePhone(to) };
    if (cfg.mode === "template") {
        payload.type = "template";
        payload.template = {
            name: cfg.templateName,
            language: { code: cfg.templateLang },
            components: [{
                type: "body",
                parameters: (templateParams || []).map(p => ({ type: "text", text: cleanTemplateParam(p) }))
            }]
        };
    } else {
        payload.type = "text";
        payload.text = { preview_url: true, body: String(text || "").slice(0, 4096) };
    }

    try {
        const res = await fetch(`https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(20000)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const e = data.error || {};
            const detail = e.error_data?.details ? ` — ${e.error_data.details}` : "";
            return { ok: false, error: `${e.message || `HTTP ${res.status}`}${e.code ? ` (code ${e.code})` : ""}${detail}` };
        }
        return { ok: true, messageId: data.messages?.[0]?.id || "" };
    } catch (err) {
        return { ok: false, error: err.name === "TimeoutError" ? "WhatsApp API timed out" : err.message };
    }
};

// Verify X-Hub-Signature-256 of incoming webhook (skipped with a warning if no app secret is set)
const verifyWebhookSignature = (rawBody, signatureHeader) => {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret) {
        console.warn("[WhatsApp] WHATSAPP_APP_SECRET not set — webhook signature NOT verified");
        return true;
    }
    if (!rawBody || !signatureHeader) return false;
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signatureHeader));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = { getConfig, sendMessage, verifyWebhookSignature, normalizePhone };
