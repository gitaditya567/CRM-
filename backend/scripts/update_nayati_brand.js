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

async function updateNayatiBrands() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        console.log('Connected to MongoDB');

        const targetPartCodes = ['GS.3891B', 'GS.2017'];
        const regexCodes = targetPartCodes.map(code => new RegExp(`^${code.replace('.', '\\.')}$`, 'i'));

        // 1. Update Product Master
        const prodResult = await Product.updateMany(
            { productNo: { $in: regexCodes } },
            { $set: { brand: 'Nayati' } }
        );
        console.log(`Updated ${prodResult.modifiedCount} Product Master record(s).`);

        // 2. Update Quotations
        const quotations = await Quotation.find({
            "products.productNo": { $in: regexCodes }
        });

        let quotesUpdated = 0;
        for (const q of quotations) {
            let modified = false;
            q.products.forEach(p => {
                if (targetPartCodes.some(code => code.toLowerCase() === (p.productNo || '').toLowerCase())) {
                    if (p.brand !== 'Nayati') {
                        console.log(`Quotation ${q.quotationNumber}: updating product ${p.productNo} brand from "${p.brand}" to "Nayati"`);
                        p.brand = 'Nayati';
                        modified = true;
                    }
                }
            });
            if (modified) {
                await q.save();
                quotesUpdated++;
            }
        }
        console.log(`Updated ${quotesUpdated} Quotation(s).`);

        // 3. Update Purchase Orders
        const pos = await PurchaseOrder.find({
            "products.productNo": { $in: regexCodes }
        });

        let posUpdated = 0;
        for (const po of pos) {
            let modified = false;
            po.products.forEach(p => {
                if (targetPartCodes.some(code => code.toLowerCase() === (p.productNo || '').toLowerCase())) {
                    if (p.brand !== 'Nayati') {
                        console.log(`Purchase Order ${po.poNumber}: updating product ${p.productNo} brand from "${p.brand}" to "Nayati"`);
                        p.brand = 'Nayati';
                        modified = true;
                    }
                }
            });
            if (modified) {
                await po.save();
                posUpdated++;
            }
        }
        console.log(`Updated ${posUpdated} Purchase Order(s).`);

        console.log('\n--- VERIFICATION ---');
        const verifyProds = await Product.find({ productNo: { $in: regexCodes } });
        console.log('Verified Products:', verifyProds.map(p => ({ productNo: p.productNo, name: p.name, brand: p.brand })));

    } catch (e) {
        console.error('Error updating brands:', e);
    } finally {
        await mongoose.connection.close();
    }
}

updateNayatiBrands();
