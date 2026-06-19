require("dotenv").config();
const mongoose = require("mongoose");
const Quotation = require("./models/Quotation");

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connected to MongoDB.");
        const piNumber = "PI-2627-AP-082";
        const pi = await Quotation.findOne({ quotationNumber: piNumber });
        
        if (!pi) {
            console.log("PI not found: " + piNumber);
        } else {
            console.log("Found PI, clearing PO details...");
            
            pi.poNumber = "";
            pi.poDate = null;
            pi.poComment = "";
            pi.isConvertedToPO = false; // ensuring it is false
            
            await pi.save();
            console.log("PI PO details cleared successfully.");
        }
        
        mongoose.connection.close();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
