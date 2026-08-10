const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Lead = require('../models/Lead');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // --- TASK 1: B202606-02815 ---
        console.log('\n================ TASK 1: Searching for B202606-02815 ================');
        const po1 = await PurchaseOrder.find({
            $or: [
                { poNumber: /B202606-02815/i },
                { leadNumber: /B202606-02815/i },
                { 'products.productNo': /B202606-02815/i },
                { 'invoiceHistory.invoiceNo': /B202606-02815/i }
            ]
        }).lean();
        console.log('POs found for B202606-02815:', po1.length);
        po1.forEach(p => console.log('PO:', p._id, p.poNumber, p.vendorName, p.products));

        const quotes1 = await Quotation.find({
            $or: [
                { quotationNumber: /B202606-02815/i },
                { poNumber: /B202606-02815/i }
            ]
        }).lean();
        console.log('Quotations found for B202606-02815:', quotes1.length);
        quotes1.forEach(q => console.log('Quote:', q._id, q.quotationNumber, q.poNumber, q.products));

        if (po1.length === 0 && quotes1.length === 0) {
            console.log('Searching all POs and Quotations for partial 02815 or 12155...');
            const posPartial = await PurchaseOrder.find({
                $or: [
                    { poNumber: /02815/i },
                    { 'products.unitPrice': 12155 },
                    { 'products.total': 12155 }
                ]
            }).lean();
            console.log('POs partial match (02815 / 12155):', posPartial.length);
            posPartial.forEach(p => console.log('Partial PO:', p._id, p.poNumber, p.products.map(pr => ({ productNo: pr.productNo, name: pr.name, unitPrice: pr.unitPrice, quantity: pr.quantity, total: pr.total }))));

            const quotesPartial = await Quotation.find({
                $or: [
                    { quotationNumber: /02815/i },
                    { poNumber: /02815/i },
                    { 'products.unitPrice': 12155 }
                ]
            }).lean();
            console.log('Quotations partial match (02815 / 12155):', quotesPartial.length);
            quotesPartial.forEach(q => console.log('Partial Quote:', q._id, q.quotationNumber, q.poNumber, q.products.map(pr => ({ productNo: pr.productNo, name: pr.name, unitPrice: pr.unitPrice, quantity: pr.quantity, total: pr.total }))));
        }

        // --- TASK 2: Q-2627-KG-728 ---
        console.log('\n================ TASK 2: Searching for Q-2627-KG-728 ================');
        const quotes2 = await Quotation.find({
            $or: [
                { quotationNumber: /KG-728/i },
                { poNumber: /KG-728/i }
            ]
        }).lean();
        console.log('Quotations found for KG-728:', quotes2.length);
        quotes2.forEach(q => console.log('Quote:', q._id, q.quotationNumber, q.poNumber, q.status, q.isConvertedToPO));

        const pos2 = await PurchaseOrder.find({
            $or: [
                { poNumber: /KG-728/i },
                { pi: { $in: quotes2.map(q => q._id) } }
            ]
        }).lean();
        console.log('POs found for KG-728:', pos2.length);
        pos2.forEach(p => console.log('PO:', p._id, p.poNumber, p.type, p.status, p.pi));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}
main();
