const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verifyAll() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log('=== 1. VERIFY PO 8000606727 ===');
  const po = await db.collection('purchaseorders').findOne({ poNumber: '8000606727' });
  console.log('PO 8000606727:');
  console.log('  totalValue:', po?.totalValue);
  console.log('  status:', po?.status);
  console.log('  products:', po?.products?.map(p => `${p.productNo}: ${p.name} (qty: ${p.quantity}, inv: ${p.invoicedQuantity}, disp: ${p.dispatchedQuantity})`));

  const pi = await db.collection('quotations').findOne({ quotationNumber: 'PI-2627-AA-569' });
  console.log('PI-2627-AA-569:');
  console.log('  subTotal:', pi?.subTotal, 'gstTotal:', pi?.gstTotal, 'grandTotal:', pi?.grandTotal);
  console.log('  products count:', pi?.products?.length);

  console.log('\n=== 2. VERIFY DUMMY04 & DUMMY05 DELETION ===');
  const poDummyCount = await db.collection('purchaseorders').countDocuments({ poNumber: { $in: ['DUMMY04', 'DUMMY05'] } });
  const piDummyCount = await db.collection('quotations').countDocuments({ poNumber: { $in: ['DUMMY04', 'DUMMY05'] } });
  const leadDummyCount = await db.collection('leads').countDocuments({ leadNumber: { $in: ['L-260619-AD-009', 'L-260619-AD-010'] } });
  console.log(`  Dummy POs remaining: ${poDummyCount}`);
  console.log(`  Dummy Quotations remaining: ${piDummyCount}`);
  console.log(`  Dummy Leads remaining: ${leadDummyCount}`);

  console.log('\n=== 3. VERIFY IRNG-PC2F-36 TYPE ===');
  const prod = await db.collection('products').findOne({ productNo: 'IRNG-PC2F-36' });
  console.log(`  Product ${prod?.productNo} type: "${prod?.type}"`);

  const quoteWithProd = await db.collection('quotations').findOne({ 'products.productNo': 'IRNG-PC2F-36' });
  const pInQ = quoteWithProd?.products?.find(p => p.productNo === 'IRNG-PC2F-36');
  console.log(`  Quotation ${quoteWithProd?.quotationNumber} product type: "${pInQ?.type}"`);

  process.exit(0);
}

verifyAll().catch(err => {
  console.error(err);
  process.exit(1);
});
