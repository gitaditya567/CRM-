const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function inspectPO() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const doc = await db.collection(col.name).findOne({
      $or: [
        { poNumber: /8000606727/i },
        { po_number: /8000606727/i },
        { 'products.partNo': '00-774683-00001' }
      ]
    });
    if (doc) {
      console.log(`Found in collection: ${col.name}`);
      console.log(JSON.stringify(doc, null, 2));
    }
  }


  process.exit(0);
}

inspectPO().catch(err => {
  console.error(err);
  process.exit(1);
});
