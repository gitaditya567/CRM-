const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Lead = require("../models/Lead");
const Quotation = require("../models/Quotation");

const run = async () => {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGO_URI);
        
        // Create a dummy lead
        const lead = await Lead.create({
            name: "Test Conversion Lead",
            phone: "1234567890",
            status: "New"
        });
        console.log("Created test lead with status:", lead.status);

        // Create a quotation for it
        const quotation = new Quotation({
            quotationNumber: `Q-${Date.now()}`,
            lead: lead._id,
            products: []
        });
        await quotation.save();
        console.log("Created test quotation:", quotation.quotationNumber);

        // Replicate conversion to PI
        const updatedNumber = quotation.quotationNumber.replace(/^Q-/, "PI-");
        console.log("Replicating conversion to PI number:", updatedNumber);

        // Simulating backend updateQuotation:
        const updates = { quotationNumber: updatedNumber, status: "Accepted" };
        
        const dbOperation = { ...updates, $inc: { revisionNo: 1 } };
        const updatedQuotation = await Quotation.findByIdAndUpdate(quotation._id, dbOperation, { new: true })
            .populate("lead")
            .lean();
            
        if (updates.quotationNumber && /^PI/i.test(updates.quotationNumber)) {
            if (updatedQuotation && updatedQuotation.lead) {
                const leadId = updatedQuotation.lead._id || updatedQuotation.lead;
                const updatedLead = await Lead.findByIdAndUpdate(
                    leadId,
                    { status: "Won" },
                    { new: true }
                );
                console.log("Auto-won updated lead status is:", updatedLead.status);
            }
        }

        // Clean up
        await Quotation.findByIdAndDelete(quotation._id);
        await Lead.findByIdAndDelete(lead._id);
        console.log("Cleanup complete!");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
