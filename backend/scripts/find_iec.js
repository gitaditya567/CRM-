const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Lead = require('../models/Lead');
const Product = require('../models/Product');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        const searchStr = '3105';

        // Search Quotations
        const quotes = await Quotation.find({
            $or: [
                { quotationNumber: new RegExp(searchStr, 'i') },
                { poNumber: new RegExp(searchStr, 'i') }
            ]
        });
        console.log('Quotations found:', quotes.length);
        quotes.forEach(q => {
            console.log('Quote ID:', q._id, '| QuoteNo:', q.quotationNumber, '| PONo:', q.poNumber, '| Status:', q.status);
            console.log('Products:', q.products.map(p => ({ productNo: p.productNo, name: p.name, quantity: p.quantity, unitPrice: p.unitPrice, total: p.total })));
        });

        // Search PurchaseOrders
        const pos = await PurchaseOrder.find({
            $or: [
                { poNumber: new RegExp(searchStr, 'i') },
                { leadNumber: new RegExp(searchStr, 'i') }
            ]
        });
        console.log('POs found:', pos.length);
        pos.forEach(p => {
            console.log('PO ID:', p._id, '| PONo:', p.poNumber, '| Type:', p.type, '| Status:', p.status);
            console.log('Products:', p.products.map(pr => ({ productNo: pr.productNo, name: pr.name, quantity: pr.quantity, unitPrice: pr.unitPrice, total: pr.total })));
        });

        // Search Product model for RCS511
        const prods = await Product.find({
            $or: [
                { name: /RCS511/i },
                { productNo: /RCS511/i },
                { description: /RCS511/i }
            ]
        });
        console.log('Products matching RCS511:', prods.length);
        prods.forEach(p => console.log('Product:', p._id, p.productNo, p.name));

        // If not found in exact fields, search all Quotations for RCS511 or 3105 in any field
        if (quotes.length === 0 && pos.length === 0) {
            console.log('Searching all Quotations by regex 3105 or IEC...');
            const quotesAll = await Quotation.find({
                $or: [
                    { quotationNumber: /IEC/i },
                    { poNumber: /IEC/i },
                    { 'products.name': /RCS511/i },
                    { 'products.productNo': /RCS511/i }
                ]
            });
            console.log('Quotation regex search:', quotesAll.length);
            quotesAll.forEach(q => {
                console.log('Match Quote:', q._id, q.quotationNumber, q.poNumber);
                console.log('Products:', q.products.map(p => ({ productNo: p.productNo, name: p.name, quantity: p.quantity })));
            });

            console.log('Searching all PurchaseOrders by regex IEC or RCS511...');
            const posAll = await PurchaseOrder.find({
                $or: [
                    { poNumber: /IEC/i },
                    { 'products.name': /RCS511/i },
                    { 'products.productNo': /RCS511/i }
                ]
            });
            console.log('PO regex search:', posAll.length);
            posAll.forEach(p => {
                console.log('Match PO:', p._id, p.poNumber, p.type);
                console.log('Products:', p.products.map(pr => ({ productNo: pr.productNo, name: pr.name, quantity: pr.quantity })));
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}
main();
