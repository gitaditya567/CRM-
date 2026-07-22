require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Quotation = require('../models/Quotation');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Searching for 620...");
        const pos = await PurchaseOrder.find({
            $or: [
                { poNumber: /620/i },
                { leadNumber: /620/i }
            ]
        });
        console.log("POs found:", pos.map(p => ({
            id: p._id,
            poNumber: p.poNumber,
            type: p.type,
            isMovedToInvoice: p.isMovedToInvoice,
            status: p.status,
            productsCount: p.products ? p.products.length : 0
        })));

        const quotes = await Quotation.find({
            $or: [
                { quotationNumber: /620/i },
                { poNumber: /620/i }
            ]
        });
        console.log("Quotes found:", quotes.map(q => ({
            id: q._id,
            quotationNumber: q.quotationNumber,
            poNumber: q.poNumber,
            isMovedToInward: q.isMovedToInward,
            isMovedToInvoice: q.isMovedToInvoice,
            isMovedToOutward: q.isMovedToOutward
        })));

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

main();
