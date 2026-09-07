const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkQuotation() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const q = await db.collection('quotations').findOne({ 'products.productNo': 'IRNG-PC2F-36' });
  console.log('Quotation with IRNG-PC2F-36:', q.quotationNumber);
  const prod = q.products.find(p => p.productNo === 'IRNG-PC2F-36');
  console.log('Product in quotation:', prod);

  process.exit(0);
}

checkQuotation().catch(err => {
  console.error(err);
  process.exit(1);
});
