const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function inspectAll() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log('=== 1. PO 8000606727 & Quotation ===');
  const po = await db.collection('purchaseorders').findOne({ poNumber: '8000606727' });
  if (po) {
    console.log('PO ID:', po._id, 'totalValue:', po.totalValue, 'status:', po.status);
    console.log('Products:', po.products.map(p => ({ no: p.productNo, name: p.name, qty: p.quantity, price: p.unitPrice, total: p.total })));
    if (po.pi) {
      const pi = await db.collection('quotations').findOne({ _id: po.pi });
      console.log('Linked PI:', pi?.quotationNumber, 'Products count:', pi?.products?.length);
    }
  }

  console.log('\n=== 2. DUMMY04 & DUMMY05 Search ===');
  const collections = ['leads', 'quotations', 'purchaseorders', 'invoices', 'stockledgers'];
  for (const colName of collections) {
    const docs = await db.collection(colName).find({
      $or: [
        { leadNumber: /DUMMY0[45]/i },
        { quotationNumber: /DUMMY0[45]/i },
        { poNumber: /DUMMY0[45]/i },
        { invoiceNo: /DUMMY0[45]/i },
        { name: /DUMMY0[45]/i },
        { customerName: /DUMMY0[45]/i },
        { clientName: /DUMMY0[45]/i },
        { orderNumber: /DUMMY0[45]/i }
      ]
    }).toArray();
    if (docs.length > 0) {
      console.log(`Found in ${colName}:`, docs.map(d => ({
        _id: d._id,
        leadNumber: d.leadNumber,
        quotationNumber: d.quotationNumber,
        poNumber: d.poNumber,
        name: d.name,
        companyName: d.companyName
      })));
    }
  }

  // Also search text in leads
  const dummyLeads = await db.collection('leads').find({
    $or: [
      { leadNumber: /dummy/i },
      { customerName: /dummy/i },
      { contactPerson: /dummy/i },
      { 'dealDetails.leadNumber': /dummy/i },
      { name: /dummy/i }
    ]
  }).toArray();
  console.log('Leads matching dummy:', dummyLeads.map(l => ({ _id: l._id, leadNumber: l.leadNumber, customerName: l.customerName, contactPerson: l.contactPerson })));

  console.log('\n=== 3. Product IRNG-PC2F-36 ===');
  const prod = await db.collection('products').findOne({
    $or: [
      { productNo: /IRNG-PC2F-36/i },
      { model: /IRNG-PC2F-36/i },
      { name: /IRNG-PC2F-36/i }
    ]
  });
  console.log('Product IRNG-PC2F-36:', prod ? {
    _id: prod._id,
    productNo: prod.productNo,
    name: prod.name,
    type: prod.type,
    category: prod.category,
    brand: prod.brand
  } : 'NOT FOUND');

  process.exit(0);
}

inspectAll().catch(err => {
  console.error(err);
  process.exit(1);
});
