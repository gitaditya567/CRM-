const mongoose = require("mongoose");
const Product = require("../models/Product");

const uri = "mongodb://localhost:27017/newDB";

mongoose.connect(uri)
    .then(async () => {
        console.log("Connected to DB. Fetching products...");
        const products = await Product.find({});
        console.log(`Found ${products.length} products.`);
        products.forEach((p, i) => {
            console.log(`[${i}] ProductNo: '${p.productNo}', Brand: '${p.brand}', Desc: '${p.description}'`);
        });
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
