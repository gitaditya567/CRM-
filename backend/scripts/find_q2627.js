const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Lead = require('../models/Lead');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        const searchStr = 'Q-2627-AA-844';

        // Search Quotations
        const quotes = await Quotation.find({
            $or: [
                { quotationNumber: new RegExp(searchStr, 'i') },
                { poNumber: new RegExp(searchStr, 'i') }
            ]
        });
        console.log('Quotations found:', quotes.length);
        quotes.forEach(q => console.log('Quote:', q._id, q.quotationNumber, q.poNumber, q.status, q.isConvertedToPO));

        // Search PurchaseOrders
        const pos = await PurchaseOrder.find({
            $or: [
                { poNumber: new RegExp(searchStr, 'i') },
                { leadNumber: new RegExp(searchStr, 'i') }
            ]
        });
        console.log('POs found:', pos.length);
        pos.forEach(p => console.log('PO:', p._id, p.poNumber, p.type, p.status, p.pi));

        // Search Leads
        const leads = await Lead.find({
            $or: [
                { leadNumber: new RegExp(searchStr, 'i') }
            ]
        });
        console.log('Leads found:', leads.length);
        leads.forEach(l => console.log('Lead:', l._id, l.leadNumber, l.name, l.status));

        // Search all fields in POs for searchStr
        if (quotes.length === 0 && pos.length === 0 && leads.length === 0) {
            console.log('Searching all text fields in Quotations...');
            const allQuotes = await Quotation.find({ $text: { $search: searchStr } });
            console.log('Text search quotes:', allQuotes.length);

            console.log('Searching by partial regex 844 or AA-844...');
            const posPartial = await PurchaseOrder.find({ poNumber: /844/i });
            posPartial.forEach(p => console.log('Partial PO match:', p._id, p.poNumber, p.type));

            const quotesPartial = await Quotation.find({ $or: [{ quotationNumber: /844/i }, { poNumber: /844/i }] });
            quotesPartial.forEach(q => console.log('Partial Quote match:', q._id, q.quotationNumber, q.poNumber));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}
main();
