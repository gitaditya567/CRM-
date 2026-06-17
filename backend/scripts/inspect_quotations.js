const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Quotation = require("../models/Quotation");
const User = require("../models/User");

const run = async () => {
    try {
        console.log("Connecting to database at:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        
        console.log("\n--- LAST 25 QUOTATIONS ---");
        const quotes = await Quotation.find({}).sort({ createdAt: -1 }).limit(25).populate("createdBy", "name role");
        quotes.forEach(q => {
            console.log(`ID: ${q._id} | Num: ${q.quotationNumber} | CreatedBy: ${q.createdBy ? q.createdBy.name : 'N/A'} (Role: ${q.createdBy ? q.createdBy.role : 'N/A'}) | CreatedAt: ${q.createdAt}`);
        });

        console.log("\n--- ALL UNIQUE USER ROLES ---");
        const users = await User.find({});
        users.forEach(u => {
            console.log(`User: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
