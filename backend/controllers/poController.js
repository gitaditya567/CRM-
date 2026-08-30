const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const PDFDocument = require("pdfkit-table");
const path = require("path");

// GET /api/purchase-orders
exports.getPOs = async (req, res) => {
    try {
        const { type } = req.query;
        let filter = {};
        if (type) {
            filter.type = type;
        }

        const pos = await PurchaseOrder.find(filter)
            .populate({
                path: "pi",
                populate: {
                    path: "lead",
                    select: "leadNumber"
                }
            })
            .populate("createdBy", "name")
            .populate("shipper")
            .populate("products.product", "name productNo brand type")
            .sort({ createdAt: -1 })
            .lean();

        // Map legalEntityName to clientName & extract client contact info (email & phone)
        const Client = require("../models/Client");
        const clients = await Client.find({}, "clientName legalEntityName contactPerson1 contactPerson2").lean();
        const clientMap = new Map();
        clients.forEach(c => {
            const email = c.contactPerson1?.email || c.contactPerson2?.email || "";
            const phone = c.contactPerson1?.phone || c.contactPerson2?.phone || "";
            const info = { clientName: c.clientName, email, phone };
            if (c.legalEntityName) {
                clientMap.set(c.legalEntityName.trim().toLowerCase(), info);
            }
            if (c.clientName) {
                clientMap.set(c.clientName.trim().toLowerCase(), info);
            }
        });

        const formattedPOs = pos.map(po => {
            let name = po.vendorName;
            let email = "";
            let phone = "";
            if (name) {
                const key = name.trim().toLowerCase();
                if (clientMap.has(key)) {
                    const info = clientMap.get(key);
                    name = info.clientName || name;
                    email = info.email || "";
                    phone = info.phone || "";
                }
            }
            return {
                ...po,
                vendorName: name,
                clientEmail: email || po.shipper?.email || po.pi?.lead?.email || "",
                clientPhone: phone || po.shipper?.contactNo || po.pi?.lead?.phone || po.pi?.lead?.mobile || ""
            };
        });

        res.json(formattedPOs);
    } catch (err) {
        console.error("Get POs Error:", err);
        res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
};

// POST /api/purchase-orders/create-from-pi/:id
exports.createPOFromPI = async (req, res) => {
    try {
        const { id } = req.params;
        const piDoc = await Quotation.findById(id).populate("lead");
        if (!piDoc) {
            return res.status(404).json({ message: "Proforma Invoice (PI) not found" });
        }

        // Verify it is a PI
        const isPI = piDoc.quotationNumber && /^PI/i.test(piDoc.quotationNumber);
        if (!isPI) {
            return res.status(400).json({ message: "Selected document is not a Proforma Invoice" });
        }

        // Check if PO already exists for this PI
        const existingPO = await PurchaseOrder.findOne({ pi: id });
        if (existingPO) {
            return res.status(400).json({ message: "Purchase Order already exists for this PI", po: existingPO });
        }

        // Verify that the client's PO Number is present in the PI
        const poNumber = piDoc.poNumber ? piDoc.poNumber.trim() : "";
        if (!poNumber) {
            return res.status(400).json({ 
                message: "Client's PO Number is missing in the Proforma Invoice (PI). Please edit the PI and add the Client's PO Number before converting to an Inward PO." 
            });
        }

        // Ensure unique PO Number across all POs in PO Management
        const existingPOWithNum = await PurchaseOrder.findOne({ poNumber });
        if (existingPOWithNum) {
            return res.status(400).json({ 
                message: `A Purchase Order with PO Number "${poNumber}" already exists in PO Management.` 
            });
        }

        // Map products
        const products = piDoc.products.map(p => ({
            product: p.product,
            productNo: p.productNo,
            name: p.name,
            brand: p.brand,
            type: p.type || p.product?.type || "",
            hsnCode: p.hsnCode,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            gstRate: p.gstRate,
            total: p.total,
            selected: true
        }));

        const Client = require("../models/Client");
        const clientDoc = await Client.findOne({
            $or: [
                { clientName: piDoc.billTo?.name },
                { legalEntityName: piDoc.billTo?.name },
                { clientName: piDoc.lead?.name },
                { legalEntityName: piDoc.lead?.name }
            ]
        }).lean();

        const vendorName = clientDoc ? clientDoc.clientName : (piDoc.billTo?.name || piDoc.lead?.name || "Unknown Vendor");
        const leadNumber = piDoc.lead?.leadNumber || "";

        const newPO = new PurchaseOrder({
            poNumber,
            pi: id,
            vendorName,
            leadNumber,
            totalValue: piDoc.grandTotal || 0,
            status: "Pending",
            type: "inward",
            products,
            createdBy: req.user ? req.user._id : null
        });

        const savedPO = await newPO.save();

        // Mark the PI as converted
        piDoc.isConvertedToPO = true;
        await piDoc.save();

        // Deduct stock for products and record in StockLedger
        try {
            const Product = require("../models/Product");
            const StockLedger = require("../models/StockLedger");
            const { clearCachePrefix } = require("../utils/cache");

            for (const p of piDoc.products) {
                const qtyToSubtract = Number(p.quantity) || 0;
                if (qtyToSubtract <= 0) continue;

                let productDoc = await Product.findById(p.product);
                if (!productDoc && p.productNo) {
                    productDoc = await Product.findOne({ productNo: p.productNo });
                }

                if (productDoc) {
                    // Decrease stock (prevent negative stock)
                    productDoc.quantity = Math.max(0, (productDoc.quantity || 0) - qtyToSubtract);
                    const updatedProduct = await productDoc.save();

                    // Create StockLedger OUT entry
                    const ledgerEntry = new StockLedger({
                        product: updatedProduct._id,
                        productNo: updatedProduct.productNo,
                        brand: updatedProduct.brand,
                        entryType: "OUT",
                        piNo: piDoc.quotationNumber,
                        poNo: poNumber,
                        date: new Date(),
                        quantity: qtyToSubtract,
                        unitPrice: p.unitPrice || 0,
                        balanceAfter: updatedProduct.quantity,
                        remarks: `Subtracted stock upon PI conversion to Inward PO`
                    });
                    await ledgerEntry.save();
                }
            }

            // Clear product and dashboard caches
            clearCachePrefix("product_");
            clearCachePrefix("dashboard_");
        } catch (stockErr) {
            console.error("Error deducting stock in createPOFromPI:", stockErr);
        }

        // Optional: emit socket event if socket is setup
        const io = req.app.get("io");
        if (io) {
            io.emit("poAdded", savedPO);
            io.emit("quotationUpdated", piDoc); // Broadcast that the PI was updated/converted
        }

        res.status(201).json(savedPO);
    } catch (err) {
        console.error("Create PO from PI Error:", err);
        res.status(500).json({ message: "Failed to create Purchase Order from PI" });
    }
};

// PUT /api/purchase-orders/:id
exports.updatePO = async (req, res) => {
    try {
        const { id } = req.params;
        const { products, status, invoiceHistory, isMovedToInvoice, dispatchHistory, terms, termDetails, shipper, installationCharges, freightCartage, estimatedTotal } = req.body;

        const po = await PurchaseOrder.findById(id);
        if (!po) {
            return res.status(404).json({ message: "Purchase Order not found" });
        }

        if (po.type === "inward" && products) {
            const hasSelected = products.some(p => p.selected !== false);
            if (!hasSelected) {
                return res.status(400).json({
                    message: "Alert: Inward PO cannot be updated without selecting at least one item. Please select at least one item."
                });
            }
        }

        let updates = {};

        if (typeof isMovedToInvoice !== "undefined") {
            updates.isMovedToInvoice = isMovedToInvoice;
        }

        // Automatic status calculation for Inward POs in the invoice flow
        let checkProducts = products || po.products;
        let checkMoved = typeof isMovedToInvoice !== "undefined" ? isMovedToInvoice : po.isMovedToInvoice;

        if (po.type === "inward" && checkMoved) {
            const activeProducts = checkProducts || po.products;
            if (activeProducts.length === 0) {
                updates.status = "Pending";
            } else {
                const totalQty = activeProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
                const totalDispatched = activeProducts.reduce((sum, p) => sum + (p.dispatchedQuantity || 0), 0);
                const totalInvoiced = activeProducts.reduce((sum, p) => sum + (p.invoicedQuantity || 0), 0);

                if (totalDispatched > 0) {
                    updates.status = (totalInvoiced > 0 && totalDispatched >= totalInvoiced && totalDispatched >= totalQty) ? "Dispatched" : "Pending";
                } else if (totalInvoiced === 0) {
                    updates.status = "Pending";
                } else {
                    const allBilled = activeProducts.every(p => (p.invoicedQuantity || 0) >= p.quantity);
                    updates.status = allBilled ? "Invoiced" : "Partially Invoiced";
                }
            }
        } else if (status) {
            updates.status = status;
        }

        if (invoiceHistory) {
            updates.invoiceHistory = invoiceHistory;
        }

        if (dispatchHistory) {
            updates.dispatchHistory = dispatchHistory;
        }

        if (terms !== undefined) updates.terms = terms;
        if (termDetails !== undefined) updates.termDetails = termDetails;
        if (shipper !== undefined) updates.shipper = shipper;
        if (installationCharges !== undefined) updates.installationCharges = installationCharges;
        if (freightCartage !== undefined) updates.freightCartage = freightCartage;
        if (estimatedTotal !== undefined) updates.estimatedTotal = estimatedTotal;

        if (products) {
            // Stock reconciliation for Inward PO
            if (po.type === "inward") {
                try {
                    const Product = require("../models/Product");
                    const StockLedger = require("../models/StockLedger");
                    const { clearCachePrefix } = require("../utils/cache");

                    for (const p of products) {
                        const existingProduct = po.products.find(ep => 
                            (ep.product && String(ep.product) === String(p.product)) ||
                            (ep.productNo && ep.productNo === p.productNo)
                        );

                        const wasSelected = existingProduct ? existingProduct.selected !== false : false;
                        const isSelectedNow = p.selected !== false;

                        if (!wasSelected && isSelectedNow) {
                            // Newly selected! Deduct stock
                            const qtyToSubtract = Number(p.quantity) || 0;
                            if (qtyToSubtract > 0) {
                                let productDoc = await Product.findById(p.product);
                                if (!productDoc && p.productNo) {
                                    productDoc = await Product.findOne({ productNo: p.productNo });
                                }
                                if (productDoc) {
                                    productDoc.quantity = Math.max(0, (productDoc.quantity || 0) - qtyToSubtract);
                                    const updatedProduct = await productDoc.save();

                                    const ledgerEntry = new StockLedger({
                                        product: updatedProduct._id,
                                        productNo: updatedProduct.productNo,
                                        brand: updatedProduct.brand,
                                        entryType: "OUT",
                                        piNo: po.pi?.quotationNumber || "",
                                        poNo: po.poNumber,
                                        date: new Date(),
                                        quantity: qtyToSubtract,
                                        unitPrice: p.unitPrice || 0,
                                        balanceAfter: updatedProduct.quantity,
                                        remarks: `Subtracted stock upon item selection update in Inward PO`
                                    });
                                    await ledgerEntry.save();
                                }
                            }
                        } else if (wasSelected && !isSelectedNow) {
                            // Deselected! Revert stock (add back)
                            const qtyToAdd = Number(p.quantity) || 0;
                            if (qtyToAdd > 0) {
                                let productDoc = await Product.findById(p.product);
                                if (!productDoc && p.productNo) {
                                    productDoc = await Product.findOne({ productNo: p.productNo });
                                }
                                if (productDoc) {
                                    productDoc.quantity = (productDoc.quantity || 0) + qtyToAdd;
                                    const updatedProduct = await productDoc.save();

                                    const ledgerEntry = new StockLedger({
                                        product: updatedProduct._id,
                                        productNo: updatedProduct.productNo,
                                        brand: updatedProduct.brand,
                                        entryType: "IN",
                                        piNo: po.pi?.quotationNumber || "",
                                        poNo: po.poNumber,
                                        date: new Date(),
                                        quantity: qtyToAdd,
                                        unitPrice: p.unitPrice || 0,
                                        balanceAfter: updatedProduct.quantity,
                                        remarks: `Reverted stock upon item deselection in Inward PO`
                                    });
                                    await ledgerEntry.save();
                                }
                            }
                        }
                    }
                    clearCachePrefix("product_");
                    clearCachePrefix("dashboard_");
                } catch (cErr) {
                    console.error("Reconciliation error in updatePO:", cErr);
                }
            }

            updates.products = products;
            // Recalculate total value for selected items
            const totalValue = products
                .filter(p => p.selected)
                .reduce((sum, p) => sum + (p.total || 0), 0);
            updates.totalValue = totalValue;
        }

        const updatedPO = await PurchaseOrder.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        ).populate({
            path: "pi",
            populate: {
                path: "lead",
                select: "leadNumber"
              }
        });

        const io = req.app.get("io");
        if (io) {
            io.emit("poUpdated", updatedPO);
        }

        res.json(updatedPO);
    } catch (err) {
        console.error("Update PO Error:", err);
        res.status(500).json({ message: "Failed to update Purchase Order" });
    }
};

// DELETE /api/purchase-orders/:id
exports.deletePO = async (req, res) => {
    try {
        const { id } = req.params;
        const po = await PurchaseOrder.findByIdAndDelete(id);
        if (!po) {
            return res.status(404).json({ message: "Purchase Order not found" });
        }

        const io = req.app.get("io");
        if (io) {
            io.emit("poDeleted", id);
        }

        res.json({ message: "Purchase Order deleted successfully" });
    } catch (err) {
        console.error("Delete PO Error:", err);
        res.status(500).json({ message: "Failed to delete Purchase Order" });
    }
};

// GET /api/purchase-orders/:id/pdf
exports.generatePDF = async (req, res) => {
    try {
        const { id } = req.params;
        const { mode } = req.query;
        const po = await PurchaseOrder.findById(id).populate("pi").populate("shipper").lean();
        if (!po) {
            return res.status(404).json({ message: "Purchase Order not found" });
        }

        if (mode === "dispatch" && po.products) {
            po.products = po.products.filter(p => (p.invoicedQuantity || 0) > 0).map(p => {
                const invs = (po.invoiceHistory || []).filter(inv => 
                    (inv.products || []).some(ip => ip.productNo === p.productNo)
                ).map(inv => inv.invoiceNo);
                const invoiceNo = Array.from(new Set(invs)).join(", ");
                return {
                    ...p,
                    invoiceNo,
                    quantity: p.invoicedQuantity,
                    total: (p.invoicedQuantity || 0) * (p.unitPrice || 0)
                };
            });
            po.totalValue = po.products.reduce((sum, p) => sum + (p.total || 0), 0);
        }

        // Map legalEntityName to clientName
        const Client = require("../models/Client");
        const clientDoc = await Client.findOne({
            $or: [
                { clientName: po.vendorName },
                { legalEntityName: po.vendorName }
            ]
        }).lean();
        
        if (clientDoc) {
            po.vendorName = clientDoc.clientName;
        }

        const doc = new PDFDocument({
            margin: 30,
            size: 'A4',
            info: {
                Title: "Purchase Order",
                Author: "TeamInspire Business Solutions Pvt Ltd"
            }
        });

        // Set response headers
        res.setHeader("Content-Type", "application/pdf");
        const filename = `${po.poNumber}.pdf`;
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
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
            doc.fontSize(10).font('Helvetica-Bold').text("PURCHASE ORDER", 380, 45, { align: 'center', width: 170 });
        }

        doc.moveDown(2);
        const infoY = 90;

        // --- Info Section ---
        const startInfoY = infoY;
        const infoBlockHeight = 80;

        // Details Block
        doc.rect(30, startInfoY, 535, infoBlockHeight).stroke();
        doc.moveTo(225, startInfoY).lineTo(225, startInfoY + infoBlockHeight).stroke();
        doc.moveTo(425, startInfoY).lineTo(425, startInfoY + infoBlockHeight).stroke();
        if (po.type === "outward") {
            doc.moveTo(425, startInfoY + 40).lineTo(565, startInfoY + 40).stroke();
        } else {
            doc.moveTo(425, startInfoY + 20).lineTo(565, startInfoY + 20).stroke();
            doc.moveTo(425, startInfoY + 40).lineTo(565, startInfoY + 40).stroke();
            doc.moveTo(425, startInfoY + 60).lineTo(565, startInfoY + 60).stroke();
        }
        doc.moveTo(485, startInfoY).lineTo(485, startInfoY + infoBlockHeight).stroke();

        if (po.type === "outward" && po.shipper) {
            doc.fontSize(9).font('Helvetica-Bold').text("SHIPPER NAME:", 35, startInfoY + 5);
            doc.fontSize(8).font('Helvetica-Bold').text(po.shipper.billingName || po.shipper.consigneeName, 35, startInfoY + 15, { width: 185 });
            doc.font('Helvetica').text(po.shipper.address || "", 35, doc.y, { width: 185 });
            doc.font('Helvetica-Bold').text(`GSTIN: ${po.shipper.gstin || ""}`, 35, startInfoY + 65);
        } else {
            doc.fontSize(9).font('Helvetica-Bold').text("VENDOR:", 35, startInfoY + 5);
            doc.fontSize(8).font('Helvetica-Bold').text(po.vendorName, 35, startInfoY + 15, { width: 185 });
            if (po.pi && po.pi.billTo) {
                doc.font('Helvetica').text(po.pi.billTo.address || "", 35, doc.y, { width: 185 });
                doc.font('Helvetica-Bold').text(`GSTIN: ${po.pi.billTo.gstin || ""}`, 35, startInfoY + 65);
            }
        }

        doc.fontSize(9).font('Helvetica-Bold').text("DELIVERY TO:", 230, startInfoY + 5);
        if (po.type === "outward" && po.shipper) {
            doc.fontSize(8).font('Helvetica-Bold').text("TeamInspire Business Solutions Pvt Ltd", 230, startInfoY + 15);
            doc.font('Helvetica').text("D730/29, Street No. 11, Ashok Nagar, Shahdara, Delhi, 110093, India", 230, doc.y + 2, { width: 190 });
            doc.font('Helvetica-Bold').text("GSTIN: 07AAFCT5822P1ZT", 230, startInfoY + 65);
        } else {
            doc.fontSize(8).font('Helvetica-Bold').text("TeamInspire Business Solutions Pvt Ltd", 230, startInfoY + 15);
            doc.font('Helvetica').text("D730/29, Street No. 11, Ashok Nagar, Shahdara, Delhi, 110093, India", 230, doc.y + 2, { width: 190 });
            doc.font('Helvetica-Bold').text("GSTIN: 07AAFCT5822P1ZT", 230, startInfoY + 65);
        }

        doc.fontSize(8).font('Helvetica-Bold');
        if (po.type === "outward") {
            doc.fontSize(7).text("Purchase Order No.", 427, startInfoY + 12, { width: 56 }); doc.fontSize(8).font('Helvetica').text(po.poNumber, 488, startInfoY + 16);
            doc.fontSize(7).font('Helvetica-Bold').text("Purchase Order Date", 427, startInfoY + 52, { width: 56 }); doc.fontSize(8).font('Helvetica').text(new Date(po.date).toLocaleDateString("en-GB"), 488, startInfoY + 56);
        } else {
            doc.text("PO No.", 428, startInfoY + 6); doc.font('Helvetica').text(po.poNumber, 488, startInfoY + 6);
            doc.font('Helvetica-Bold').text("PO Date", 428, startInfoY + 26); doc.font('Helvetica').text(new Date(po.date).toLocaleDateString("en-GB"), 488, startInfoY + 26);
            doc.font('Helvetica-Bold').text("PI Ref", 428, startInfoY + 46); doc.font('Helvetica').text(po.pi?.quotationNumber || "-", 488, startInfoY + 46);
            doc.font('Helvetica-Bold').text("Status", 428, startInfoY + 66); doc.font('Helvetica').text(po.status, 488, startInfoY + 66);
        }

        // --- Header Bar ---
        const poHeaderY = startInfoY + infoBlockHeight;
        doc.rect(30, poHeaderY, 535, 20).stroke();
        doc.fontSize(10).font('Helvetica-Bold').text("PURCHASE ORDER", 30, poHeaderY + 5, { align: 'center', width: 535 });

        // --- Items Table ---
        const activeProducts = po.products.filter(p => p.selected !== false);
        const installation = Number(po.installationCharges) || 0;
        const freight = Number(po.freightCartage) || 0;
        const other = 0;
        const insurance = 0;
        const chargesTaxable = installation + freight + insurance + other;
        const chargesGst = chargesTaxable * 0.18;
        const chargesTotal = chargesTaxable + chargesGst;

        const productQtySum = activeProducts.reduce((acc, p) => acc + (p.quantity || 0), 0);
        const productTaxableSum = activeProducts.reduce((acc, p) => {
            const lineTotal = (p.quantity || 0) * (p.unitPrice || 0);
            return acc + lineTotal;
        }, 0);
        const productGstSum = activeProducts.reduce((acc, p) => {
            const lineTotal = (p.quantity || 0) * (p.unitPrice || 0);
            return acc + (lineTotal * (p.gstRate || 0) / 100);
        }, 0);
        const productTotalSum = productTaxableSum + productGstSum;

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
                ...activeProducts.map((p, index) => {
                    const taxable = (p.quantity || 0) * (p.unitPrice || 0);
                    const gstRate = p.gstRate || 0;
                    const gstVal = taxable * (gstRate / 100);
                    const total = taxable + gstVal;
                    return {
                        sl: (index + 1).toString(),
                        brand: p.brand || "",
                        model: p.productNo || "",
                        desc: p.invoiceNo ? `${p.name || ""} (Invoice No: ${p.invoiceNo})` : (p.name || ""),
                        hsn: p.hsnCode || "",
                        uom: p.uom || "PCS",
                        qty: p.quantity?.toString() || "0",
                        rate: (p.unitPrice || 0).toFixed(2),
                        taxable: taxable.toFixed(2),
                        gstRate: gstRate.toString(),
                        gstVal: gstVal.toFixed(2),
                        total: total.toFixed(2)
                    };
                }),
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

        if (chargesTaxable > 0) {
            table.datas.push({
                sl: "",
                brand: "",
                model: "",
                desc: "CARTAGE/FREIGHT/INSTALLATION",
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
            prepareRow: (row) => {
                if (row.desc === "Itemised Total" || row.desc === "CARTAGE/FREIGHT/INSTALLATION") {
                    doc.font("Helvetica-Bold").fontSize(6.5);
                } else {
                    doc.font("Helvetica").fontSize(6.5);
                }
            },
            padding: 2,
            x: 30,
            y: poHeaderY + 20,
            width: 535
        });

        const tableBottomY = doc.y;
        const tableStartY = poHeaderY + 20;
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

        const subTotalCalculated = productTaxableSum + chargesTaxable;
        const gstTotalCalculated = productGstSum + chargesGst;
        const finalSubTotal = subTotalCalculated + gstTotalCalculated;
        const grandTotal = Math.round(finalSubTotal);
        const roundOff = grandTotal - finalSubTotal;
        
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text("Sub Total", 375, totalsY + 6, { width: 110, align: 'right' });
        doc.font('Helvetica').text(finalSubTotal.toFixed(2), 490, totalsY + 6, { width: 71, align: 'right' });

        doc.font('Helvetica-Bold').text("Round Off (+/-)", 375, totalsY + 26, { width: 110, align: 'right' });
        doc.font('Helvetica').text(roundOff.toFixed(2), 490, totalsY + 26, { width: 71, align: 'right' });

        doc.fontSize(9).font('Helvetica-Bold').text("Grand Total", 375, totalsY + 46, { width: 110, align: 'right' });
        doc.text(`Rs. ${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 490, totalsY + 46, { width: 71, align: 'right' });

        doc.y = totalsY + 60;
        doc.moveDown(1.5);

        // --- Terms & Conditions ---
        if (po.terms || (po.type === "outward")) {
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
            doc.moveTo(30, termsBoxY).lineTo(565, termsBoxY).stroke();

            const terms = [
                { l: "Delivery Lead Time", v: po.terms?.deliveryLeadTime || po.deliveryLeadTime || '-' },
                { l: "Payment", v: po.terms?.payment || po.paymentTerms || '-' },
                { l: "Warranty Terms", v: po.terms?.warranty || '-' },
                { l: "Delivery Terms", v: po.terms?.deliveryTerms || '-' },
                { l: "GST", v: "Any GST additional liability arising due to changes in billing location, place of supply and GST applicability after PO shall be to customer's account." },
                { l: "HS Code", v: "HSN codes and GST rates are subject to Govt/GST rules, regulations, notifications, circulars, court or tribunal judgements, legal interpretation etc and subject to change from time to time/ as applicable without prior notice. Prevailing classification and GST rates at the time of transaction will apply." },
                { l: "Remarks", v: po.terms?.remark || "" }
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
                    doc.moveTo(30, termsStartPageY).lineTo(30, currentTermsY).stroke();
                    doc.moveTo(55, termsStartPageY).lineTo(55, currentTermsY).stroke();
                    doc.moveTo(165, termsStartPageY).lineTo(165, currentTermsY).stroke();
                    doc.moveTo(565, termsStartPageY).lineTo(565, currentTermsY).stroke();

                    doc.addPage();
                    currentTermsY = 30;
                    termsStartPageY = 30;
                    doc.moveTo(30, currentTermsY).lineTo(565, currentTermsY).stroke();
                }

                doc.font('Helvetica').text((i + 1).toString(), 30, currentTermsY + 4, { align: 'center', width: 25 });
                doc.font('Helvetica-Bold').text(t.l, 60, currentTermsY + 4, { width: 100 });

                if (isWarranty && p2) {
                    const p1Height = doc.font('Helvetica').heightOfString(p1, { width: 390 });
                    const middleY = currentTermsY + p1Height + 6;

                    doc.font('Helvetica').text(p1, 170, currentTermsY + 4, { width: 390 });
                    doc.moveTo(165, middleY).lineTo(565, middleY).stroke();
                    doc.font('Helvetica').text(p2, 170, middleY + 4, { width: 390 });
                } else {
                    doc.font('Helvetica').text(valStr, 170, currentTermsY + 4, { width: 390 });
                }

                doc.moveTo(30, currentTermsY + rowHeight).lineTo(565, currentTermsY + rowHeight).stroke();
                currentTermsY += rowHeight;
            });

            doc.moveTo(30, termsStartPageY).lineTo(30, currentTermsY).stroke();
            doc.moveTo(55, termsStartPageY).lineTo(55, currentTermsY).stroke();
            doc.moveTo(165, termsStartPageY).lineTo(165, currentTermsY).stroke();
            doc.moveTo(565, termsStartPageY).lineTo(565, currentTermsY).stroke();
        }

        // --- Footer Section ---
        doc.moveDown(2);
        if (doc.y > 730) {
            doc.addPage();
        }
        const footerY = doc.y + 10;
        doc.fontSize(9).font('Helvetica-Bold').text("For TeamInspire Business Solutions Pvt Ltd", 35, footerY, { align: 'left', width: 300 });
        
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
        console.error("Generate PO PDF Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ message: "Failed to generate Purchase Order PDF" });
        }
    }
};

// POST /api/purchase-orders/outward
exports.createOutwardPO = async (req, res) => {
    try {
        const { shipper, products, installationCharges, freightCartage, estimatedTotal, deliveryLeadTime, paymentTerms } = req.body;

        // Generate PO Number (e.g. OPO-1)
        const lastPO = await PurchaseOrder.findOne({ type: "outward" }).sort({ createdAt: -1 });
        let nextNumber = 1;
        if (lastPO && lastPO.poNumber && lastPO.poNumber.startsWith("OPO-")) {
            const numPart = parseInt(lastPO.poNumber.split("-")[1], 10);
            if (!isNaN(numPart)) {
                nextNumber = numPart + 1;
            }
        }
        const poNumber = `OPO-${nextNumber}`;

        const newPO = new PurchaseOrder({
            poNumber,
            type: "outward",
            shipper,
            products,
            totalValue: estimatedTotal || 0,
            installationCharges: installationCharges || 0,
            freightCartage: freightCartage || 0,
            deliveryLeadTime: deliveryLeadTime || "",
            paymentTerms: paymentTerms || "",
            status: "Pending",
            createdBy: req.user ? req.user._id : null
        });

        const savedPO = await newPO.save();
        res.status(201).json(savedPO);
    } catch (err) {
        console.error("Create Outward PO Error:", err);
        res.status(500).json({ message: "Failed to create outward PO" });
    }
};

// POST /api/purchase-orders/send-email
exports.sendDispatchEmail = async (req, res) => {
    try {
        const { to, cc, subject, htmlBody } = req.body;
        if (!to || !subject || !htmlBody) {
            return res.status(400).json({ message: "To email, Subject, and Body are required." });
        }

        const nodemailer = require("nodemailer");
        const smtpHost = process.env.SMTP_HOST || "mail.teaminspire.co.in";
        const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
        const smtpUser = process.env.SMTP_USER || "dispatch@teaminspire.co.in";
        const smtpPass = process.env.SMTP_PASS;

        if (!smtpPass) {
            return res.status(400).json({ 
                message: "SMTP Password not configured in server .env file. Please set SMTP_PASS in backend/.env." 
            });
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: `"Dispatch TeamInspire" <${smtpUser}>`,
            to,
            cc: cc || undefined,
            subject,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Dispatch email sent cleanly via SMTP:", info.messageId);

        res.status(200).json({ 
            success: true, 
            message: "Email sent successfully!", 
            messageId: info.messageId 
        });
    } catch (err) {
        console.error("Direct SMTP Send Error:", err);
        res.status(500).json({ 
            success: false, 
            message: err.message || "Failed to send email via SMTP" 
        });
    }
};
