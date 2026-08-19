const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Lead = require('../models/Lead');
const Product = require('../models/Product');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        console.log('--- Sample PIs in PI Management (quotationNumber starts with PI, isConvertedToPO != true) ---');
        const samplePIs = await Quotation.find({
            quotationNumber: /^PI/i,
            isConvertedToPO: { $ne: true }
        }).limit(5).populate('lead');
        
        samplePIs.forEach(pi => {
            console.log({
                quotationNumber: pi.quotationNumber,
                status: pi.status,
                isConvertedToPO: pi.isConvertedToPO,
                poNumber: pi.poNumber,
                leadStatus: pi.lead ? pi.lead.status : null
            });
        });

        console.log('\n--- Check Product master for GS.9711R-1 ---');
        const prod = await Product.findOne({ productNo: /GS\.9711R-1/i });
        console.log('Product in master:', prod ? { productNo: prod.productNo, name: prod.name, brand: prod.brand } : 'Not found');

        console.log('\n--- Check all products in 819 and 873 ---');
        const q819 = await Quotation.findOne({ quotationNumber: /819/i });
        console.log('Q819 products:', q819 ? q819.products.map(p => ({ productNo: p.productNo, name: p.name, brand: p.brand })) : null);

        const q873 = await Quotation.findOne({ quotationNumber: /873/i });
        console.log('Q873 products:', q873 ? q873.products.map(p => ({ productNo: p.productNo, name: p.name, brand: p.brand })) : null);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}

check();
