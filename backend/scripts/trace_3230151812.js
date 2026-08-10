const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const PurchaseOrder = require('../models/PurchaseOrder');
const Quotation = require('../models/Quotation');
const Lead = require('../models/Lead');
const Product = require('../models/Product');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const queryStr = '3230151812';

        console.log(`=== Searching for "${queryStr}" across PurchaseOrders ===`);

        // Search POs by trackingNo, invoiceNo, poNumber, leadNumber, productNo, etc.
        const pos = await PurchaseOrder.find({
            $or: [
                { poNumber: new RegExp(queryStr, 'i') },
                { leadNumber: new RegExp(queryStr, 'i') },
                { 'products.productNo': new RegExp(queryStr, 'i') },
                { 'dispatchHistory.trackingNo': new RegExp(queryStr, 'i') },
                { 'dispatchHistory.courierName': new RegExp(queryStr, 'i') },
                { 'invoiceHistory.invoiceNo': new RegExp(queryStr, 'i') }
            ]
        }).lean();

        console.log(`Found ${pos.length} PurchaseOrder(s):`);
        pos.forEach((po, idx) => {
            console.log(`\n--- PO #${idx + 1} ---`);
            console.log(`PO ID: ${po._id}`);
            console.log(`PO Number: ${po.poNumber}`);
            console.log(`Type: ${po.type}`);
            console.log(`Status: ${po.status}`);
            console.log(`isMovedToInvoice: ${po.isMovedToInvoice}`);
            console.log(`Vendor/Client: ${po.vendorName}`);
            console.log(`Lead Number: ${po.leadNumber}`);
            console.log(`PI ID: ${po.pi}`);

            console.log(`\nProducts (${po.products?.length || 0}):`);
            po.products?.forEach(p => {
                console.log(`  - Code: ${p.productNo} | Name: ${p.name} | Qty: ${p.quantity} | InvoicedQty: ${p.invoicedQuantity} | DispatchedQty: ${p.dispatchedQuantity} | Selected: ${p.selected}`);
            });

            console.log(`\nInvoice History (${po.invoiceHistory?.length || 0}):`);
            po.invoiceHistory?.forEach(inv => {
                console.log(`  - InvoiceNo: ${inv.invoiceNo} | Date: ${inv.date} | Total: ${inv.totalValue}`);
                inv.products?.forEach(ip => {
                    console.log(`      * Product: ${ip.productNo} (${ip.name}) | Qty: ${ip.quantity}`);
                });
            });

            console.log(`\nDispatch History (${po.dispatchHistory?.length || 0}):`);
            po.dispatchHistory?.forEach(disp => {
                console.log(`  - Courier: ${disp.courierName} | TrackingNo: ${disp.trackingNo} | Date: ${disp.dispatchDate}`);
                disp.products?.forEach(dp => {
                    console.log(`      * Product: ${dp.productNo} (${dp.name}) | Qty: ${dp.quantity}`);
                });
            });
        });

        // If no direct field match, search all POs for trackingNo containing 3230151812 or any string match
        if (pos.length === 0) {
            console.log('\nSearching all PO dispatch history for tracking numbers...');
            const allPOs = await PurchaseOrder.find({ 'dispatchHistory': { $exists: true, $not: { $size: 0 } } }).lean();
            console.log(`Checking ${allPOs.length} POs with dispatch history...`);
            allPOs.forEach(p => {
                p.dispatchHistory?.forEach(dh => {
                    if (dh.trackingNo && dh.trackingNo.includes(queryStr)) {
                        console.log(`Match in PO ${p.poNumber}: Courier ${dh.courierName}, Tracking ${dh.trackingNo}`);
                    }
                });
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}
main();
