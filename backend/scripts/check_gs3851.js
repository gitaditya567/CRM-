const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../models/Product');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const products = await Product.find({ productNo: { $regex: /GS.3851/i } });
  console.log(JSON.stringify(products, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
