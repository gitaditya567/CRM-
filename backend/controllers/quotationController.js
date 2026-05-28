const Quotation = require("../models/Quotation");
const PDFDocument = require("pdfkit-table");
const Lead = require("../models/Lead");
const Client = require("../models/Client");
const { clearCachePrefix } = require("../utils/cache");

// GET /api/quotations
exports.getQuotations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        let filter = {};
        const filters = [];

        // 1. Role-based lead access filter
        if (req.user && req.user.role?.toLowerCase() !== "admin" && req.user.role?.toLowerCase() !== "superadmin") {
            const userRole = req.user.role?.toLowerCase();
            if (userRole === "sales" || userRole === "services") {
                const leadIds = await require("../models/Lead").find({
                    $or: [
                        { assignedTo: req.user._id },
                        { source: req.user.name }
                    ]
                }).distinct("_id");
                filters.push({
                    $or: [
                        { createdBy: req.user._id },
                        { lead: { $in: leadIds } }
                    ]
                });
            } else {
                const leadIds = await require("../models/Lead").find({
                    $or: [
                        { assignedTo: req.user._id },
                        { source: req.user.name },
                        { assignedTo: null }
                    ]
                }).distinct("_id");
                filters.push({ lead: { $in: leadIds } });
            }
        }

        // 2. Search Filter
        let search = req.query.search ? req.query.search.trim() : "";
        if (search) {
            // Strip "Lead No:" prefix if copied accidentally
            search = search.replace(/^lead\s*no\s*:\s*/i, "").trim();

            const matchedLeads = await Lead.find({
                leadNumber: { $regex: search, $options: "i" }
            }).distinct("_id");
            console.log("Quotation Search term:", search);
            console.log("Matched Leads:", matchedLeads);

            filters.push({
                $or: [
                    { quotationNumber: { $regex: search, $options: "i" } },
                    { "billTo.name": { $regex: search, $options: "i" } },
                    { status: { $regex: search, $options: "i" } },
                    { lead: { $in: matchedLeads } }
                ]
            });
        }

        if (req.query.staff) {
            const staffLeadIds = await require("../models/Lead").find({
                $or: [
                    { assignedTo: req.query.staff },
                    { createdBy: req.query.staff }
                ]
            }).distinct("_id");
            filters.push({
                $or: [
                    { createdBy: req.query.staff },
                    { lead: { $in: staffLeadIds } }
                ]
            });
        }

        // 3. Document Type Filter (PI or Quotation)
        if (req.query.docType === "PI") {
            filters.push({ quotationNumber: /^PI/i });
        } else if (req.query.docType === "Quotation") {
            filters.push({ quotationNumber: { $not: /^PI/i } });
        }

        if (filters.length > 0) {
            filter = filters.length === 1 ? filters[0] : { $and: filters };
        }

        let totalQuotations;
        if (Object.keys(filter).length === 0) {
            totalQuotations = await Quotation.estimatedDocumentCount();
        } else {
            totalQuotations = await Quotation.countDocuments(filter);
        }
        const quotations = await Quotation.find(filter)
            .populate({
                path: "lead",
                select: "name email phone leadNumber status source assignedTo group",
                populate: [
                    { path: "assignedTo", select: "name" },
                    { path: "group", select: "name priceType" }
                ]
            })
            .populate("createdBy", "name")
            .populate("products.product", "name productNo")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.json({
            quotations,
            pagination: {
                totalQuotations,
                totalPages: Math.ceil(totalQuotations / limit),
                currentPage: page,
                limit
            }
        });
    } catch (err) {
        console.error("Get Quotations Error:", err);
        res.status(500).json({ message: "Failed to fetch quotations" });
    }
};

const calculateQuotationTotals = async (products, additionalCharges) => {
    // Fetch full product details to ensure accuracy
    const productIds = products.map(p => p.product);
    const dbProducts = await require("../models/Product").find({ _id: { $in: productIds } });
    const productMap = {};
    dbProducts.forEach(p => productMap[p._id.toString()] = p);

    let subTotalTaxable = 0;
    let subTotalGst = 0;

    const processedProducts = products.map(p => {
        const dbProd = productMap[p.product] || {};

        const quantity = Number(p.quantity) || 1;
        const unitPrice = Number(p.unitPrice) || 0;
        const gstRate = p.gstRate !== undefined ? Number(p.gstRate) : (dbProd.gstRate || 18);

        const taxableAmount = quantity * unitPrice;
        const gstAmount = taxableAmount * (gstRate / 100);
        const lineTotal = taxableAmount + gstAmount;

        subTotalTaxable += taxableAmount;
        subTotalGst += gstAmount;

        return {
            product: p.product,
            productNo: p.productNo || dbProd.productNo || "",
            name: p.name || dbProd.name || "Unknown Product",
            description: p.description || dbProd.description || "",
            brand: p.brand || dbProd.brand || "",
            hsnCode: p.hsnCode || dbProd.hsnCode || "",
            uom: p.uom || dbProd.uom || "PCS",
            quantity,
            unitPrice,
            gstRate,
            gstAmount,
            taxableAmount,
            total: lineTotal
        };
    });

    // Additional Charges
    const charges = additionalCharges || { installation: 0, freight: 0, insurance: 0, other: 0 };
    const installation = Number(charges.installation) || 0;
    const freight = Number(charges.freight) || 0;
    const insurance = Number(charges.insurance) || 0;
    const other = Number(charges.other) || 0;

    const chargesTaxable = installation + freight + insurance + other;
    const chargesGst = chargesTaxable * 0.18; // Standard 18% on services

    const finalSubTotal = subTotalTaxable + subTotalGst + chargesTaxable + chargesGst;
    const roundOff = Math.round(finalSubTotal) - finalSubTotal;
    const grandTotal = Math.round(finalSubTotal);

    return {
        processedProducts,
        subTotal: subTotalTaxable + chargesTaxable,
        gstTotal: subTotalGst + chargesGst,
        roundOff,
        grandTotal
    };
};

// POST /api/quotations
exports.createQuotation = async (req, res) => {
    try {
        const { lead, products, status, validUntil, terms, termDetails, billTo, shipTo, additionalCharges } = req.body;

        if (!lead) {
            return res.status(400).json({ message: "Lead is required" });
        }

        const totals = await calculateQuotationTotals(products, additionalCharges);

        // Fetch lead for snapshots and quotation number generation
        const leadDoc = await Lead.findById(lead).populate("group");
        if (!leadDoc) {
            return res.status(404).json({ message: "Lead not found" });
        }

        // Generate Quotation Number
        const date = new Date();
        const currentMonth = date.getMonth();
        const currentYear = date.getFullYear();

        let startYear, endYear;
        if (currentMonth >= 3) {
            startYear = currentYear;
            endYear = currentYear + 1;
        } else {
            startYear = currentYear - 1;
            endYear = currentYear;
        }

        const fyStr = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;

        let initials = "SYS";
        if (req.user) {
            let uName = req.user.name || "User";
            if (!req.user.name && (req.user.id || req.user._id)) {
                const User = require("../models/User");
                const fullUser = await User.findById(req.user.id || req.user._id);
                if (fullUser) uName = fullUser.name;
            }

            const parts = uName.split(' ').filter(p => p.length > 0);
            if (parts.length >= 2) {
                initials = (parts[0][0] + parts[1][0]).toUpperCase();
            } else if (parts.length === 1) {
                initials = parts[0].substring(0, 2).toUpperCase();
            }
        }

        const fyStartDate = new Date(startYear, 3, 1, 0, 0, 0, 0);
        const fyEndDate = new Date(endYear, 2, 31, 23, 59, 59, 999);

        const lastQuote = await Quotation.findOne({
            createdAt: { $gte: fyStartDate, $lte: fyEndDate }
        }).sort({ createdAt: -1 });

        let seq = 1;
        if (lastQuote && lastQuote.quotationNumber) {
            const parts = lastQuote.quotationNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) seq = lastSeq + 1;
        }

        const quotationNumber = `Q-${fyStr}-${initials}-${String(seq).padStart(3, '0')}`;

        // Try to find a matching client for the snapshot fallback
        const escapedName = leadDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const clientDoc = await Client.findOne({ 
            $or: [
                { clientName: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
                { legalEntityName: { $regex: new RegExp(`^${escapedName}$`, 'i') } }
            ]
        });
        
        const clientSnapshot = {
            name: clientDoc ? (clientDoc.legalEntityName || clientDoc.clientName) : leadDoc.name,
            address: clientDoc ? `${clientDoc.billingAddress.addressLine1}, ${clientDoc.billingAddress.addressLine2 || ""}, ${clientDoc.billingAddress.city}, ${clientDoc.billingAddress.state}, ${clientDoc.billingAddress.zipCode}`.replace(/ ,/g, '').replace(/,,/g, ',') : "",
            gstin: clientDoc ? clientDoc.gstVatNo : ""
        };

        const newQuotation = new Quotation({
            quotationNumber,
            lead,
            products: totals.processedProducts,
            additionalCharges: additionalCharges || { installation: 0, freight: 0 },
            subTotal: totals.subTotal,
            gstTotal: totals.gstTotal,
            roundOff: totals.roundOff,
            grandTotal: totals.grandTotal,
            billTo: billTo || clientSnapshot,
            shipTo: shipTo || clientSnapshot,
            status: status || "Draft",
            validUntil: validUntil || (termDetails && termDetails.validityDays ? new Date(Date.now() + parseInt(termDetails.validityDays) * 24 * 60 * 60 * 1000) : undefined),
            terms: terms || undefined,
            termDetails: termDetails || undefined,
            createdBy: req.user ? req.user._id : null
        });

        const savedQuotation = await newQuotation.save();
        const populatedQuotation = await Quotation.findById(savedQuotation._id)
            .populate({
                path: "lead",
                select: "name email phone leadNumber status source assignedTo group",
                populate: [
                    { path: "assignedTo", select: "name" },
                    { path: "group", select: "name priceType" }
                ]
            })
            .populate("createdBy", "name")
            .populate("products.product", "name productNo")
            .lean();

        const updatedLead = await Lead.findByIdAndUpdate(lead, { status: "Quotation Submitted" }, { new: true }).populate("group");

                const io = req.app.get("io");
        if (io) {
            io.emit("leadUpdated", updatedLead);
            io.emit("quotationAdded", populatedQuotation);
        }

        clearCachePrefix("dashboard_");
        res.status(201).json(populatedQuotation);
    } catch (err) {
        console.error("Create Quotation Error:", err);
        res.status(500).json({ message: "Failed to create quotation" });
    }
};

// PUT /api/quotations/:id
exports.updateQuotation = async (req, res) => {
    try {
        const { id } = req.params;
        const { products, additionalCharges, poOnly, ...otherUpdates } = req.body;

        let updates = { ...otherUpdates };

        // Pluck PO-specific fields from updates so they are always persisted
        const poFields = {};
        if ("poNumber" in updates) { poFields.poNumber = updates.poNumber; delete updates.poNumber; }
        if ("poDate" in updates)   { poFields.poDate   = updates.poDate;   delete updates.poDate; }
        if ("poComment" in updates){ poFields.poComment = updates.poComment; delete updates.poComment; }

        if (products) {
            const totals = await calculateQuotationTotals(products, additionalCharges || req.body.additionalCharges);
            updates.products = totals.processedProducts;
            updates.additionalCharges = additionalCharges || req.body.additionalCharges;
            updates.subTotal = totals.subTotal;
            updates.gstTotal = totals.gstTotal;
            updates.roundOff = totals.roundOff;
            updates.grandTotal = totals.grandTotal;
        } else if (additionalCharges) {
            const existingQuotation = await Quotation.findById(id);
            if (existingQuotation) {
                const totals = await calculateQuotationTotals(existingQuotation.products, additionalCharges);
                updates.additionalCharges = additionalCharges;
                updates.subTotal = totals.subTotal;
                updates.gstTotal = totals.gstTotal;
                updates.roundOff = totals.roundOff;
                updates.grandTotal = totals.grandTotal;
            }
        }

        // Merge PO fields back – they are always saved, but never trigger a revisionNo bump
        const mergedUpdates = { ...updates, ...poFields };

        // Only increment revisionNo when actual quotation data changes (not PO-only saves)
        const dbOperation = poOnly
            ? { $set: mergedUpdates }
            : { ...mergedUpdates, $inc: { revisionNo: 1 } };

        const quotation = await Quotation.findByIdAndUpdate(id, dbOperation, { new: true })
            .populate({
                path: "lead",
                select: "name email phone leadNumber status source assignedTo group",
                populate: [
                    { path: "assignedTo", select: "name" },
                    { path: "group", select: "name priceType" }
                ]
            })
            .populate("createdBy", "name")
            .populate("products.product", "name productNo")
            .lean();

        const io = req.app.get("io");
        if (io) {
            io.emit("quotationUpdated", quotation);
        }

        clearCachePrefix("dashboard_");
        res.json(quotation);
    } catch (err) {
        console.error("Update Quotation Error:", err);
        res.status(500).json({ message: "Failed to update quotation" });
    }
};

// DELETE /api/quotations/:id
exports.deleteQuotation = async (req, res) => {
    try {
        const { id } = req.params;
        await Quotation.findByIdAndDelete(id);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("quotationDeleted", id);
        }

        clearCachePrefix("dashboard_");
        res.json({ message: "Quotation deleted" });
    } catch (err) {
        console.error("Delete Quotation Error:", err);
        res.status(500).json({ message: "Failed to delete quotation" });
    }
};

// GET /api/quotations/:id/pdf
exports.generatePDF = async (req, res) => {
    try {
        const { id } = req.params;
        const quotation = await Quotation.findById(id)
            .populate({
                path: "lead",
                populate: { path: "group", select: "name" }
            })
            .populate("createdBy", "name")
            .lean();

        if (!quotation) {
            return res.status(404).json({ message: "Quotation not found" });
        }

        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        // Stream the PDF to the response
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=Quotation_${quotation.quotationNumber}.pdf`);
        doc.pipe(res);

        // Helper to draw page border
        const drawPageBorder = () => {
            doc.rect(30, 20, 535, 802).stroke();
        };

        // Draw border for the first page
        drawPageBorder();

        // Listen for new pages to automatically draw border
        doc.on('pageAdded', () => {
            drawPageBorder();
        });

        // --- Header Section ---
        doc.rect(30, 20, 535, 70).stroke(); // Outer box for header
        
        // Left Column: Company Info
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a237e').text("TeamInspire Business Solutions Pvt Ltd", 35, 30);
        doc.fontSize(8).font('Helvetica').fillColor('#000000');
        doc.text("D730/29, Street No. 11, Ashok Nagar, Shahdara, Delhi, 110093, India", 35, 48);
        doc.text("E: deepak.gupta@teaminspire.co.in, spares@teaminspire.co.in", 35, 58);
        doc.text("Contact No. +91 9013589766, +91 9560825111", 35, 68);
        doc.font('Helvetica-Bold').text("GSTIN: 07AAFCT5822P1ZT", 35, 78);

        // Divider
        doc.moveTo(370, 20).lineTo(370, 90).stroke();
        
        // Right Column: Logo
        try {
            const path = require("path");
            const logoPath = path.join(__dirname, "..", "..", "frontend", "public", "logo.png");
            doc.image(logoPath, 380, 25, { width: 170 });
        } catch (e) {
            console.error("Failed to load logo in PDF:", e);
            const fallbackTitle = (quotation.quotationNumber && quotation.quotationNumber.startsWith("PI")) ? "PROFORMA INVOICE" : "QUOTATION";
            doc.fontSize(10).font('Helvetica-Bold').text(fallbackTitle, 380, 45, { align: 'center', width: 170 });
        }

        doc.moveDown(2);
        const infoY = 90;

        // --- Info Section ---
        const isPI = quotation.quotationNumber?.startsWith("PI");
        const hasPO = isPI && (quotation.poNumber || quotation.poDate);
        const poRowCount = hasPO ? 1 : 0;
        const infoBlockHeight = hasPO ? 80 + (poRowCount * 20) : 80;

        const startInfoY = infoY;
        doc.fontSize(9).font('Helvetica-Bold').text("BILL TO:", 35, infoY + 5);
        doc.fontSize(8).font('Helvetica-Bold').text(quotation.billTo?.name || "N/A", 35, doc.y, { width: 185 });
        doc.font('Helvetica').text(quotation.billTo?.address || "", 35, doc.y, { width: 185 });
        const billToEndY = doc.y;
        doc.font('Helvetica-Bold').text(`GSTIN: ${quotation.billTo?.gstin || ""}`, 35, startInfoY + 65);

        doc.fontSize(9).font('Helvetica-Bold').text("SHIP TO:", 230, startInfoY + 5);
        doc.fontSize(8).font('Helvetica-Bold').text(quotation.shipTo?.name || quotation.billTo?.name || "N/A", 230, startInfoY + 15, { width: 190 });
        doc.font('Helvetica').text(quotation.shipTo?.address || quotation.billTo?.address || "", 230, doc.y, { width: 190 });
        doc.font('Helvetica-Bold').text(`GSTIN: ${quotation.shipTo?.gstin || quotation.billTo?.gstin || ""}`, 230, startInfoY + 65);

        // Details Block
        doc.rect(30, startInfoY, 535, infoBlockHeight).stroke();
        doc.moveTo(225, startInfoY).lineTo(225, startInfoY + infoBlockHeight).stroke();
        doc.moveTo(425, startInfoY).lineTo(425, startInfoY + infoBlockHeight).stroke();
        doc.moveTo(425, startInfoY + 20).lineTo(565, startInfoY + 20).stroke();
        doc.moveTo(425, startInfoY + 40).lineTo(565, startInfoY + 40).stroke();
        doc.moveTo(425, startInfoY + 60).lineTo(565, startInfoY + 60).stroke();
        doc.moveTo(485, startInfoY).lineTo(485, startInfoY + infoBlockHeight).stroke();

        doc.fontSize(8).font('Helvetica-Bold');
        doc.text("No.", 428, startInfoY + 6); doc.font('Helvetica').text(quotation.quotationNumber, 488, startInfoY + 6);
        doc.font('Helvetica-Bold').text("Date", 428, startInfoY + 26); doc.font('Helvetica').text(new Date(quotation.createdAt).toLocaleDateString("en-GB"), 488, startInfoY + 26);
        if (!isPI) {
            doc.fontSize(7.5).font('Helvetica-Bold').text("Rev. No/Date", 428, startInfoY + 46);
            doc.fontSize(7.5).font('Helvetica').text(quotation.revisionNo > 0 ? `RN ${quotation.revisionNo} / ${new Date(quotation.updatedAt).toLocaleDateString("en-GB")}` : "-", 488, startInfoY + 46);
            doc.fontSize(8);
        } else {
            doc.font('Helvetica-Bold').text("Lead No.", 428, startInfoY + 46); doc.font('Helvetica').text(quotation.lead?.leadNumber || "-", 488, startInfoY + 46);
        }
        doc.font('Helvetica-Bold').text("Page", 428, startInfoY + 66); doc.font('Helvetica').text("1", 488, startInfoY + 66);

        // PO Details (PI only)
        if (hasPO) {
            let poY = startInfoY + 80;
            doc.moveTo(30, poY).lineTo(565, poY).stroke();
            doc.moveTo(225, poY).lineTo(225, poY + 20).stroke();
            doc.moveTo(425, poY).lineTo(425, poY + 20).stroke();
            doc.moveTo(485, poY).lineTo(485, poY + 20).stroke();
            doc.fontSize(8).font('Helvetica-Bold').text("PO No.", 35, poY + 5, { width: 185 });
            doc.font('Helvetica').text(quotation.poNumber || "-", 230, poY + 5, { width: 190 });
            doc.font('Helvetica-Bold').text("PO Date", 428, poY + 5);
            doc.font('Helvetica').text(quotation.poDate ? new Date(quotation.poDate).toLocaleDateString("en-GB") : "-", 488, poY + 5);
        }

        // --- QUOTATION Header Bar ---
        const quotationHeaderY = 90 + infoBlockHeight;
        doc.rect(30, quotationHeaderY, 535, 20).stroke();
        const documentTitle = (quotation.quotationNumber && quotation.quotationNumber.startsWith("PI")) ? "PROFORMA INVOICE" : "QUOTATION";
        doc.fontSize(10).font('Helvetica-Bold').text(documentTitle, 30, quotationHeaderY + 5, { align: 'center', width: 535 });

        // --- Items Table ---
        const installation = Number(quotation.additionalCharges?.installation) || 0;
        const freight = Number(quotation.additionalCharges?.freight) || 0;
        const insurance = Number(quotation.additionalCharges?.insurance) || 0;
        const other = Number(quotation.additionalCharges?.other) || 0;
        const chargesTaxable = installation + freight + insurance + other;
        const chargesGst = chargesTaxable * 0.18;
        const chargesTotal = chargesTaxable + chargesGst;

        const productQtySum = quotation.products.reduce((acc, p) => acc + (p.quantity || 0), 0);
        const productTaxableSum = quotation.products.reduce((acc, p) => acc + (p.taxableAmount || (p.quantity * p.unitPrice)), 0);
        const productGstSum = quotation.products.reduce((acc, p) => acc + (p.gstAmount || (p.quantity * p.unitPrice * (p.gstRate || 0) / 100)), 0);
        const productTotalSum = quotation.products.reduce((acc, p) => acc + (p.total || 0), 0);

        const table = {
            headers: [
                { label: "Sl.\nNo.", property: 'sl', width: 20, align: 'center' },
                { label: "Brand", property: 'brand', width: 40, align: 'center' },
                { label: "Model No/Part Code", property: 'model', width: 70, align: 'center' },
                { label: "Description", property: 'desc', width: 95 },
                { label: "HSN Code", property: 'hsn', width: 45, align: 'center' },
                { label: "UOM", property: 'uom', width: 25, align: 'center' },
                { label: "QTY", property: 'qty', width: 20, align: 'center' },
                { label: "Unit Rate (Rs.)", property: 'rate', width: 45, align: 'right' },
                { label: "Taxable Value\n(Rs.)", property: 'taxable', width: 55, align: 'right' },
                { label: "GST\nRate (%)", property: 'gstRate', width: 30, align: 'center' },
                { label: "GST Value (Rs.)", property: 'gstVal', width: 40, align: 'right' },
                { label: "Total Value (Rs.)", property: 'total', width: 50, align: 'right' }
            ],
            datas: [
                ...quotation.products.map((p, index) => ({
                    sl: (index + 1).toString(),
                    brand: p.brand || "",
                    model: p.productNo || "",
                    desc: p.name || "",
                    hsn: p.hsnCode || "",
                    uom: p.uom || "PCS",
                    qty: p.quantity?.toString() || "0",
                    rate: (p.unitPrice || 0).toFixed(2),
                    taxable: (p.taxableAmount || (p.quantity * p.unitPrice)).toFixed(2),
                    gstRate: (p.gstRate || 0).toString(),
                    gstVal: (p.gstAmount || (p.quantity * p.unitPrice * (p.gstRate || 0) / 100)).toFixed(2),
                    total: (p.total || 0).toFixed(2)
                })),
                // Itemised Total Row
                {
                    sl: "",
                    brand: "",
                    model: "",
                    desc: "Itemised Total",
                    hsn: "",
                    uom: "",
                    qty: productQtySum.toString(),
                    rate: "",
                    taxable: productTaxableSum.toFixed(2),
                    gstRate: "",
                    gstVal: productGstSum.toFixed(2),
                    total: productTotalSum.toFixed(2)
                }
            ]
        };

        // Add Cartage row if applicable
        if (chargesTaxable > 0) {
            table.datas.push({
                sl: "",
                brand: "",
                model: "",
                desc: "CARTAGE/FREIGHT/INSURANCE",
                hsn: "",
                uom: "",
                qty: "1",
                rate: chargesTaxable.toFixed(2),
                taxable: chargesTaxable.toFixed(2),
                gstRate: "18",
                gstVal: chargesGst.toFixed(2),
                total: chargesTotal.toFixed(2)
            });
        }

        await doc.table(table, {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(6.5),
            prepareRow: (row, index, column, rect, bgColor) => {
                if (row.desc === "Itemised Total" || row.desc === "CARTAGE/FREIGHT/INSURANCE") {
                    doc.font("Helvetica-Bold").fontSize(6.5);
                } else {
                    doc.font("Helvetica").fontSize(6.5);
                }
            },
            padding: 2,
            x: 30,
            y: quotationHeaderY + 20,
            width: 535
        });

        // Draw vertical grid dividers and horizontal top/bottom seals
        const tableBottomY = doc.y;
        const tableStartY = quotationHeaderY + 20;
        const colXCoords = [30, 50, 90, 160, 255, 300, 325, 345, 390, 445, 475, 515, 565];
        doc.lineWidth(0.5).strokeColor('#000000');
        colXCoords.forEach(x => {
            doc.moveTo(x, tableStartY).lineTo(x, tableBottomY).stroke();
        });
        doc.moveTo(30, tableStartY).lineTo(565, tableStartY).stroke();
        doc.moveTo(30, tableBottomY).lineTo(565, tableBottomY).stroke();

        // --- Totals Section ---
        doc.moveDown(0.5);
        if (doc.y > 650) doc.addPage();
        
        const totalsY = doc.y;
        doc.rect(375, totalsY, 190, 60).stroke();
        doc.moveTo(490, totalsY).lineTo(490, totalsY + 60).stroke();
        doc.moveTo(375, totalsY + 20).lineTo(565, totalsY + 20).stroke();
        doc.moveTo(375, totalsY + 40).lineTo(565, totalsY + 40).stroke();

        const calculatedSubTotal = quotation.subTotal + quotation.gstTotal;
        
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text("Sub Total", 375, totalsY + 6, { width: 110, align: 'right' });
        doc.font('Helvetica').text(calculatedSubTotal.toFixed(2), 490, totalsY + 6, { width: 71, align: 'right' });

        doc.font('Helvetica-Bold').text("Round Off (+/-)", 375, totalsY + 26, { width: 110, align: 'right' });
        doc.font('Helvetica').text(quotation.roundOff.toFixed(2), 490, totalsY + 26, { width: 71, align: 'right' });

        doc.fontSize(9).font('Helvetica-Bold').text("Grand Total", 375, totalsY + 46, { width: 110, align: 'right' });
        doc.text(`Rs. ${quotation.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 490, totalsY + 46, { width: 71, align: 'right' });

        doc.y = totalsY + 60;
        doc.moveDown(1.5);

        // --- Terms & Conditions ---
        if (doc.y > 500) doc.addPage();
        
        const termsHeaderY = doc.y;
        doc.rect(30, termsHeaderY, 535, 20).stroke();
        doc.fontSize(9).font('Helvetica-Bold').text("Terms & Conditions:", 30, termsHeaderY + 6, { align: 'center', width: 535 });
        doc.y = termsHeaderY + 20;
        doc.moveDown(0.5);

        const termsBoxY = doc.y;
        let termsStartPageY = termsBoxY;
        let currentTermsY = termsBoxY;
        doc.fontSize(7);
        // Draw top line for first page terms box
        doc.moveTo(30, termsBoxY).lineTo(565, termsBoxY).stroke();

        const terms = [
            { l: "Delivery Lead Time", v: quotation.terms?.deliveryLeadTime || '-' },
            { l: "Payment", v: quotation.terms?.payment || '-' },
            { l: "Warranty Terms", v: quotation.terms?.warranty || '-' },
            { l: "Delivery Terms", v: quotation.terms?.deliveryTerms || '-' },
            { l: "Note", v: "Road permit will be as applicable in respective states." },
            { l: "Validity", v: quotation.terms?.validity || "30 Days from the date of PI." },
            { l: "GST", v: "Any GST additional liability arising due to changes in billing location, place of supply and GST applicability after PO shall be to customer's account." },
            { l: "Packaging", v: "Standard original OEM/Supplier packaging. If Wooden packing is required, will charged seperately on actual basis." },
            { l: "HS Code", v: "HSN codes and GST rates are subject to Govt/GST rules, regulations, notifications, circulars, court or tribunal judgements, legal interpretation etc and subject to change from time to time/ as applicable without prior notice. Prevailing classification and GST rates at the time of transaction will apply." },
            { l: "Bank Details", v: "Bank Name: ICICI Bank Ltd, Account Number: 135505500940, Bank Account Name: TeamInspire Business Solutions Pvt Ltd, IFSC/RTGS Number: ICIC0001355" },
            { l: "Special Note", v: "In-view of the current Global Shipping Scenario, the shipments may be a subject to delay which is out of human control and thus the same shall be covered under the Force Majeure Clause. Price quoted is valid if the order issued for all the quoted items with the same quantity. Any change in quantity/order can be discussed case to case basis." },
            { l: "Remarks", v: quotation.terms?.remark || "" }
        ];

        terms.forEach((t, i) => {
            const valStr = String(t.v);
            let rowHeight = 0;
            let p1 = "", p2 = "";
            let isWarranty = (t.l === "Warranty Terms");

            if (isWarranty) {
                const idx = valStr.indexOf("No warranty on spare parts.");
                if (idx !== -1) {
                    p1 = valStr.substring(0, idx).trim();
                    p2 = valStr.substring(idx).trim();
                } else {
                    p1 = valStr;
                    p2 = "";
                }

                const labelHeight = doc.font('Helvetica-Bold').heightOfString(t.l, { width: 100 });
                const p1Height = doc.font('Helvetica').heightOfString(p1, { width: 390 });
                const p2Height = p2 ? doc.font('Helvetica').heightOfString(p2, { width: 390 }) : 0;
                
                const totalValueHeight = p1Height + (p2 ? p2Height + 8 : 0);
                rowHeight = Math.max(labelHeight, totalValueHeight) + 8;
            } else {
                const labelHeight = doc.font('Helvetica-Bold').heightOfString(t.l, { width: 100 });
                const valueHeight = doc.font('Helvetica').heightOfString(valStr, { width: 390 });
                rowHeight = Math.max(labelHeight, valueHeight) + 8;
            }

            if (currentTermsY + rowHeight > 780) {
                // Draw vertical lines for the current page before adding a new page
                doc.moveTo(30, termsStartPageY).lineTo(30, currentTermsY).stroke();
                doc.moveTo(55, termsStartPageY).lineTo(55, currentTermsY).stroke();
                doc.moveTo(165, termsStartPageY).lineTo(165, currentTermsY).stroke();
                doc.moveTo(565, termsStartPageY).lineTo(565, currentTermsY).stroke();

                doc.addPage();
                currentTermsY = 30; // start at top of new page
                termsStartPageY = 30;
                // Draw top line of new page terms box
                doc.moveTo(30, currentTermsY).lineTo(565, currentTermsY).stroke();
            }

            // Render text
            doc.font('Helvetica').text((i + 1).toString(), 30, currentTermsY + 4, { align: 'center', width: 25 });
            doc.font('Helvetica-Bold').text(t.l, 60, currentTermsY + 4, { width: 100 });

            if (isWarranty && p2) {
                const p1Height = doc.font('Helvetica').heightOfString(p1, { width: 390 });
                const middleY = currentTermsY + p1Height + 6;

                // Render part 1
                doc.font('Helvetica').text(p1, 170, currentTermsY + 4, { width: 390 });
                
                // Draw horizontal line inside the cell separating part 1 and part 2
                doc.moveTo(165, middleY).lineTo(565, middleY).stroke();

                // Render part 2
                doc.font('Helvetica').text(p2, 170, middleY + 4, { width: 390 });
            } else {
                doc.font('Helvetica').text(valStr, 170, currentTermsY + 4, { width: 390 });
            }

            // Draw horizontal line at bottom of row
            doc.moveTo(30, currentTermsY + rowHeight).lineTo(565, currentTermsY + rowHeight).stroke();

            currentTermsY += rowHeight;
        });

        // Draw vertical lines for the final page
        doc.moveTo(30, termsStartPageY).lineTo(30, currentTermsY).stroke();
        doc.moveTo(55, termsStartPageY).lineTo(55, currentTermsY).stroke();
        doc.moveTo(165, termsStartPageY).lineTo(165, currentTermsY).stroke();
        doc.moveTo(565, termsStartPageY).lineTo(565, currentTermsY).stroke();

        // --- Footer Section ---
        doc.moveDown(2);
        // Check if there is enough vertical space for the signature section (needs ~110 points)
        if (doc.y > 730) {
            doc.addPage();
        }
        const footerY = Math.max(doc.y, 700);
        doc.fontSize(9).font('Helvetica-Bold').text("For TeamInspire Business Solutions Pvt Ltd", 35, footerY, { align: 'left', width: 300 });
        
        // Draw the Authorized Signatory Stamp (positioned perfectly below the company name)
        try {
            const path = require("path");
            const stampPath = path.join(__dirname, "..", "assets", "stamp.png");
            doc.image(stampPath, 80, footerY + 22, { width: 85 });
        } catch (stampErr) {
            console.error("Failed to load stamp in PDF:", stampErr);
        }
        
        doc.text("Authorized Signatory", 35, footerY + 115, { align: 'left', width: 300 });

        doc.end();
    } catch (err) {
        console.error("Generate PDF Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ message: "Failed to generate PDF document" });
        }
    }
};
