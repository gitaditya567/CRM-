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
            .sort({ createdAt: -1 })
            .lean();

        res.json(pos);
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
            hsnCode: p.hsnCode,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            gstRate: p.gstRate,
            total: p.total,
            selected: true
        }));

        const vendorName = piDoc.billTo?.name || piDoc.lead?.name || "Unknown Vendor";
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
        const { products, status } = req.body;

        const po = await PurchaseOrder.findById(id);
        if (!po) {
            return res.status(404).json({ message: "Purchase Order not found" });
        }

        let updates = {};

        if (status) {
            updates.status = status;
        }

        if (products) {
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
        const po = await PurchaseOrder.findById(id).populate("pi").lean();
        if (!po) {
            return res.status(404).json({ message: "Purchase Order not found" });
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

        // Draw page borders
        const drawPageBorder = () => {
            doc.rect(30, 20, 535, 802).stroke();
        };

        drawPageBorder();
        doc.on('pageAdded', () => {
            drawPageBorder();
        });

        // --- Header Section ---
        doc.rect(30, 20, 535, 70).stroke();
        
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a237e').text("TeamInspire Business Solutions Pvt Ltd", 35, 30);
        doc.fontSize(8).font('Helvetica').fillColor('#000000');
        doc.text("D730/29, Street No. 11, Ashok Nagar, Shahdara, Delhi, 110093, India", 35, 48);
        doc.text("E: deepak.gupta@teaminspire.co.in, spares@teaminspire.co.in", 35, 58);
        doc.text("Contact No. +91 9013589766, +91 9560825111", 35, 68);
        doc.font('Helvetica-Bold').text("GSTIN: 07AAFCT5822P1ZT", 35, 78);

        // Divider
        doc.moveTo(370, 20).lineTo(370, 90).stroke();
        
        try {
            const logoPath = path.join(__dirname, "..", "..", "frontend", "public", "logo.png");
            doc.image(logoPath, 380, 25, { width: 170 });
        } catch (e) {
            doc.fontSize(10).font('Helvetica-Bold').text("PURCHASE ORDER", 380, 45, { align: 'center', width: 170 });
        }

        doc.moveDown(2);
        const infoY = 90;

        // Details block
        doc.rect(30, infoY, 535, 80).stroke();
        doc.moveTo(225, infoY).lineTo(225, infoY + 80).stroke();
        doc.moveTo(425, infoY).lineTo(425, infoY + 80).stroke();
        doc.moveTo(425, infoY + 20).lineTo(565, infoY + 20).stroke();
        doc.moveTo(425, infoY + 40).lineTo(565, infoY + 40).stroke();
        doc.moveTo(425, infoY + 60).lineTo(565, infoY + 60).stroke();
        doc.moveTo(485, infoY).lineTo(485, infoY + 80).stroke();

        // Vendor Details
        doc.fontSize(9).font('Helvetica-Bold').text("VENDOR:", 35, infoY + 5);
        doc.fontSize(8).font('Helvetica-Bold').text(po.vendorName, 35, infoY + 15, { width: 185 });
        if (po.pi && po.pi.billTo) {
            doc.font('Helvetica').text(po.pi.billTo.address || "", 35, doc.y, { width: 185 });
            doc.font('Helvetica-Bold').text(`GSTIN: ${po.pi.billTo.gstin || ""}`, 35, infoY + 65);
        }

        // Ship To / Delivery to
        doc.fontSize(9).font('Helvetica-Bold').text("DELIVERY TO:", 230, infoY + 5);
        doc.fontSize(8).font('Helvetica').text("TeamInspire Business Solutions Pvt Ltd", 230, infoY + 15);
        doc.text("D730/29, Street No. 11, Ashok Nagar, Shahdara, Delhi, 110093, India", 230, doc.y + 2, { width: 190 });

        // PO Info Right Side
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text("PO No.", 428, infoY + 6); doc.font('Helvetica').text(po.poNumber, 488, infoY + 6);
        doc.font('Helvetica-Bold').text("PO Date", 428, infoY + 26); doc.font('Helvetica').text(new Date(po.date).toLocaleDateString("en-GB"), 488, infoY + 26);
        doc.font('Helvetica-Bold').text("PI Ref", 428, infoY + 46); doc.font('Helvetica').text(po.pi?.quotationNumber || "-", 488, infoY + 46);
        doc.font('Helvetica-Bold').text("Status", 428, infoY + 66); doc.font('Helvetica').text(po.status, 488, infoY + 66);

        // --- PURCHASE ORDER Header Bar ---
        const poHeaderY = infoY + 80;
        doc.rect(30, poHeaderY, 535, 20).stroke();
        doc.fontSize(10).font('Helvetica-Bold').text("PURCHASE ORDER", 30, poHeaderY + 5, { align: 'center', width: 535 });

        // --- Table ---
        const activeProducts = po.products.filter(p => p.selected);
        const qtySum = activeProducts.reduce((acc, p) => acc + (p.quantity || 0), 0);
        const totalSum = activeProducts.reduce((acc, p) => acc + (p.total || 0), 0);

        const table = {
            headers: [
                { label: "Sl. No.", property: 'sl', width: 30, align: 'center' },
                { label: "Brand", property: 'brand', width: 60, align: 'center' },
                { label: "Model / Part Code", property: 'model', width: 90, align: 'center' },
                { label: "Description", property: 'desc', width: 155 },
                { label: "HSN", property: 'hsn', width: 45, align: 'center' },
                { label: "QTY", property: 'qty', width: 30, align: 'center' },
                { label: "Rate (Rs.)", property: 'rate', width: 60, align: 'right' },
                { label: "Total (Rs.)", property: 'total', width: 65, align: 'right' }
            ],
            datas: [
                ...activeProducts.map((p, index) => ({
                    sl: (index + 1).toString(),
                    brand: p.brand || "",
                    model: p.productNo || "",
                    desc: p.name || "",
                    hsn: p.hsnCode || "",
                    qty: p.quantity?.toString() || "0",
                    rate: (p.unitPrice || 0).toFixed(2),
                    total: (p.total || 0).toFixed(2)
                })),
                {
                    sl: "",
                    brand: "",
                    model: "",
                    desc: "Total Value",
                    hsn: "",
                    qty: qtySum.toString(),
                    rate: "",
                    total: totalSum.toFixed(2)
                }
            ]
        };

        await doc.table(table, {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(7.5),
            prepareRow: (row) => {
                if (row.desc === "Total Value") {
                    doc.font("Helvetica-Bold").fontSize(7.5);
                } else {
                    doc.font("Helvetica").fontSize(7.5);
                }
            },
            padding: 3,
            x: 30,
            y: poHeaderY + 20,
            width: 535
        });

        // Vertical Grid Dividers
        const tableBottomY = doc.y;
        const tableStartY = poHeaderY + 20;
        const colXCoords = [30, 60, 120, 210, 365, 410, 440, 500, 565];
        doc.lineWidth(0.5).strokeColor('#000000');
        colXCoords.forEach(x => {
            doc.moveTo(x, tableStartY).lineTo(x, tableBottomY).stroke();
        });
        doc.moveTo(30, tableStartY).lineTo(565, tableStartY).stroke();
        doc.moveTo(30, tableBottomY).lineTo(565, tableBottomY).stroke();

        // --- Signature ---
        doc.moveDown(2);
        if (doc.y > 680) doc.addPage();
        const sigY = doc.y + 40;
        doc.fontSize(8).font('Helvetica-Bold').text("For TeamInspire Business Solutions Pvt Ltd", 350, sigY);
        doc.moveDown(3);
        doc.font('Helvetica').text("Authorized Signatory", 350, doc.y + 20);

        doc.end();
    } catch (err) {
        console.error("Generate PO PDF Error:", err);
        res.status(500).json({ message: "Failed to generate Purchase Order PDF" });
    }
};
