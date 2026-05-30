const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load dotenv from parent directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Lead = require("../models/Lead");
const Quotation = require("../models/Quotation");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("MONGO_URI not found in .env file.");
    process.exit(1);
}

const run = async () => {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected to database successfully!");

        const targetQuotationNumber = "PI-2627-AP-081";
        const reversedQuotationNumber = "Q-2627-AP-081";

        console.log(`Searching for quotation: ${targetQuotationNumber}`);
        const quotation = await Quotation.findOne({ quotationNumber: targetQuotationNumber });

        if (!quotation) {
            console.error(`Quotation ${targetQuotationNumber} not found in database.`);
            process.exit(1);
        }

        console.log("Found quotation:", {
            id: quotation._id,
            quotationNumber: quotation.quotationNumber,
            lead: quotation.lead,
            status: quotation.status
        });

        // 1. Update quotation number to Q- prefix and status to "Sent"
        quotation.quotationNumber = reversedQuotationNumber;
        quotation.status = "Sent";
        
        // Remove PO fields since it's no longer a PI
        quotation.poNumber = "";
        quotation.poDate = null;
        quotation.poComment = "";

        await quotation.save();
        console.log(`Successfully updated Quotation number to ${reversedQuotationNumber} and status to Sent.`);

        // 2. Update Lead status to "Quotation Submitted" (since it was reverted from PI)
        if (quotation.lead) {
            console.log(`Updating lead status for ID: ${quotation.lead}`);
            const lead = await Lead.findById(quotation.lead);
            if (lead) {
                console.log("Current lead status:", lead.status);
                lead.status = "Quotation Submitted";
                await lead.save();
                console.log("Successfully set Lead status back to 'Quotation Submitted'.");
            } else {
                console.log("Lead not found for this quotation.");
            }
        }

        console.log("Migration complete!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

run();
