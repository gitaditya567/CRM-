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

async function fixAndMergeNayati() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        console.log('Connected to MongoDB');

        // IDs
        const canonical2017Id = new mongoose.Types.ObjectId('6a13ecb07734ec546fa2b610');
        const duplicate2017Id = new mongoose.Types.ObjectId('6a080dc4d65cf37956259da1');

        const canonical3891BId = new mongoose.Types.ObjectId('6a13ec897734ec546fa2b5e2');
        const duplicate3891BId = new mongoose.Types.ObjectId('6a080d5ed65cf37956259d9d');

        // 1. Update Quotations
        const quotations = await Quotation.find({
            $or: [
                { "products.productNo": { $in: [/^GS\.2017$/i, /^GS\.3891B$/i] } },
                { "products.product": { $in: [duplicate2017Id, canonical2017Id, duplicate3891BId, canonical3891BId] } }
            ]
        });

        console.log(`Found ${quotations.length} quotation(s) with GS.2017 or GS.3891B`);
        for (const q of quotations) {
            let updated = false;
            q.products.forEach(p => {
                if (/^GS\.2017$/i.test(p.productNo) || p.product?.toString() === duplicate2017Id.toString()) {
                    p.product = canonical2017Id;
                    p.brand = 'Nayati';
                    updated = true;
                }
                if (/^GS\.3891B$/i.test(p.productNo) || p.product?.toString() === duplicate3891BId.toString()) {
                    p.product = canonical3891BId;
                    p.brand = 'Nayati';
                    updated = true;
                }
            });
            if (updated) {
                await q.save();
                console.log(`Updated Quotation: ${q.quotationNumber}`);
            }
        }

        // 2. Update Purchase Orders
        const pos = await PurchaseOrder.find({
            $or: [
                { "products.productNo": { $in: [/^GS\.2017$/i, /^GS\.3891B$/i] } },
                { "products.product": { $in: [duplicate2017Id, canonical2017Id, duplicate3891BId, canonical3891BId] } }
            ]
        });

        console.log(`Found ${pos.length} purchase order(s) with GS.2017 or GS.3891B`);
        for (const po of pos) {
            let updated = false;
            po.products.forEach(p => {
                if (/^GS\.2017$/i.test(p.productNo) || p.product?.toString() === duplicate2017Id.toString()) {
                    p.product = canonical2017Id;
                    p.brand = 'Nayati';
                    updated = true;
                }
                if (/^GS\.3891B$/i.test(p.productNo) || p.product?.toString() === duplicate3891BId.toString()) {
                    p.product = canonical3891BId;
                    p.brand = 'Nayati';
                    updated = true;
                }
            });
            if (updated) {
                await po.save();
                console.log(`Updated Purchase Order: ${po.poNumber}`);
            }
        }

        // 3. Delete unbranded duplicate products from Product master
        const del2017 = await Product.deleteOne({ _id: duplicate2017Id });
        console.log(`Deleted unbranded duplicate GS.2017: ${del2017.deletedCount}`);

        const del3891B = await Product.deleteOne({ _id: duplicate3891BId });
        console.log(`Deleted unbranded duplicate GS.3891B: ${del3891B.deletedCount}`);

        // 4. Ensure canonical products have brand set to 'Nayati'
        await Product.findByIdAndUpdate(canonical2017Id, { $set: { brand: 'Nayati' } });
        await Product.findByIdAndUpdate(canonical3891BId, { $set: { brand: 'Nayati' } });

        console.log('\n--- VERIFICATION AFTER FIX ---');
        const remainingProds = await Product.find({ productNo: { $in: ['GS.2017', 'GS.3891B'] } }).lean();
        console.log('Product Master:', remainingProds.map(p => ({ id: p._id, productNo: p.productNo, name: p.name, brand: p.brand })));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.connection.close();
    }
}

fixAndMergeNayati();
