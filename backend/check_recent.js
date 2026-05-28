const mongoose = require("mongoose");
const Product = require("./models/Product");
require("dotenv").config();

const checkRecent = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const count = await Product.countDocuments();
        console.log(`Total Products: ${count}`);

        const recent = await Product.find().sort({ createdAt: -1 }).limit(5);
        console.log("Top 5 Recent Products:");
        recent.forEach(p => {
            console.log(`- [${p.createdAt}] ${p.productNo} (${p.name || p.description}) Type: ${p.type}`);
        });

        mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkRecent();
