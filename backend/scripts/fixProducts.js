const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Product = require('../models/Product');

dotenv.config();

const main = async () => {
  await connectDB();

  const allowed = new Set(['_id', '__v', 'productNo', 'name', 'model', 'price', 'priceINR', 'priceUSD', 'quantity', 'createdAt', 'updatedAt']);

  const cursor = Product.find().cursor();
  let total = 0;
  let changed = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    total++;
    const obj = doc.toObject();
    const update = {};

    for (const key of Object.keys(obj)) {
      if (allowed.has(key)) continue;

      const val = obj[key];
      if (val === null || val === undefined || val === '') continue;

      // keys that explicitly hint field types
      if (/model/i.test(key) && !obj.model) {
        update.model = String(val);
        continue;
      }
      if (/name/i.test(key) && !obj.name) {
        update.name = String(val);
        continue;
      }
      if (/inr/i.test(key) && !obj.priceINR) {
        const n = Number(String(val).toString().replace(/[,\s]/g, ''));
        if (!Number.isNaN(n)) update.priceINR = n;
        continue;
      }
      if (/usd/i.test(key) && !obj.priceUSD) {
        const n = Number(String(val).toString().replace(/[,\s]/g, ''));
        if (!Number.isNaN(n)) update.priceUSD = n;
        continue;
      }
      if (/price/i.test(key) && !obj.price && !obj.priceINR && !obj.priceUSD) {
        const n = Number(String(val).toString().replace(/[,\s]/g, ''));
        if (!Number.isNaN(n)) {
          // guess currency by magnitude
          if (n > 1000) update.priceINR = n;
          else update.priceUSD = n;
        }
        continue;
      }

      // numeric-looking keys (e.g., '101') — try to coerce
      if (/^\d+$/.test(key)) {
        if (typeof val === 'number') {
          if (!obj.priceINR && val > 1000) update.priceINR = val;
          else if (!obj.priceUSD) update.priceUSD = val;
        } else if (typeof val === 'string') {
          const s = val.trim();
          if (/^[\d,\.]+$/.test(s)) {
            const n = Number(s.replace(/[,\s]/g, ''));
            if (!Number.isNaN(n)) {
              if (!obj.priceINR && n > 1000) update.priceINR = n;
              else if (!obj.priceUSD) update.priceUSD = n;
            }
          } else {
            // assume textual => model or name
            if (!obj.model && s.length > 0 && s.length < 100) update.model = s;
            else if (!obj.name) update.name = s;
          }
        }
      }
    }

    if (Object.keys(update).length) {
      await Product.updateOne({ _id: doc._id }, { $set: update });
      changed++;
      console.log(`Updated ${doc._id}:`, update);
    }
  }

  console.log(`Scanned ${total} products, updated ${changed} documents.`);
  process.exit(0);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
