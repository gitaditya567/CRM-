const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkStockLedgerDrainValve() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const entries = await db.collection('stockledgers').find({
    $or: [
      { productNo: '00-774683-00001' },
      { product: new mongoose.Types.ObjectId('69fc448fe027aa44ad3aa4be') },
      { referenceNo: '8000606727' },
      { poNumber: '8000606727' },
      { quotationNumber: 'PI-2627-AA-569' }
    ]
  }).toArray();

  console.log('Stock ledger entries found:', entries.length);
  entries.forEach(e => {
    console.log({
      _id: e._id,
      productNo: e.productNo,
      type: e.type,
      quantity: e.quantity,
      referenceNo: e.referenceNo,
      balance: e.balance
    });
  });

  const product = await db.collection('products').findOne({ productNo: '00-774683-00001' });
  console.log('Drain valve product stock:', {
    productNo: product?.productNo,
    quantity: product?.quantity,
    totalStockIn: product?.totalStockIn,
    totalStockOut: product?.totalStockOut
  });

  process.exit(0);
}

checkStockLedgerDrainValve().catch(err => {
  console.error(err);
  process.exit(1);
});
