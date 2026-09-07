const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Quotation = require('../models/Quotation');
const Lead = require('../models/Lead');
const Product = require('../models/Product');

async function testSearch(searchTerm) {
  await mongoose.connect(process.env.MONGO_URI);

  let search = searchTerm.trim();
  search = search.replace(/^lead\s*no\s*:\s*/i, "").trim();
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const matchedLeads = await Lead.find({
    $or: [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
      { phone: { $regex: escapedSearch, $options: "i" } },
      { leadNumber: { $regex: escapedSearch, $options: "i" } }
    ]
  }).distinct("_id");

  const matchedProducts = await Product.find({
    $or: [
      { name: { $regex: escapedSearch, $options: "i" } },
      { productNo: { $regex: escapedSearch, $options: "i" } },
      { model: { $regex: escapedSearch, $options: "i" } }
    ]
  }).distinct("_id");

  const filter = {
    $or: [
      { quotationNumber: { $regex: escapedSearch, $options: "i" } },
      { poNumber: { $regex: escapedSearch, $options: "i" } },
      { "billTo.name": { $regex: escapedSearch, $options: "i" } },
      { status: { $regex: escapedSearch, $options: "i" } },
      { lead: { $in: matchedLeads } },
      { "products.name": { $regex: escapedSearch, $options: "i" } },
      { "products.productNo": { $regex: escapedSearch, $options: "i" } },
      { "products.description": { $regex: escapedSearch, $options: "i" } },
      { "products.brand": { $regex: escapedSearch, $options: "i" } },
      { "products.product": { $in: matchedProducts } }
    ]
  };

  const results = await Quotation.find(filter).lean();
  console.log(`Search for "${searchTerm}" returned ${results.length} quotations:`);
  results.slice(0, 5).forEach(q => {
    const matchingProds = q.products.filter(p =>
      (p.name && new RegExp(escapedSearch, 'i').test(p.name)) ||
      (p.productNo && new RegExp(escapedSearch, 'i').test(p.productNo))
    );
    console.log(` - ${q.quotationNumber} (matching items: ${matchingProds.map(p => p.name || p.productNo).join(', ')})`);
  });

  process.exit(0);
}

testSearch(process.argv[2] || 'Screen').catch(err => {
  console.error(err);
  process.exit(1);
});
