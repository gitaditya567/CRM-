const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkAllCollections() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments({
      $or: [
        { poNumber: 'DUMMY04' },
        { poNumber: 'DUMMY05' },
        { quotationNumber: 'PI-2627-AD-474' },
        { quotationNumber: 'PI-2627-AD-476' },
        { leadNumber: 'L-260619-AD-009' },
        { leadNumber: 'L-260619-AD-010' },
        { _id: new mongoose.Types.ObjectId('6a351ba2b5752bcae0fcc679') },
        { _id: new mongoose.Types.ObjectId('6a351bb8b5752bcae0fcc706') }
      ]
    });
    if (count > 0) {
      console.log(`Collection ${col.name}: ${count} docs`);
      const docs = await db.collection(col.name).find({
        $or: [
          { poNumber: 'DUMMY04' },
          { poNumber: 'DUMMY05' },
          { quotationNumber: 'PI-2627-AD-474' },
          { quotationNumber: 'PI-2627-AD-476' },
          { leadNumber: 'L-260619-AD-009' },
          { leadNumber: 'L-260619-AD-010' },
          { _id: new mongoose.Types.ObjectId('6a351ba2b5752bcae0fcc679') },
          { _id: new mongoose.Types.ObjectId('6a351bb8b5752bcae0fcc706') }
        ]
      }).toArray();
      docs.forEach(d => console.log('  ->', d._id, d.poNumber || d.quotationNumber || d.leadNumber || d.name));
    }
  }

  process.exit(0);
}

checkAllCollections().catch(err => {
  console.error(err);
  process.exit(1);
});
