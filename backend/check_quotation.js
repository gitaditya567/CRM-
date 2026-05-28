const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Quotation = require('./models/Quotation');
const Lead = require('./models/Lead');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const q = await Quotation.findOne({ quotationNumber: "Q-2627-AP-047" })
            .populate('lead')
            .lean();

        if (!q) {
            console.log('Quotation not found');
            // Try partial match if number format is slightly different
            const q2 = await Quotation.findOne({ quotationNumber: /AP-047$/ }).populate('lead').lean();
            if (q2) {
                console.log('Found partial match:', q2.quotationNumber);
                printQuotation(q2);
            }
        } else {
            printQuotation(q);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

function printQuotation(q) {
    console.log('Quotation:', q.quotationNumber);
    console.log('Lead Name (from ref):', q.lead ? q.lead.name : 'None');
    console.log('billTo.name (snapshot):', q.billTo ? q.billTo.name : 'None');
    console.log('billTo.address:', q.billTo ? q.billTo.address : 'None');
    console.log('shipTo.name:', q.shipTo ? q.shipTo.name : 'None');
}

check();
