// 🧾 Expense Claim PDF (A4) — approved / paid claims
// Uses the built-in Helvetica fonts (no ₹ glyph), so amounts are printed as "Rs. 1,234.00"
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const COMPANY = {
    name: "TeamInspire Business Solutions Pvt Ltd",
    address: "D730/29, Street No. 11, Ashok Nagar, Shahdara, Delhi, 110093, India",
    email: "E: deepak.gupta@teaminspire.co.in, spares@teaminspire.co.in",
    phone: "Contact No. +91 9013589766, +91 9560825111",
    gstin: "GSTIN: 07AAFCT5822P1ZT"
};
const LOGO = path.join(__dirname, "..", "..", "frontend", "public", "logo.png");
const STAMP = path.join(__dirname, "..", "assets", "stamp.png");

const BRAND = "#1a237e";
const HEAD_BG = "#eef2ff";

// Colour + watermark per claim status
const THEMES = {
    "Approved": { wm: "APPROVED", color: "#15803d", bg: "#dcfce7" },
    "Paid": { wm: "PAID", color: "#15803d", bg: "#dcfce7" },
    "Partially Approved": { wm: "PARTIALLY APPROVED", color: "#0f766e", bg: "#ccfbf1" },
    "Pending Approval": { wm: "PENDING APPROVAL", color: "#c2410c", bg: "#ffedd5" },
    "Rejected": { wm: "REJECTED", color: "#b91c1c", bg: "#fee2e2" },
    "Draft": { wm: "DRAFT", color: "#6b7280", bg: "#f3f4f6" },
};
const themeFor = (status) => THEMES[status] || { wm: String(status || "").toUpperCase(), color: "#1a237e", bg: "#eef2ff" };
const MUTED = "#6b7280";
const LINE = "#d1d5db";
const STATUS_COLOR = { Approved: "#1d4ed8", Paid: "#047857", Rejected: "#b91c1c", Submitted: "#b45309", Draft: "#6b7280" };

const money = (n) => `Rs. ${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Always print Indian time — the server may run in UTC
const TZ = "Asia/Kolkata";
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ }) : "-");
const fmtDateTime = (d) => (d ? `${new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ })} IST` : "-");
const rowDate = (x) => (x.endDate ? `${fmtDate(x.date)} to ${fmtDate(x.endDate)}` : fmtDate(x.date));

// Indian numbering words: 1,23,45,678.50 → "One Crore Twenty Three Lakh ... and Fifty Paise Only"
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
    "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const twoDigits = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`);
const threeDigits = (n) => {
    const h = Math.floor(n / 100), r = n % 100;
    return [h ? `${ONES[h]} Hundred` : "", r ? twoDigits(r) : ""].filter(Boolean).join(" ");
};
const amountInWords = (amount) => {
    const total = Math.round((Number(amount) || 0) * 100);
    let rupees = Math.floor(total / 100);
    const paise = total % 100;
    if (rupees === 0 && paise === 0) return "Indian Rupees Zero Only";
    const parts = [];
    const crore = Math.floor(rupees / 10000000); rupees %= 10000000;
    const lakh = Math.floor(rupees / 100000); rupees %= 100000;
    const thousand = Math.floor(rupees / 1000); rupees %= 1000;
    if (crore) parts.push(`${threeDigits(crore)} Crore`);
    if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
    if (rupees) parts.push(threeDigits(rupees));
    let words = parts.length ? `Indian Rupees ${parts.join(" ")}` : "Indian Rupees Zero";
    if (paise) words += ` and ${twoDigits(paise)} Paise`;
    return `${words} Only`;
};

/**
 * Stream an expense-claim PDF.
 * @param {object} claim  { claimNumber, status, staffName, staffRole, tour, items, totals, approvedBy, approvedAt, paidAt, submittedAt }
 * @param {Writable} out  response stream
 */
const buildClaimPdf = (claim, out) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 30, bottom: 50, left: 30, right: 30 }, bufferPages: true, info: {
        Title: `Expense Claim ${claim.claimNumber}`, Author: COMPANY.name, Subject: `Expense claim of ${claim.staffName}`
    } });
    doc.pipe(out);

    const L = 30, W = 535, R = L + W;
    const bottomLimit = () => doc.page.height - 70;

    // ---------- status-coloured diagonal watermark behind every page ----------
    const theme = themeFor(claim.status);
    const WM_TEXT = theme.wm;
    const ACCENT = theme.color;     // accent colour of the current status
    const ACCENT_BG = theme.bg;
    const isFinalApproval = ["Approved", "Paid", "Partially Approved"].includes(claim.status) && !(claim.totals?.pending > 0);
    const drawWatermark = () => {
        const { width, height } = doc.page;
        const keep = { x: doc.x, y: doc.y };
        const diagonal = Math.hypot(width, height);
        let size = 120;
        doc.font("Helvetica-Bold").fontSize(size);
        while (size > 30 && doc.widthOfString(WM_TEXT) > diagonal * 0.72) { size -= 4; doc.fontSize(size); }
        const tw = doc.widthOfString(WM_TEXT);
        doc.save();
        doc.rotate(-35, { origin: [width / 2, height / 2] });
        doc.fillColor(ACCENT).fillOpacity(0.11)
            .text(WM_TEXT, width / 2 - tw / 2, height / 2 - size * 0.36, { lineBreak: false });
        // thin outline gives the mark a crisp, stamped edge
        doc.lineWidth(1.2).strokeColor(ACCENT).strokeOpacity(0.2)
            .text(WM_TEXT, width / 2 - tw / 2, height / 2 - size * 0.36, { lineBreak: false, stroke: true, fill: false });
        doc.restore();
        doc.x = keep.x; doc.y = keep.y;
    };
    drawWatermark();
    doc.on("pageAdded", drawWatermark);

    // ---------- header (first page) ----------
    doc.rect(L, 20, W, 72).lineWidth(0.8).strokeColor("#000").stroke();
    doc.fillColor(BRAND).font("Helvetica-Bold").fontSize(14).text(COMPANY.name, L + 6, 30, { width: 330 });
    doc.fillColor("#000").font("Helvetica").fontSize(8)
        .text(COMPANY.address, L + 6, 49, { width: 330 })
        .text(COMPANY.email, L + 6, 59, { width: 330 })
        .text(COMPANY.phone, L + 6, 69, { width: 330 });
    doc.font("Helvetica-Bold").text(COMPANY.gstin, L + 6, 79);
    doc.moveTo(370, 20).lineTo(370, 92).stroke();
    if (fs.existsSync(LOGO)) {
        try { doc.image(LOGO, 380, 27, { fit: [175, 58], align: "center", valign: "center" }); } catch { /* ignore broken logo */ }
    }

    // ---------- title band ----------
    const titleText = `EXPENSE CLAIM — ${String(claim.status).toUpperCase()}`;
    doc.rect(L, 100, W, 24).fill(BRAND);
    doc.fillColor("#fff").font("Helvetica-Bold").fontSize(12).text(titleText, L, 107, { width: W, align: "center" });

    // ---------- claim info (two columns) ----------
    const infoTop = 134;
    const left = [
        ["Claim No.", claim.claimNumber],
        ["Employee", claim.staffName],
        ["Designation / Role", claim.staffRole || "-"],
        ["Trip", claim.tour ? `${claim.tour.tourNumber} - ${claim.tour.title}` : "No trip (office / local expenses)"],
        ...(claim.tour ? [["Trip Period", `${fmtDate(claim.tour.startDate)} to ${fmtDate(claim.tour.endDate)}`]] : []),
        ["Expense Period", claim.periodFrom ? `${fmtDate(claim.periodFrom)} to ${fmtDate(claim.periodTo)}` : "-"],
    ];
    const right = [
        ["Claim Status", claim.status],
        ["Submitted On", fmtDateTime(claim.submittedAt)],
        ...(claim.status === "Rejected"
            ? [["Rejected By", claim.rejectedBy || "-"], ["Rejected On", fmtDateTime(claim.rejectedAt)]]
            : [["Approved By", claim.approvedBy || "-"], ["Approved On", fmtDateTime(claim.approvedAt)]]),
        ...(claim.paidAt ? [["Paid On", fmtDateTime(claim.paidAt)]] : []),
        ["Expense Rows", `${claim.items.length}`],
    ];
    const drawInfo = (pairs, x, labelW, valueW) => {
        let y = infoTop + 6;
        pairs.forEach(([k, v]) => {
            doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text(k, x, y, { width: labelW });
            doc.font("Helvetica").fontSize(8.5).fillColor("#000");
            const h = doc.heightOfString(String(v), { width: valueW });
            doc.text(String(v), x + labelW, y, { width: valueW });
            y += Math.max(h, 10) + 4;
        });
        return y;
    };
    const yL = drawInfo(left, L + 8, 88, 170);
    const yR = drawInfo(right, 320, 75, 170);
    const infoBottom = Math.max(yL, yR) + 4;
    doc.rect(L, infoTop, W, infoBottom - infoTop).lineWidth(0.6).strokeColor(LINE).stroke();
    doc.moveTo(310, infoTop).lineTo(310, infoBottom).stroke();

    // ---------- expense table ----------
    const cols = [
        { key: "no", label: "#", w: 20, align: "center" },
        { key: "date", label: "Date", w: 66 },
        { key: "category", label: "Category", w: 64 },
        { key: "place", label: "Place", w: 58 },
        { key: "description", label: "Description", w: 109 },
        { key: "mode", label: "Mode", w: 44 },
        { key: "bill", label: "Bill No.", w: 66 },
        { key: "status", label: "Status", w: 50 },
        { key: "amount", label: "Amount", w: 58, align: "right" },
    ];
    const PAD = 3;
    let y = infoBottom + 12;

    const drawTableHeader = () => {
        doc.rect(L, y, W, 18).fill("#eef2ff");
        let x = L;
        doc.fillColor(BRAND).font("Helvetica-Bold").fontSize(8);
        cols.forEach(c => { doc.text(c.label, x + PAD, y + 5, { width: c.w - PAD * 2, align: c.align || "left" }); x += c.w; });
        doc.rect(L, y, W, 18).lineWidth(0.6).strokeColor(LINE).stroke();
        y += 18;
    };

    const cellText = (x, i) => {
        const billInfo = [x.billNo, x.attachments?.length ? `${x.attachments.length} file(s)` : ""].filter(Boolean).join("\n") || "-";
        return {
            no: String(i + 1),
            date: rowDate(x),
            category: x.category,
            place: x.place || "-",
            description: (x.description || "-") + (x.status === "Rejected" && x.rejectionReason ? `\nRejected: ${x.rejectionReason}` : ""),
            mode: x.paymentMode || "-",
            bill: billInfo,
            status: x.status,
            amount: money(x.amount),
        };
    };

    drawTableHeader();
    claim.items.forEach((x, i) => {
        const cells = cellText(x, i);
        doc.font("Helvetica").fontSize(8);
        const h = Math.max(...cols.map(c => doc.heightOfString(cells[c.key], { width: c.w - PAD * 2 }))) + PAD * 2 + 2;
        if (y + h > bottomLimit()) {
            doc.addPage();
            y = 30;
            drawTableHeader();
        }
        if (i % 2 === 1) doc.rect(L, y, W, h).fill("#fafafa");
        let cx = L;
        cols.forEach(c => {
            const rejected = x.status === "Rejected";
            const color = c.key === "status" ? (STATUS_COLOR[x.status] || "#000") : (rejected && c.key === "amount" ? MUTED : "#000");
            doc.fillColor(color).font(c.key === "amount" || c.key === "status" ? "Helvetica-Bold" : "Helvetica").fontSize(8)
                .text(cells[c.key], cx + PAD, y + PAD + 1, { width: c.w - PAD * 2, align: c.align || "left" });
            if (rejected && c.key === "amount") {
                const tw = Math.min(doc.widthOfString(cells.amount), c.w - PAD * 2);
                const ly = y + PAD + 5;
                doc.moveTo(cx + c.w - PAD - tw, ly).lineTo(cx + c.w - PAD, ly).lineWidth(0.6).strokeColor(MUTED).stroke();
            }
            cx += c.w;
        });
        // grid
        doc.lineWidth(0.4).strokeColor(LINE);
        doc.rect(L, y, W, h).stroke();
        let gx = L;
        cols.slice(0, -1).forEach(c => { gx += c.w; doc.moveTo(gx, y).lineTo(gx, y + h).stroke(); });
        y += h;
    });

    // ---------- settlement summary ----------
    const t = claim.totals;
    const catRows = t.byCategory;
    const balance = Math.round((t.approved - t.paid) * 100) / 100;
    const undecided = ["Pending Approval", "Draft"].includes(claim.status) || t.pending > 0;
    const netLabel = undecided ? "Approved so far" : "Net Approved";
    const amountRows = [
        { k: "Total Claimed", v: money(t.claimed) },
        ...(t.rejected > 0 ? [{ k: "Less: Rejected", v: `(-) ${money(t.rejected)}`, color: "#b91c1c" }] : []),
        ...(t.pending > 0 ? [{ k: claim.status === "Draft" ? "Not yet submitted" : "Pending Approval", v: money(t.pending), color: "#c2410c" }] : []),
        { k: netLabel, v: money(t.approved), net: true },
        ...(t.paid > 0 ? [{ k: "Paid to Employee", v: money(t.paid) }] : []),
        ...(t.paid > 0 && balance > 0.004 ? [{ k: "Balance Payable", v: money(balance), bold: true }] : []),
    ];
    const CAT_ROW = 15, AMT_ROW = 19;
    const leftH = 16 + Math.max(catRows.length, 1) * CAT_ROW + 17;
    const rightH = amountRows.length * AMT_ROW;
    const wordsText = amountInWords(t.approved);
    doc.font("Helvetica-Bold").fontSize(9);
    const wordsH = doc.heightOfString(wordsText, { width: W - 16 }) + 22;
    const needed = 26 + Math.max(leftH, rightH) + 10 + wordsH + 70;
    y += 16;
    if (y + needed > bottomLimit()) { doc.addPage(); y = 30; }

    // section band
    doc.rect(L, y, W, 20).fill(BRAND);
    doc.fillColor("#fff").font("Helvetica-Bold").fontSize(9.5).text("SETTLEMENT SUMMARY", L + 10, y + 6, { width: W - 20 });
    y += 28;

    // left — approved amount by category
    const lx = L, lw = 258;
    const lc = [{ label: "Category", w: 138 }, { label: "Items", w: 40, align: "center" }, { label: "Approved", w: 80, align: "right" }];
    const cell = (texts, top, h, opts = {}) => {
        let x = lx;
        if (opts.fill) doc.rect(lx, top, lw, h).fill(opts.fill);
        lc.forEach((c, i) => {
            doc.fillColor(opts.color || "#000").font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(8)
                .text(texts[i], x + 6, top + (h - 8) / 2, { width: c.w - 12, align: c.align || "left", lineBreak: false });
            x += c.w;
        });
        doc.rect(lx, top, lw, h).lineWidth(0.5).strokeColor(LINE).stroke();
    };
    let ly = y;
    cell(lc.map(c => c.label), ly, 16, { fill: HEAD_BG, bold: true, color: BRAND }); ly += 16;
    if (catRows.length) {
        catRows.forEach(c => { cell([c.category, String(c.count || ""), money(c.amount)], ly, CAT_ROW); ly += CAT_ROW; });
    } else {
        cell(["No approved items", "", "-"], ly, CAT_ROW, { color: MUTED }); ly += CAT_ROW;
    }
    cell(["Total", String(catRows.reduce((s, c) => s + (c.count || 0), 0)), money(t.approved)], ly, 17, { bold: true, fill: "#f8fafc" });
    ly += 17;

    // right — amount summary
    const rx = L + 277, rw = R - rx;
    let ry = y;
    amountRows.forEach(row => {
        if (row.net) doc.rect(rx, ry, rw, AMT_ROW).fill(ACCENT_BG);
        const color = row.net ? ACCENT : (row.color || "#000");
        const font = row.net || row.bold ? "Helvetica-Bold" : "Helvetica";
        const size = row.net ? 10 : 8.5;
        doc.fillColor(color).font(font).fontSize(size)
            .text(row.k, rx + 10, ry + (AMT_ROW - size) / 2 + 1, { width: 120, lineBreak: false })
            .text(row.v, rx + 120, ry + (AMT_ROW - size) / 2 + 1, { width: rw - 130, align: "right", lineBreak: false });
        doc.rect(rx, ry, rw, AMT_ROW).lineWidth(0.5).strokeColor(row.net ? ACCENT : LINE).stroke();
        ry += AMT_ROW;
    });

    y = Math.max(ly, ry) + 10;

    // amount in words
    doc.rect(L, y, W, wordsH).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.rect(L, y, 3, wordsH).fill(ACCENT);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(MUTED).text(`${netLabel.toUpperCase()} — AMOUNT IN WORDS`, L + 10, y + 6);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#000").text(wordsText, L + 10, y + 16, { width: W - 20 });
    y += wordsH + 10;

    // status note + declaration
    const statusNote = {
        "Rejected": `Claim rejected by ${claim.rejectedBy || "-"} on ${fmtDate(claim.rejectedAt)}. Reasons are shown against each item above. No amount is payable.`,
        "Pending Approval": `Submitted on ${fmtDate(claim.submittedAt)} — awaiting approval. This is not a final approved document.`,
        "Draft": "Draft — not yet submitted for approval. This is not a final document.",
    }[claim.status] || (t.pending > 0
        ? `Partly approved: ${money(t.approved)} approved by ${claim.approvedBy || "-"} on ${fmtDate(claim.approvedAt)}; ${money(t.pending)} is still awaiting approval.`
        : `Approved for reimbursement of ${money(t.approved)} by ${claim.approvedBy || "-"} on ${fmtDate(claim.approvedAt)}.`
            + (claim.paidAt ? ` Paid on ${fmtDate(claim.paidAt)}.` : ""));
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(ACCENT).text(statusNote, L, y, { width: W });
    y = doc.y + 6;
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#000").text("Declaration: ", L, y, { continued: true })
        .font("Helvetica-Oblique").fillColor(MUTED)
        .text("I hereby certify that the expenses listed above were incurred by me wholly and necessarily for the official purposes of the company, and that the supporting bills / receipts have been submitted.", { width: W });
    y = doc.y + 4;
    if (claim.annexures?.length) {
        doc.font("Helvetica").fontSize(7.5).fillColor(MUTED)
            .text(`Bills / receipts${isFinalApproval ? " of the approved items" : ""} are attached as Annexure A-1 to A-${claim.annexures.length} after this page.`, L, y, { width: W });
        y = doc.y + 4;
    }

    // ---------- signatures ----------
    const sigH = 86;
    if (y + sigH + 10 > bottomLimit()) { doc.addPage(); y = 30; }
    y = Math.max(y + 16, bottomLimit() - sigH);
    const sigW = W / 3;
    [
        ["Claimed by", claim.staffName, claim.submittedAt],
        claim.status === "Rejected"
            ? ["Rejected by", claim.rejectedBy || "", claim.rejectedAt]
            : ["Approved by", undecided && !t.approved ? "" : (claim.approvedBy || ""), undecided && !t.approved ? null : claim.approvedAt],
        ["Accounts", "", claim.paidAt],
    ].forEach(([label, name, date], i) => {
        const x = L + i * sigW;
        // company stamp only on a final approval
        if (i === 1 && isFinalApproval && fs.existsSync(STAMP)) {
            try { doc.image(STAMP, x + sigW / 2 - 28, y - 8, { fit: [56, 56] }); } catch { /* ignore */ }
        }
        doc.moveTo(x + 18, y + 50).lineTo(x + sigW - 18, y + 50).lineWidth(0.6).strokeColor("#000").stroke();
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#000").text(label, x, y + 54, { width: sigW, align: "center" });
        doc.font("Helvetica").fontSize(8).fillColor(MUTED)
            .text(name || " ", x, y + 65, { width: sigW, align: "center" })
            .text(date ? `Date: ${fmtDate(date)}` : "Date: ____________", x, y + 76, { width: sigW, align: "center" });
    });

    // ---------- annexure index (bills attached after the claim) ----------
    if (claim.annexures?.length) {
        doc.addPage();
        y = 30;
        doc.rect(L, y, W, 22).fill(BRAND);
        doc.fillColor("#fff").font("Helvetica-Bold").fontSize(10.5).text("ANNEXURE — BILLS & RECEIPTS", L + 10, y + 6, { width: W - 20 });
        y += 30;
        doc.font("Helvetica").fontSize(8).fillColor(MUTED)
            .text(`Claim ${claim.claimNumber} · ${claim.staffName} — ${isFinalApproval ? "bills of the approved items" : "bills"} follow in this order. Each attached page carries its annexure number.`, L, y, { width: W });
        y = doc.y + 8;
        const ac = [
            { key: "label", label: "Annexure", w: 58 }, { key: "row", label: "Row", w: 32, align: "center" },
            { key: "date", label: "Date", w: 72 }, { key: "category", label: "Category", w: 82 },
            { key: "amount", label: "Amount", w: 72, align: "right" }, { key: "file", label: "File", w: 159 },
            { key: "type", label: "Attached as", w: 60 },
        ];
        const head = () => {
            doc.rect(L, y, W, 17).fill(HEAD_BG);
            let x = L;
            doc.fillColor(BRAND).font("Helvetica-Bold").fontSize(8);
            ac.forEach(c => { doc.text(c.label, x + 4, y + 5, { width: c.w - 8, align: c.align || "left", lineBreak: false }); x += c.w; });
            doc.rect(L, y, W, 17).lineWidth(0.5).strokeColor(LINE).stroke();
            y += 17;
        };
        head();
        claim.annexures.forEach(a => {
            const cells = {
                label: a.label, row: String(a.row), date: a.date, category: a.category, amount: money(a.amount),
                file: a.name, type: a.embed ? (a.kind === "pdf" ? "PDF pages" : "Image") : "View in CRM",
            };
            doc.font("Helvetica").fontSize(8);
            const h = Math.max(...ac.map(c => doc.heightOfString(cells[c.key], { width: c.w - 8 }))) + 8;
            if (y + h > bottomLimit()) { doc.addPage(); y = 30; head(); }
            let x = L;
            ac.forEach(c => {
                doc.fillColor(c.key === "type" && !a.embed ? "#b45309" : "#000").font(c.key === "label" ? "Helvetica-Bold" : "Helvetica").fontSize(8)
                    .text(cells[c.key], x + 4, y + 4, { width: c.w - 8, align: c.align || "left" });
                x += c.w;
            });
            doc.rect(L, y, W, h).lineWidth(0.4).strokeColor(LINE).stroke();
            y += h;
        });
    }

    // ---------- footer on every page (page numbers are added after the bills are merged) ----------
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0; // writing inside the bottom margin must not trigger an automatic new page
        const fy = doc.page.height - 34;
        doc.moveTo(L, fy - 6).lineTo(R, fy - 6).lineWidth(0.4).strokeColor(LINE).stroke();
        doc.font("Helvetica").fontSize(7).fillColor(MUTED)
            .text(`${claim.claimNumber} · ${claim.staffName} · Generated on ${fmtDateTime(new Date())} · System generated document`, L, fy, { width: W - 80, lineBreak: false });
    }

    doc.end();
};

// ================= bills (annexures) merged after the claim =================
const { PassThrough } = require("stream");
const { PDFDocument: LibPDF, StandardFonts, rgb } = require("pdf-lib");

// pdf-lib's standard fonts only encode WinAnsi — replace anything else (e.g. Hindi file names)
const winAnsi = (s) => String(s ?? "").replace(/[^\x20-\x7E -ÿ–—‘’“”•€]/g, "?");

const toBuffer = (claim) => new Promise((resolve, reject) => {
    const pt = new PassThrough();
    const chunks = [];
    pt.on("data", c => chunks.push(c));
    pt.on("end", () => resolve(Buffer.concat(chunks)));
    pt.on("error", reject);
    try { buildClaimPdf(claim, pt); } catch (e) { reject(e); }
});

const A4 = [595.28, 841.89];
const navy = rgb(0x1a / 255, 0x23 / 255, 0x7e / 255);
const grey = rgb(0.42, 0.45, 0.5);

const captionText = (a) => `Annexure ${a.label}  ·  Row ${a.row}  ·  ${a.date}  ·  ${a.category}  ·  ${money(a.amount)}  ·  ${a.name}`;

/**
 * Build the full claim PDF: claim pages + annexure index + every bill (images → one page each, PDFs → all pages).
 * @param {object} claim       same as buildClaimPdf, plus `annexures` [{ label, row, date, category, amount, name, path, kind, embed }]
 * @returns {Promise<Buffer>}
 */
const buildClaimPdfWithBills = async (claim) => {
    // Check every bill up-front so the annexure index says exactly what is attached
    const checked = [];
    for (const a of claim.annexures || []) {
        const entry = { ...a, embed: false, problem: "" };
        if (!fs.existsSync(a.path)) entry.problem = "missing";
        else if (!["pdf", "jpg", "png"].includes(a.kind)) entry.problem = "format";
        else {
            try {
                const bytes = fs.readFileSync(a.path);
                if (a.kind === "jpg" && !(bytes[0] === 0xff && bytes[1] === 0xd8)) throw new Error("not a JPEG");
                if (a.kind === "png" && bytes.slice(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("not a PNG");
                if (a.kind === "pdf") {
                    entry.pdf = await LibPDF.load(bytes, { ignoreEncryption: true });
                    // a broken file can "load" but has no readable page tree
                    if (!(entry.pdf.getPageCount() > 0)) throw new Error("no pages");
                }
                entry.bytes = bytes;
                entry.embed = true;
            } catch {
                entry.problem = "unreadable";
            }
        }
        checked.push(entry);
    }
    claim.annexures = checked;
    const base = await toBuffer(claim);
    const out = await LibPDF.load(base);
    const font = await out.embedFont(StandardFonts.Helvetica);
    const bold = await out.embedFont(StandardFonts.HelveticaBold);

    const notePage = (a, message) => {
        const page = out.addPage(A4);
        const [w, h] = A4;
        page.drawRectangle({ x: 30, y: h - 82, width: w - 60, height: 52, color: rgb(0.93, 0.95, 1) });
        page.drawText(winAnsi(`Annexure ${a.label}`), { x: 40, y: h - 52, size: 13, font: bold, color: navy });
        page.drawText(winAnsi(captionText(a)).slice(0, 120), { x: 40, y: h - 70, size: 8, font, color: grey });
        page.drawText(winAnsi(message), { x: 40, y: h - 130, size: 11, font: bold, color: rgb(0.7, 0.33, 0.04), maxWidth: w - 80, lineHeight: 15 });
    };

    // Pages copied from PDF bills keep their own footer — number them inside our bottom strip instead
    const billPdfPages = new Set();

    for (const a of claim.annexures) {
        if (!a.embed) {
            notePage(a, {
                missing: `The file "${a.name}" was not found on the server.`,
                format: `This bill (${String(a.kind).toUpperCase()}) cannot be placed inside a PDF. Please open "${a.name}" from the claim in the CRM.`,
                unreadable: `The file "${a.name}" could not be read — it may be damaged or password-protected. Please open it from the claim in the CRM.`,
            }[a.problem] || `Please open "${a.name}" from the claim in the CRM.`);
            continue;
        }
        try {
            const bytes = a.bytes;
            if (a.kind === "pdf") {
                const src = a.pdf;
                const pages = await out.copyPages(src, src.getPageIndices());
                pages.forEach((p, i) => {
                    out.addPage(p);
                    billPdfPages.add(out.getPageCount() - 1);
                    // small label strip at the bottom of each bill page
                    const { width } = p.getSize();
                    p.drawRectangle({ x: 0, y: 0, width, height: 16, color: rgb(1, 1, 1), opacity: 0.9 });
                    p.drawText(winAnsi(`${captionText(a)}${pages.length > 1 ? `  ·  page ${i + 1}/${pages.length}` : ""}`).slice(0, 150),
                        { x: 8, y: 5, size: 6.5, font: bold, color: navy });
                });
            } else {
                const img = a.kind === "png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
                const page = out.addPage(A4);
                const [w, h] = A4;
                // caption band
                page.drawRectangle({ x: 30, y: h - 72, width: w - 60, height: 42, color: rgb(0.93, 0.95, 1) });
                page.drawText(winAnsi(`Annexure ${a.label}`), { x: 40, y: h - 50, size: 12, font: bold, color: navy });
                page.drawText(winAnsi(captionText(a)).slice(0, 130), { x: 40, y: h - 64, size: 7.5, font, color: grey });
                // image, scaled to fit the remaining area
                const box = { x: 30, y: 50, w: w - 60, h: h - 72 - 10 - 50 };
                const scale = Math.min(box.w / img.width, box.h / img.height, 1);
                const iw = img.width * scale, ih = img.height * scale;
                page.drawImage(img, { x: box.x + (box.w - iw) / 2, y: box.y + (box.h - ih), width: iw, height: ih });
                page.drawRectangle({ x: box.x + (box.w - iw) / 2, y: box.y + (box.h - ih), width: iw, height: ih, borderColor: rgb(0.82, 0.84, 0.86), borderWidth: 0.6 });
            }
        } catch {
            notePage(a, `The file "${a.name}" could not be attached — it may be damaged. Please open it from the claim in the CRM.`);
        }
    }

    // page numbers across the whole document
    const pages = out.getPages();
    pages.forEach((p, i) => {
        const { width } = p.getSize();
        const label = `Page ${i + 1} of ${pages.length}`;
        if (billPdfPages.has(i)) {
            // inside the white label strip at the very bottom of a copied bill page
            p.drawText(label, { x: width - 8 - bold.widthOfTextAtSize(label, 6.5), y: 5, size: 6.5, font: bold, color: navy });
        } else {
            // y matches the baseline of the claim pages' footer line (pdfkit draws it at top = height - 34)
            p.drawText(label, { x: width - 30 - font.widthOfTextAtSize(label, 7), y: 28.5, size: 7, font, color: grey });
        }
    });

    out.setTitle(`Expense Claim ${claim.claimNumber}`);
    out.setAuthor(COMPANY.name);
    return Buffer.from(await out.save());
};

module.exports = { buildClaimPdf, buildClaimPdfWithBills, amountInWords };
