const fs = require('fs');
const path = require('path');

const poPath = path.join(__dirname, '..', 'controllers', 'poController.js');
let poContent = fs.readFileSync(poPath, 'utf8');

const regex = /exports\.generatePDF = async \(req, res\) => \{[\s\S]*?\n\};\n\n\/\/ POST \/api\/purchase-orders\/outward/;

const newGeneratePDF = `exports.generatePDF = async (req, res) => {
    try {
        const { id } = req.params;
        const { mode } = req.query;
        const po = await PurchaseOrder.findById(id).populate("pi").lean();
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
        const filename = \`\${po.poNumber}.pdf\`;
        res.setHeader("Content-Disposition", \`inline; filename="\${filename}"\`);
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
        doc.moveTo(425, startInfoY + 20).lineTo(565, startInfoY + 20).stroke();
        doc.moveTo(425, startInfoY + 40).lineTo(565, startInfoY + 40).stroke();
        doc.moveTo(425, startInfoY + 60).lineTo(565, startInfoY + 60).stroke();
        doc.moveTo(485, startInfoY).lineTo(485, startInfoY + infoBlockHeight).stroke();

        doc.fontSize(9).font('Helvetica-Bold').text("VENDOR:", 35, startInfoY + 5);
        if (po.type === "outward" && po.shipper) {
            doc.fontSize(8).font('Helvetica-Bold').text(po.shipper.billingName || po.shipper.consigneeName, 35, startInfoY + 15, { width: 185 });
            doc.font('Helvetica').text(po.shipper.address || "", 35, doc.y, { width: 185 });
            doc.font('Helvetica-Bold').text(\`GSTIN: \${po.shipper.gstin || ""}\`, 35, startInfoY + 65);
        } else {
            doc.fontSize(8).font('Helvetica-Bold').text(po.vendorName, 35, startInfoY + 15, { width: 185 });
            if (po.pi && po.pi.billTo) {
                doc.font('Helvetica').text(po.pi.billTo.address || "", 35, doc.y, { width: 185 });
                doc.font('Helvetica-Bold').text(\`GSTIN: \${po.pi.billTo.gstin || ""}\`, 35, startInfoY + 65);
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
        doc.text("PO No.", 428, startInfoY + 6); doc.font('Helvetica').text(po.poNumber, 488, startInfoY + 6);
        doc.font('Helvetica-Bold').text("PO Date", 428, startInfoY + 26); doc.font('Helvetica').text(new Date(po.date).toLocaleDateString("en-GB"), 488, startInfoY + 26);
        doc.font('Helvetica-Bold').text("PI Ref", 428, startInfoY + 46); doc.font('Helvetica').text(po.pi?.quotationNumber || "-", 488, startInfoY + 46);
        doc.font('Helvetica-Bold').text("Status", 428, startInfoY + 66); doc.font('Helvetica').text(po.status, 488, startInfoY + 66);

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
                { label: "Sl.\\nNo.", property: 'sl', width: 20, align: 'center' },
                { label: "Brand", property: 'brand', width: 40, align: 'center' },
                { label: "Model No/Part Code", property: 'model', width: 70, align: 'center' },
                { label: "Description", property: 'desc', width: 95 },
                { label: "HSN Code", property: 'hsn', width: 45, align: 'center' },
                { label: "UOM", property: 'uom', width: 25, align: 'center' },
                { label: "QTY", property: 'qty', width: 20, align: 'center' },
                { label: "Unit Rate (Rs.)", property: 'rate', width: 45, align: 'right' },
                { label: "Taxable Value\\n(Rs.)", property: 'taxable', width: 55, align: 'right' },
                { label: "GST\\nRate (%)", property: 'gstRate', width: 30, align: 'center' },
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
                        desc: p.invoiceNo ? \`\${p.name || ""} (Invoice No: \${p.invoiceNo})\` : (p.name || ""),
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
        doc.text(\`Rs. \${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\`, 490, totalsY + 46, { width: 71, align: 'right' });

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
                { l: "Note", v: "Road permit will be as applicable in respective states." },
                { l: "Validity", v: po.terms?.validity || "30 Days from the date of PI." },
                { l: "GST", v: "Any GST additional liability arising due to changes in billing location, place of supply and GST applicability after PO shall be to customer's account." },
                { l: "Packaging", v: "Standard original OEM/Supplier packaging. If Wooden packing is required, will charged seperately on actual basis." },
                { l: "HS Code", v: "HSN codes and GST rates are subject to Govt/GST rules, regulations, notifications, circulars, court or tribunal judgements, legal interpretation etc and subject to change from time to time/ as applicable without prior notice. Prevailing classification and GST rates at the time of transaction will apply." },
                { l: "Bank Details", v: "Bank Name: ICICI Bank Ltd, Account Number: 135505500940, Bank Account Name: TeamInspire Business Solutions Pvt Ltd, IFSC/RTGS Number: ICIC0001355" },
                { l: "Special Note", v: "In-view of the current Global Shipping Scenario, the shipments may be a subject to delay which is out of human control and thus the same shall be covered under the Force Majeure Clause. Price quoted is valid if the order issued for all the quoted items with the same quantity. Any change in quantity/order can be discussed case to case basis." },
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
        const footerY = Math.max(doc.y, 700);
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

// POST /api/purchase-orders/outward`;

poContent = poContent.replace(regex, newGeneratePDF);

fs.writeFileSync(poPath, poContent);
console.log('Successfully updated poController.js');
