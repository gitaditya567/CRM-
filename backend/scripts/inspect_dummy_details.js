const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function inspectLeadsAndDummyDetails() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const allLeads = await db.collection('leads').find({}).toArray();
  const matchedLeads = allLeads.filter(l => {
    const s = JSON.stringify(l).toLowerCase();
    return s.includes('dummy') || s.includes('260619-ad-009') || s.includes('260619-ad-010') || s.includes('6a351ba2b5752bcae0fcc679') || s.includes('6a351bb8b5752bcae0fcc706');
  });

  console.log('Matched leads count:', matchedLeads.length);
  matchedLeads.forEach(l => {
    console.log({
      _id: l._id,
      leadNumber: l.leadNumber,
      customerName: l.customerName || l.name,
      quotations: l.quotations
    });
  });


  const po4 = await db.collection('purchaseorders').findOne({ poNumber: 'DUMMY04' });
  const po5 = await db.collection('purchaseorders').findOne({ poNumber: 'DUMMY05' });

  console.log('PO DUMMY04 details:', {
    _id: po4?._id,
    poNumber: po4?.poNumber,
    type: po4?.type,
    invoiceHistory: po4?.invoiceHistory,
    dispatchHistory: po4?.dispatchHistory
  });

  console.log('PO DUMMY05 details:', {
    _id: po5?._id,
    poNumber: po5?.poNumber,
    type: po5?.type,
    invoiceHistory: po5?.invoiceHistory,
    dispatchHistory: po5?.dispatchHistory
  });

  process.exit(0);
}

inspectLeadsAndDummyDetails().catch(err => {
  console.error(err);
  process.exit(1);
});
