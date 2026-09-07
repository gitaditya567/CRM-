const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log('=== 1. PO 8000606727 & PI-2627-AA-569 ===');
  const po = await db.collection('purchaseorders').findOne({ poNumber: '8000606727' });
  const pi = await db.collection('quotations').findOne({ quotationNumber: 'PI-2627-AA-569' });
  console.log('PO:', {
    _id: po?._id,
    poNumber: po?.poNumber,
    totalValue: po?.totalValue,
    status: po?.status,
    products: po?.products?.map(p => ({ no: p.productNo, name: p.name, qty: p.quantity, price: p.unitPrice, total: p.total }))
  });
  console.log('PI:', {
    _id: pi?._id,
    quotationNumber: pi?.quotationNumber,
    subTotal: pi?.subTotal,
    gstTotal: pi?.gstTotal,
    roundOff: pi?.roundOff,
    grandTotal: pi?.grandTotal,
    additionalCharges: pi?.additionalCharges,
    products: pi?.products?.map(p => ({ no: p.productNo, name: p.name, qty: p.quantity, price: p.unitPrice, taxable: p.taxableAmount, gst: p.gstAmount, total: p.total }))
  });

  console.log('\n=== 2. DUMMY04 & DUMMY05 Records ===');
  const posDummy = await db.collection('purchaseorders').find({ poNumber: { $in: ['DUMMY04', 'DUMMY05'] } }).toArray();
  console.log('POs:', posDummy.map(p => ({ _id: p._id, poNumber: p.poNumber, leadNumber: p.leadNumber, pi: p.pi, status: p.status, products: p.products?.map(pr => ({ no: pr.productNo, qty: pr.quantity })) })));

  const piIds = posDummy.map(p => p.pi).filter(Boolean);
  const pisDummy = await db.collection('quotations').find({ $or: [{ poNumber: { $in: ['DUMMY04', 'DUMMY05'] } }, { _id: { $in: piIds } }] }).toArray();
  console.log('Quotations:', pisDummy.map(q => ({ _id: q._id, quotationNumber: q.quotationNumber, poNumber: q.poNumber, lead: q.lead })));

  const leadNumbers = posDummy.map(p => p.leadNumber).filter(Boolean);
  const leadIds = pisDummy.map(q => q.lead).filter(Boolean);
  const leadsDummy = await db.collection('leads').find({ $or: [{ leadNumber: { $in: leadNumbers } }, { _id: { $in: leadIds } }] }).toArray();
  console.log('Leads:', leadsDummy.map(l => ({ _id: l._id, leadNumber: l.leadNumber, customerName: l.customerName, status: l.status })));

  const invoicesDummy = await db.collection('invoices').find({
    $or: [
      { poNumber: { $in: ['DUMMY04', 'DUMMY05'] } },
      { purchaseOrder: { $in: posDummy.map(p => p._id) } },
      { quotation: { $in: pisDummy.map(q => q._id) } }
    ]
  }).toArray();
  console.log('Invoices:', invoicesDummy.map(i => ({ _id: i._id, invoiceNo: i.invoiceNo, poNumber: i.poNumber })));

  const stockLedgersDummy = await db.collection('stockledgers').find({
    $or: [
      { referenceNo: { $in: ['DUMMY04', 'DUMMY05'] } },
      { poNumber: { $in: ['DUMMY04', 'DUMMY05'] } },
      { reference: { $in: ['DUMMY04', 'DUMMY05'] } },
      { quotationNumber: { $in: pisDummy.map(q => q.quotationNumber) } },
      { leadNumber: { $in: leadNumbers } }
    ]
  }).toArray();
  console.log('StockLedgers:', stockLedgersDummy.map(s => ({ _id: s._id, productNo: s.productNo, type: s.type, quantity: s.quantity, referenceNo: s.referenceNo, balance: s.balance })));

  console.log('\n=== 3. Product IRNG-PC2F-36 ===');
  const prod = await db.collection('products').findOne({ productNo: 'IRNG-PC2F-36' });
  console.log('Product:', prod ? { _id: prod._id, productNo: prod.productNo, name: prod.name, type: prod.type, brand: prod.brand } : 'Not found');

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
