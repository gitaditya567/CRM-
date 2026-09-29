const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Final Full project website/CRM_Teaminspire/backend/.env' });
const PurchaseOrder = require('../models/PurchaseOrder');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const pos = await PurchaseOrder.find({ type: 'inward', status: { $in: ['Pending', 'Partially Pending', 'Partial Pending'] } }).limit(5);
  for (const po of pos) {
    console.log('PO:', po.poNumber, 'status:', po.status, 'isMovedToInvoice:', po.isMovedToInvoice);
    po.products.forEach((p, i) => {
      console.log('  item', i, p.productNo, 'selected:', p.selected, 'movedToInvoice:', p.movedToInvoice, 'invoicedQty:', p.invoicedQuantity);
    });
  }
  process.exit(0);
}
test();
