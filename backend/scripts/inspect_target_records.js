const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.log('DNS set error:', e.message);
}
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Lead = require('../models/Lead');

async function inspect() {
    try {
        console.log('Connecting to MongoDB at:', process.env.MONGO_URI ? 'URI present' : 'URI MISSING');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        console.log('Connected to MongoDB successfully!');

        console.log('=== SEARCHING QUOTATIONS ===');
        const quotations = await Quotation.find({
            $or: [
                { quotationNumber: { $regex: /819|873|100221/i } },
                { poNumber: { $regex: /819|873|100221/i } }
            ]
        }).populate('lead');

        console.log(`Found ${quotations.length} matching quotations:`);
        quotations.forEach(q => {
            console.log(JSON.stringify({
                _id: q._id,
                quotationNumber: q.quotationNumber,
                poNumber: q.poNumber,
                status: q.status,
                isConvertedToPO: q.isConvertedToPO,
                lead: q.lead ? { id: q.lead._id, leadNumber: q.lead.leadNumber, status: q.lead.status, name: q.lead.name } : null,
                products: q.products.map(p => ({
                    productNo: p.productNo,
                    name: p.name,
                    brand: p.brand,
                    quantity: p.quantity,
                    unitPrice: p.unitPrice,
                    total: p.total
                })),
                grandTotal: q.grandTotal
            }, null, 2));
        });

        console.log('\n=== SEARCHING PURCHASE ORDERS ===');
        const pos = await PurchaseOrder.find({
            $or: [
                { poNumber: { $regex: /819|873|100221/i } },
                { leadNumber: { $regex: /819|873|100221/i } }
            ]
        }).populate('pi');

        console.log(`Found ${pos.length} matching Purchase Orders:`);
        pos.forEach(po => {
            console.log(JSON.stringify({
                _id: po._id,
                poNumber: po.poNumber,
                type: po.type,
                status: po.status,
                leadNumber: po.leadNumber,
                pi: po.pi ? { _id: po.pi._id, quotationNumber: po.pi.quotationNumber, poNumber: po.pi.poNumber } : po.pi,
                products: po.products.map(p => ({
                    productNo: p.productNo,
                    name: p.name,
                    brand: p.brand,
                    quantity: p.quantity,
                    unitPrice: p.unitPrice,
                    total: p.total
                })),
                totalValue: po.totalValue
            }, null, 2));
        });

        if (quotations.length > 0) {
            const qIds = quotations.map(q => q._id);
            const posLinked = await PurchaseOrder.find({ pi: { $in: qIds } });
            console.log(`\n=== POS LINKED BY PI ID (${posLinked.length}) ===`);
            posLinked.forEach(po => {
                console.log(JSON.stringify({
                    _id: po._id,
                    poNumber: po.poNumber,
                    type: po.type,
                    status: po.status,
                    totalValue: po.totalValue
                }, null, 2));
            });
        }

    } catch (e) {
        console.error('Inspection error:', e);
    } finally {
        await mongoose.connection.close();
    }
}

inspect();
