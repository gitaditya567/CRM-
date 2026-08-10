const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Lead = require('../models/Lead');

async function moveIntoQuotation() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find Quotation by ID or quotationNumber/poNumber
        const q = await Quotation.findOne({
            $or: [
                { quotationNumber: "PI-2627-AA-844" },
                { quotationNumber: "Q-2627-AA-844" },
                { poNumber: "Q-2627-AA-844" }
            ]
        });

        if (!q) {
            console.log('Quotation Q-2627-AA-844 not found!');
            return;
        }

        console.log(`Found Quotation ID: ${q._id}`);
        console.log(`Before update -> quotationNumber: ${q.quotationNumber}, poNumber: "${q.poNumber}", status: ${q.status}, isConvertedToPO: ${q.isConvertedToPO}`);

        // Update Quotation to move back into quotation
        q.quotationNumber = "Q-2627-AA-844";
        q.status = "Sent";
        q.poNumber = "";
        q.poDate = null;
        q.poComment = "";
        q.isConvertedToPO = false;

        await q.save();
        console.log(`Updated Quotation -> quotationNumber: ${q.quotationNumber}, status: ${q.status}, isConvertedToPO: ${q.isConvertedToPO}`);

        // Delete or decouple Purchase Order created from this PI/Quotation
        const poDeleteResult = await PurchaseOrder.deleteMany({
            $or: [
                { poNumber: "Q-2627-AA-844" },
                { pi: q._id }
            ]
        });
        console.log(`Deleted ${poDeleteResult.deletedCount} related Purchase Order(s).`);

        // Update Lead status back to "Quotation Submitted"
        if (q.lead) {
            const lead = await Lead.findById(q.lead);
            if (lead) {
                console.log(`Lead ${lead.leadNumber} (${lead.name}) before status: ${lead.status}`);
                lead.status = "Quotation Submitted";
                await lead.save();
                console.log(`Lead ${lead.leadNumber} updated status to: ${lead.status}`);
            }
        }

        console.log('SUCCESS: Q-2627-AA-844 has been moved into quotation.');
    } catch (err) {
        console.error('Error moving into quotation:', err);
    } finally {
        await mongoose.connection.close();
    }
}

moveIntoQuotation();
