const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const CommunicationLog = require("../models/CommunicationLog");
const PurchaseOrder = require("../models/PurchaseOrder");
const Setting = require("../models/Setting");
const Client = require("../models/Client");
const whatsapp = require("../services/whatsappService");

// Status can only move forward (a late "delivered" must not overwrite "read"); "failed" always wins
const STATUS_RANK = { queued: 0, sent: 1, delivered: 2, read: 3 };

const emitUpdate = (req, log) => {
    const io = req.app.get("io");
    if (io) {
        io.emit("communicationStatusUpdated", {
            _id: log._id, po: log.po, channel: log.channel, status: log.status,
            error: log.error, updatedAt: log.updatedAt
        });
    }
};

const setStatus = async (log, status, error = "") => {
    log.status = status;
    log.error = error;
    log.statusHistory.push({ status, at: new Date(), error: error || undefined });
    await log.save();
    return log;
};

// ---------- Email (SMTP) ----------
const sendSmtp = async ({ to, cc, subject, html }) => {
    const smtpHost = process.env.SMTP_HOST || "mail.teaminspire.co.in";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
    const smtpUser = process.env.SMTP_USER || "dispatch@teaminspire.co.in";
    const smtpPass = process.env.SMTP_PASS;
    if (!smtpPass) {
        return { ok: false, error: "SMTP Password not configured in server .env file. Please set SMTP_PASS in backend/.env." };
    }
    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
            tls: { rejectUnauthorized: false }
        });
        const info = await transporter.sendMail({
            from: `"Dispatch TeamInspire" <${smtpUser}>`,
            to,
            cc: cc || undefined,
            subject,
            html
        });
        // Some servers accept the message but reject individual recipients
        if (info.rejected && info.rejected.length > 0 && (!info.accepted || info.accepted.length === 0)) {
            return { ok: false, error: `Recipient rejected by mail server: ${info.rejected.join(", ")}` };
        }
        return { ok: true, messageId: info.messageId || "" };
    } catch (err) {
        return { ok: false, error: err.message || "Failed to send email via SMTP" };
    }
};

const createLog = (req, fields) => new CommunicationLog({
    ...fields,
    statusHistory: [{ status: "queued", at: new Date() }],
    sentBy: req.user?._id || null,
    sentByName: req.user?.name || ""
});

const resolvePO = async (poId) => {
    if (!poId || !mongoose.Types.ObjectId.isValid(poId)) return null;
    return PurchaseOrder.findById(poId).select("poNumber vendorName shipper dispatchHistory").lean();
};

const deliverEmail = async (req, log) => {
    const result = await sendSmtp({ to: log.recipient, cc: log.cc, subject: log.subject, html: log.body });
    if (result.ok) {
        log.providerMessageId = result.messageId;
        await setStatus(log, "sent");
    } else {
        await setStatus(log, "failed", result.error);
    }
    emitUpdate(req, log);
    return result;
};

// POST /api/purchase-orders/send-email   (kept for compatibility)
// POST /api/communications/email/send
exports.sendEmail = async (req, res) => {
    try {
        const { to, cc, subject, htmlBody, poId, dispatchId } = req.body;
        if (!to || !subject || !htmlBody) {
            return res.status(400).json({ success: false, message: "To email, Subject, and Body are required." });
        }

        const po = await resolvePO(poId);
        const log = createLog(req, {
            po: po?._id || null,
            poNumber: po?.poNumber || "",
            dispatchId: mongoose.Types.ObjectId.isValid(dispatchId) ? dispatchId : null,
            channel: "email",
            recipient: to,
            cc: cc || "",
            subject,
            body: htmlBody
        });
        await log.save();

        const result = await deliverEmail(req, log);
        if (!result.ok) {
            return res.status(502).json({ success: false, message: result.error, log });
        }
        res.status(200).json({ success: true, message: "Email sent successfully!", messageId: result.messageId, log });
    } catch (err) {
        console.error("Send Email Error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to send email" });
    }
};

// ---------- WhatsApp (Meta Cloud API) ----------
const formatDate = (d) => {
    const date = d ? new Date(d) : null;
    return date && !isNaN(date.getTime()) ? date.toLocaleDateString("en-GB") : "N/A";
};

// Template variables {{1}}..{{6}} — see services/whatsappService.js
const buildTemplateParams = (po, dispatch) => {
    const clientName = po?.vendorName || po?.shipper?.billingName || po?.shipper?.consigneeName || "Valued Client";
    const items = (dispatch?.products || [])
        .map((p, i) => `${i + 1}. ${[p.brand, p.productNo].filter(Boolean).join(" ")} x ${p.quantity || 1}`)
        .join("; ");
    return [
        clientName,
        po?.poNumber || "N/A",
        dispatch?.courierName || "N/A",
        dispatch?.trackingNo || "N/A",
        formatDate(dispatch?.dispatchDate),
        items || "As per invoice"
    ];
};

const deliverWhatsApp = async (req, log) => {
    const result = await whatsapp.sendMessage({ to: log.recipient, text: log.body, templateParams: log.templateParams });
    if (result.ok) {
        log.providerMessageId = result.messageId;
        await setStatus(log, "sent");
    } else {
        await setStatus(log, "failed", result.error);
    }
    emitUpdate(req, log);
    return result;
};

// GET /api/communications/whatsapp/config
exports.getWhatsAppConfig = (req, res) => {
    const cfg = whatsapp.getConfig();
    res.json({ enabled: cfg.enabled, mode: cfg.mode, templateName: cfg.templateName, templateLang: cfg.templateLang });
};

// POST /api/communications/whatsapp/send
exports.sendWhatsApp = async (req, res) => {
    try {
        const { to, message, poId, dispatchId } = req.body;
        const phone = whatsapp.normalizePhone(to);
        if (phone.length < 11) {
            return res.status(400).json({ success: false, message: "Valid mobile number with country code is required (e.g. 919876543210)." });
        }

        const cfg = whatsapp.getConfig();
        const po = await resolvePO(poId);
        const dispatch = (po?.dispatchHistory || []).find(d => String(d._id) === String(dispatchId))
            || (po?.dispatchHistory || []).slice(-1)[0];

        if (cfg.mode === "text" && !String(message || "").trim()) {
            return res.status(400).json({ success: false, message: "Message text is required." });
        }

        const log = createLog(req, {
            po: po?._id || null,
            poNumber: po?.poNumber || "",
            dispatchId: dispatch?._id || null,
            channel: "whatsapp",
            recipient: phone,
            body: String(message || ""),
            templateName: cfg.mode === "template" ? cfg.templateName : "",
            templateParams: cfg.mode === "template" ? buildTemplateParams(po, dispatch) : []
        });
        await log.save();

        const result = await deliverWhatsApp(req, log);
        if (!result.ok) {
            return res.status(502).json({ success: false, message: result.error, log });
        }
        res.status(200).json({ success: true, message: "WhatsApp message sent!", log });
    } catch (err) {
        console.error("Send WhatsApp Error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to send WhatsApp message" });
    }
};

// ---------- Status / history ----------
// GET /api/communications/latest  → { [poId]: { email: log, whatsapp: log } }
exports.getLatestStatuses = async (req, res) => {
    try {
        const rows = await CommunicationLog.aggregate([
            { $match: { po: { $ne: null } } },
            { $sort: { createdAt: -1 } },
            { $group: {
                _id: { po: "$po", channel: "$channel" },
                log: { $first: { _id: "$_id", status: "$status", error: "$error", recipient: "$recipient", createdAt: "$createdAt", updatedAt: "$updatedAt" } },
                attempts: { $sum: 1 }
            } }
        ]);
        const map = {};
        rows.forEach(r => {
            const poId = String(r._id.po);
            map[poId] = map[poId] || {};
            map[poId][r._id.channel] = { ...r.log, attempts: r.attempts };
        });
        res.json(map);
    } catch (err) {
        console.error("Get Latest Communication Statuses Error:", err);
        res.status(500).json({ message: "Failed to load message statuses" });
    }
};

// GET /api/communications/po/:poId
exports.getPOLogs = async (req, res) => {
    try {
        const logs = await CommunicationLog.find({ po: req.params.poId })
            .select("-body")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        res.json(logs);
    } catch (err) {
        console.error("Get PO Communication Logs Error:", err);
        res.status(500).json({ message: "Failed to load message history" });
    }
};

// POST /api/communications/:logId/retry
exports.retry = async (req, res) => {
    try {
        const original = await CommunicationLog.findById(req.params.logId).lean();
        if (!original) return res.status(404).json({ success: false, message: "Message not found" });

        const cfg = whatsapp.getConfig();
        const fields = {
            po: original.po,
            poNumber: original.poNumber,
            dispatchId: original.dispatchId,
            channel: original.channel,
            recipient: original.recipient,
            cc: original.cc,
            subject: original.subject,
            body: original.body,
            retryOf: original._id
        };
        if (original.channel === "whatsapp") {
            // Re-evaluate template mode in case config changed since the original attempt
            const po = original.po ? await resolvePO(original.po) : null;
            const dispatch = (po?.dispatchHistory || []).find(d => String(d._id) === String(original.dispatchId))
                || (po?.dispatchHistory || []).slice(-1)[0];
            fields.templateName = cfg.mode === "template" ? cfg.templateName : "";
            fields.templateParams = cfg.mode === "template"
                ? (original.templateParams?.length ? original.templateParams : buildTemplateParams(po, dispatch))
                : [];
        }

        const log = createLog(req, fields);
        await log.save();
        const result = original.channel === "email" ? await deliverEmail(req, log) : await deliverWhatsApp(req, log);
        if (!result.ok) return res.status(502).json({ success: false, message: result.error, log });
        res.json({ success: true, message: "Message re-sent!", log });
    } catch (err) {
        console.error("Retry Communication Error:", err);
        res.status(500).json({ success: false, message: err.message || "Retry failed" });
    }
};

// ---------- Auto-notify on dispatch ----------

const getCommSettings = async () => {
    const doc = await Setting.findOne({ key: "global_ui_settings" }).select("communications").lean();
    return {
        autoDispatchEmail: doc?.communications?.autoDispatchEmail ?? true,
        autoDispatchWhatsApp: doc?.communications?.autoDispatchWhatsApp ?? false
    };
};

// GET /api/communications/settings
exports.getSettings = async (req, res) => {
    try {
        const settings = await getCommSettings();
        res.json({ ...settings, whatsappEnabled: whatsapp.getConfig().enabled });
    } catch (err) {
        res.status(500).json({ message: "Failed to load communication settings" });
    }
};

// PUT /api/communications/settings   (admin / superadmin)
exports.updateSettings = async (req, res) => {
    try {
        const role = String(req.user?.role || "").toLowerCase();
        if (role !== "admin" && role !== "superadmin") {
            return res.status(403).json({ message: "Only admins can change auto-send settings" });
        }
        const $set = {};
        ["autoDispatchEmail", "autoDispatchWhatsApp"].forEach(k => {
            if (typeof req.body?.[k] === "boolean") $set[`communications.${k}`] = req.body[k];
        });
        await Setting.findOneAndUpdate({ key: "global_ui_settings" }, { $set }, { upsert: true });
        res.json(await getCommSettings());
    } catch (err) {
        console.error("Update Communication Settings Error:", err);
        res.status(500).json({ message: "Failed to update communication settings" });
    }
};

const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCarrierTrackingLink = (courierName) => {
    const name = String(courierName || "").trim().toLowerCase();
    if (!name) return null;
    if (name.includes("bluedart") || name.includes("blue dart")) return "https://bluedart.com/tracking";
    if (name.includes("safexpress") || name.includes("safe express")) return "https://www.safexpress.com/";
    if (name.includes("dtdc")) return "https://www.dtdc.com/track-your-shipment/";
    if (name.includes("trackon")) return "https://www.trackon.in/home/track";
    return null;
};

// Same client lookup as GET /purchase-orders (Client contact person → shipper → lead)
const resolveClientContact = async (po) => {
    let email = "";
    let phone = "";
    const name = String(po.vendorName || "").trim();
    if (name) {
        const rx = new RegExp(`^${escapeRegex(name)}$`, "i");
        const client = await Client.findOne({ $or: [{ clientName: rx }, { legalEntityName: rx }] })
            .select("contactPerson1 contactPerson2").lean();
        if (client) {
            email = client.contactPerson1?.email || client.contactPerson2?.email || "";
            phone = client.contactPerson1?.phone || client.contactPerson2?.phone || "";
        }
    }
    return {
        email: email || po.shipper?.email || po.pi?.lead?.email || "",
        phone: phone || po.shipper?.contactNo || po.pi?.lead?.phone || ""
    };
};

// Server-side version of the Dispatch Email layout used in POManagement email modal
const buildDispatchEmailHtml = (po, dispatch) => {
    const cell = "border:1.5px solid #000000;padding:8px 6px;";
    const rows = (dispatch.products || []).map((p, i) => {
        const ordered = (po.products || []).find(op => op.productNo && op.productNo === p.productNo)?.quantity ?? p.quantity ?? 0;
        return `<tr>
            <td style="${cell}text-align:center;font-weight:bold">${i + 1}</td>
            <td style="${cell}">${escapeHtml(p.brand || "N/A")}</td>
            <td style="${cell}font-weight:bold;color:#1d4ed8">${escapeHtml(p.productNo || "N/A")}</td>
            <td style="${cell}">${escapeHtml(p.name || "N/A")}</td>
            <td style="${cell}text-align:center">Pcs</td>
            <td style="${cell}text-align:center;font-weight:bold">${escapeHtml(ordered)}</td>
            <td style="${cell}text-align:center;font-weight:bold;color:#047857">${escapeHtml(p.quantity || 0)}</td>
        </tr>`;
    }).join("");
    const th = (label, align = "left") => `<th style="${cell}text-align:${align};font-weight:bold;color:#000000">${label}</th>`;
    const trackingUrl = getCarrierTrackingLink(dispatch.courierName);

    return `<div style="font-family:Arial,sans-serif;font-size:13px;color:#1f2937;line-height:1.5">
        <p style="font-weight:bold;font-size:14px">Dear Sir/Madam,</p>
        <p style="font-weight:800;font-size:14px;color:#dc2626">Greetings from TeamInspire !!!</p>
        <p>Good news! Your order${po.poNumber ? ` against PO <b>#${escapeHtml(po.poNumber)}</b>` : ""} has been shipped and is on its way. Here are your dispatch details:</p>
        <table style="width:100%;border-collapse:collapse;border:1.5px solid #000000;font-family:Arial,sans-serif;font-size:12px;margin:12px 0">
            <thead style="background-color:#f3f4f6"><tr>
                ${th("Sl.No.", "center")}${th("Brand")}${th("Model No/Part Code")}${th("Description")}${th("UOM", "center")}${th("Qty Ordered", "center")}${th("Qty Delivered", "center")}
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin:12px 0">
            <p style="margin:4px 0"><b>Transport Mode:</b> ${escapeHtml(dispatch.transportMode || "Road")}</p>
            <p style="margin:4px 0"><b>Transporter Name:</b> ${escapeHtml(dispatch.courierName || "N/A")}</p>
            <p style="margin:4px 0"><b>Tracking Number:</b> <span style="font-family:monospace;font-weight:bold;color:#1d4ed8">${escapeHtml(dispatch.trackingNo || "N/A")}</span></p>
            <p style="margin:4px 0"><b>Tracking Link:</b> ${trackingUrl ? `<a href="${trackingUrl}" style="color:#2563eb;font-weight:bold">${trackingUrl}</a>` : "N/A"}</p>
            <p style="margin:4px 0"><b>Dispatch Date:</b> ${formatDate(dispatch.dispatchDate)}</p>
        </div>
        <p>If you have any questions or if there's anything else we can assist you with, please don't hesitate to reach out to our customer support team at <a href="mailto:cc@teaminspire.co.in" style="color:#2563eb">cc@teaminspire.co.in</a></p>
        <p>Thank you for choosing TeamInspire. We appreciate your patience, and we hope you enjoy your purchase!</p>
        <p style="margin-top:16px"><b>Best regards,</b><br/><b style="color:#2563eb">TeamInspire Business Solutions Pvt Ltd</b></p>
        <p style="font-size:11px;color:#9ca3af;font-style:italic;border-top:1px solid #f3f4f6;padding-top:8px">Please note: This e-mail was sent from a notification-only address that cannot accept incoming e-mail. Please do not reply to this message.</p>
    </div>`;
};

// Called by poController.updatePO after a NEW dispatch entry is saved (fire-and-forget).
// Every attempt is logged — a missing client email/phone is logged as "failed" so it shows in the UI.
exports.autoNotifyDispatch = async (req, poId, dispatchIds) => {
    try {
        const settings = await getCommSettings();
        const waCfg = whatsapp.getConfig();
        const doEmail = settings.autoDispatchEmail;
        const doWhatsApp = settings.autoDispatchWhatsApp && waCfg.enabled;
        if (!doEmail && !doWhatsApp) return;

        const po = await PurchaseOrder.findById(poId)
            .populate({ path: "pi", populate: { path: "lead", select: "email phone" } })
            .populate("shipper")
            .lean();
        if (!po) return;
        const contact = await resolveClientContact(po);

        for (const dispatchId of dispatchIds) {
            const dispatch = (po.dispatchHistory || []).find(d => String(d._id) === String(dispatchId));
            if (!dispatch) continue;
            const base = { po: po._id, poNumber: po.poNumber, dispatchId: dispatch._id };

            if (doEmail) {
                const log = createLog(req, {
                    ...base,
                    channel: "email",
                    recipient: contact.email || "(no client email on file)",
                    subject: `Dispatch Details & Tracking - PO #${po.poNumber || "N/A"}`,
                    body: buildDispatchEmailHtml(po, dispatch)
                });
                log.sentByName = `${log.sentByName || "System"} (auto)`;
                await log.save();
                if (contact.email) {
                    await deliverEmail(req, log);
                } else {
                    await setStatus(log, "failed", `Auto email skipped: no email found for client "${po.vendorName || "-"}". Add it in Clients → Contact Person, then use Retry or the Email button.`);
                    emitUpdate(req, log);
                }
            }

            if (doWhatsApp) {
                const phone = whatsapp.normalizePhone(contact.phone);
                const log = createLog(req, {
                    ...base,
                    channel: "whatsapp",
                    recipient: phone || "(no client phone on file)",
                    body: `Your order under PO #${po.poNumber} has been dispatched via ${dispatch.courierName || "N/A"} (Tracking: ${dispatch.trackingNo || "N/A"}) on ${formatDate(dispatch.dispatchDate)}. Thank you for choosing Team Inspire!`,
                    templateName: waCfg.mode === "template" ? waCfg.templateName : "",
                    templateParams: waCfg.mode === "template" ? buildTemplateParams(po, dispatch) : []
                });
                log.sentByName = `${log.sentByName || "System"} (auto)`;
                await log.save();
                if (phone.length >= 11) {
                    await deliverWhatsApp(req, log);
                } else {
                    await setStatus(log, "failed", `Auto WhatsApp skipped: no valid mobile number found for client "${po.vendorName || "-"}".`);
                    emitUpdate(req, log);
                }
            }
        }
    } catch (err) {
        console.error("Auto Dispatch Notification Error:", err);
    }
};

// ---------- Meta webhook ----------
// GET /api/communications/whatsapp/webhook  (Meta verification handshake)
exports.verifyWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (mode === "subscribe" && expected && token === expected) {
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
};

// POST /api/communications/whatsapp/webhook  (status updates: sent / delivered / read / failed)
exports.receiveWebhook = async (req, res) => {
    if (!whatsapp.verifyWebhookSignature(req.rawBody, req.get("x-hub-signature-256"))) {
        return res.sendStatus(401);
    }
    res.sendStatus(200); // Acknowledge immediately — Meta retries slow responses

    try {
        const statuses = (req.body?.entry || [])
            .flatMap(e => e.changes || [])
            .flatMap(c => c.value?.statuses || []);

        for (const s of statuses) {
            const log = await CommunicationLog.findOne({ providerMessageId: s.id, channel: "whatsapp" });
            if (!log) continue;

            const newStatus = s.status;
            if (!["sent", "delivered", "read", "failed"].includes(newStatus)) continue;
            if (log.status === "failed") continue;
            if (newStatus !== "failed" && (STATUS_RANK[newStatus] ?? 0) <= (STATUS_RANK[log.status] ?? 0)) continue;

            const errObj = (s.errors || [])[0];
            const error = errObj
                ? `${errObj.title || errObj.message || "Delivery failed"}${errObj.code ? ` (code ${errObj.code})` : ""}${errObj.error_data?.details ? ` — ${errObj.error_data.details}` : ""}`
                : "";
            await setStatus(log, newStatus, error);
            emitUpdate(req, log);
        }
    } catch (err) {
        console.error("WhatsApp Webhook Processing Error:", err);
    }
};
