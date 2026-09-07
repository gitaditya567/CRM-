const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkLeads() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const leads = await db.collection('leads').find({
    $or: [
      { 'dealDetails.poNumber': /DUMMY0[45]/i },
      { 'dealDetails.quotationNumber': /PI-2627-AD-47[46]/i },
      { 'notes.text': /DUMMY0[45]/i },
      { 'remarks': /DUMMY0[45]/i },
      { leadNumber: /DUMMY0[45]/i }
    ]
  }).toArray();

  console.log('Any leads found:', leads.length);
  process.exit(0);
}

checkLeads().catch(err => {
  console.error(err);
  process.exit(1);
});
