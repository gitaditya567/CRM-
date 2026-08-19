const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Product = require('../models/Product');
const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');

async function checkAndInspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        console.log('Connected to MongoDB');

        // Check Product Master
        const products = await Product.find({
            productNo: { $in: [/^GS\.3891B$/i, /^GS\.2017$/i, /GS\.3891B/i, /GS\.2017/i] }
        });
        console.log('--- Matching Master Products ---');
        console.log(products.map(p => ({ id: p._id, productNo: p.productNo, name: p.name, brand: p.brand })));

        // Check Nayati brands formatting in Product Master
        const nayatiProducts = await Product.find({ brand: { $regex: /nayati/i } }).limit(5);
        console.log('--- Sample Nayati products in master ---');
        console.log(nayatiProducts.map(p => ({ productNo: p.productNo, brand: p.brand })));

        // Check Quotations
        const quotations = await Quotation.find({
            "products.productNo": { $in: [/^GS\.3891B$/i, /^GS\.2017$/i, /GS\.3891B/i, /GS\.2017/i] }
        });
        console.log('--- Matching Quotations ---');
        quotations.forEach(q => {
            console.log({
                quotationNumber: q.quotationNumber,
                items: q.products.filter(p => /GS\.3891B|GS\.2017/i.test(p.productNo)).map(p => ({ productNo: p.productNo, brand: p.brand }))
            });
        });

        // Check Purchase Orders
        const pos = await PurchaseOrder.find({
            "products.productNo": { $in: [/^GS\.3891B$/i, /^GS\.2017$/i, /GS\.3891B/i, /GS\.2017/i] }
        });
        console.log('--- Matching Purchase Orders ---');
        pos.forEach(po => {
            console.log({
                poNumber: po.poNumber,
                items: po.products.filter(p => /GS\.3891B|GS\.2017/i.test(p.productNo)).map(p => ({ productNo: p.productNo, brand: p.brand }))
            });
        });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.connection.close();
    }
}

checkAndInspect();
