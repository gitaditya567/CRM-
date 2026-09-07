const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkDetails() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const entries = await db.collection('stockledgers').find({
    _id: { $in: [new mongoose.Types.ObjectId('6a9672e67617b9fd6da4bd26'), new mongoose.Types.ObjectId('6a9673067617b9fd6da4c1bc')] }
  }).toArray();

  console.log(JSON.stringify(entries, null, 2));
  process.exit(0);
}

checkDetails().catch(err => {
  console.error(err);
  process.exit(1);
});
