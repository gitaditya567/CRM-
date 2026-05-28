const path = require('path');
const XLSX = require('xlsx');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Product = require('../models/Product');

dotenv.config();

const FILE = process.argv[2] || path.join(__dirname, '..', 'uploads', 'dummy_products.xlsx');

async function main() {
  await connectDB();
  console.log('Reading', FILE);
  const workbook = XLSX.readFile(FILE);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  let created = 0, updated = 0;

  const normalize = (r) => {
    const get = (...keys) => {
      for (const k of keys) if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
      return undefined;
    };
    const priceINR = get('priceINR','PriceINR','INR','INR Price','Price') || 0;
    const priceUSD = get('priceUSD','PriceUSD','USD') || 0;
    const prodNoRaw = get('productNo','ProductNo','Product No','product_no') || get('product','Product') || '';
    const productNo = prodNoRaw !== undefined && prodNoRaw !== null ? String(prodNoRaw).trim() : '';
    return {
      productNo,
      name: get('name','Name','productName','Product Name') || '',
      model: get('model','Model','ModelName') || '',
      price: Number(get('price','Price') || priceINR || priceUSD || 0),
      priceINR: Number(priceINR) || 0,
      priceUSD: Number(priceUSD) || 0,
      quantity: Number(get('quantity','Quantity') || 0),
    };
  };

  for (const row of rows) {
    const mapped = normalize(row);
    if (!mapped.productNo) {
      console.log('Skipping row without productNo:', row);
      continue;
    }
    // upsert
    const res = await Product.updateOne({ productNo: mapped.productNo }, { $set: mapped }, { upsert: true });
    if (res.upsertedCount || res.upsertedId) created++;
    else if (res.modifiedCount || res.nModified) updated++;
  }

  console.log(`Imported ${rows.length} rows — created: ${created}, updated: ${updated}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
