const mongoose = require("mongoose");
const Product = require("../models/Product");

const uri = "mongodb://localhost:27017/newDB";

mongoose.connect(uri)
    .then(async () => {
        console.log("Connected to DB. Deleting all products...");
        const res = await Product.deleteMany({});
        console.log(`Deleted ${res.deletedCount} products.`);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
