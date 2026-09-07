const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function updatePO() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const po = await db.collection('purchaseorders').findOne({ poNumber: '8000606727' });
  if (!po) {
    console.error('PO 8000606727 not found');
    process.exit(1);
  }

  // Update products: set selected: false on DRAIN VALVE (00-774683-00001)
  const updatedProducts = po.products.map(p => {
    if (p.productNo === '00-774683-00001') {
      return {
        ...p,
        selected: false,
        currentInvoiceQty: 0
      };
    }
    return p;
  });

  const res = await db.collection('purchaseorders').updateOne(
    { _id: po._id },
    { $set: { products: updatedProducts } }
  );

  console.log('Update result:', res);

  const updatedPO = await db.collection('purchaseorders').findOne({ _id: po._id });
  console.log('Updated PO products:');
  updatedPO.products.forEach((p, i) => {
    console.log(i, p.productNo, p.name, 'qty:', p.quantity, 'invoicedQty:', p.invoicedQuantity, 'selected:', p.selected);
  });

  process.exit(0);
}

updatePO().catch(err => {
  console.error(err);
  process.exit(1);
});
