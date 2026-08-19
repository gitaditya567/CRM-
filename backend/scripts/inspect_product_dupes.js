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

async function inspectDuplicates() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const prods = await Product.find({
            productNo: { $in: ['GS.2017', 'GS.3891B'] }
        }).lean();

        console.log('--- Product records in DB ---');
        console.log(JSON.stringify(prods, null, 2));

        for (const p of prods) {
            const qCount = await Quotation.countDocuments({ "products.product": p._id });
            const poCount = await PurchaseOrder.countDocuments({ "products.product": p._id });
            console.log(`Product ID ${p._id} (${p.productNo} / brand: "${p.brand}") used in ${qCount} Quotations, ${poCount} POs.`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}

inspectDuplicates();
