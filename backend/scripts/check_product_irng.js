const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkProduct() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const prod = await db.collection('products').findOne({ productNo: 'IRNG-PC2F-36' });
  console.log('Product IRNG-PC2F-36:');
  console.log(JSON.stringify(prod, null, 2));

  // Check if any quotation or PO has this product cached with type
  const inQuotations = await db.collection('quotations').find({ 'products.productNo': 'IRNG-PC2F-36' }).toArray();
  console.log('In quotations count:', inQuotations.length);
  const inPOs = await db.collection('purchaseorders').find({ 'products.productNo': 'IRNG-PC2F-36' }).toArray();
  console.log('In POs count:', inPOs.length);

  process.exit(0);
}

checkProduct().catch(err => {
  console.error(err);
  process.exit(1);
});
