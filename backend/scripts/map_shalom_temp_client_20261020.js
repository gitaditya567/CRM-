// 2026-10-20: Map temporary client "SHALOM ENGINEERING, HYDERABAD, TELANGANA" → registered client DEA-005
// (temp client was created on 06-Oct because DEA-005 was missing from lead suggestions — the 100-client limit bug)
// - PIs PI-2627-KG-1325 / PI-2627-KG-1353: billTo + shipTo ← DEA-005 name, address, GSTIN (same format as PI-2627-KG-1189)
// - POs Q-2627-KG-1325 / Q-2627-KG-1353: vendorName ← DEA-005 name
// - Lead L-261006-KG-006: name ← DEA-005 name, group ← Dealers
// - Delete the temp client once nothing references it
// A JSON backup of every touched document is written next to this script first.
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Client = require("../models/Client");
const Quotation = require("../models/Quotation");
const PurchaseOrder = require("../models/PurchaseOrder");
const Lead = require("../models/Lead");

const TEMP_NAME = "SHALOM ENGINEERING, HYDERABAD, TELANGANA";
const REAL_CLIENT_ID = "DEA-005";

const formatAddress = (a = {}) =>
    [a.addressLine1, a.addressLine2, a.city, a.distt, a.state, a.zipCode, a.country]
        .map(s => String(s || "").trim()).filter(Boolean).join(", ");

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const session = await mongoose.startSession();
    try {
        const real = await Client.findOne({ clientId: REAL_CLIENT_ID }).lean();
        const temp = await Client.findOne({ clientName: TEMP_NAME, clientId: { $exists: false } }).lean();
        if (!real || !temp) throw new Error("Registered or temporary client not found");

        const quotes = await Quotation.find({ $or: [{ "billTo.name": TEMP_NAME }, { "shipTo.name": TEMP_NAME }] }).lean();
        const pos = await PurchaseOrder.find({ vendorName: TEMP_NAME }).lean();
        const leads = await Lead.find({ name: TEMP_NAME }).lean();

        const backupFile = path.join(__dirname, `backup_shalom_map_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify({ real, temp, quotes, pos, leads }, null, 2));
        console.log(`Backup written: ${backupFile}\n`);

        const billTo = { name: real.clientName, address: formatAddress(real.billingAddress), gstin: real.gstVatNo };
        const shipAddr = real.isDispatchAddressSame ? real.billingAddress : (real.dispatchAddress || real.billingAddress);
        const shipTo = { name: real.clientName, address: formatAddress(shipAddr), gstin: real.gstVatNo };

        await session.withTransaction(async () => {
            for (const q of quotes) {
                await Quotation.updateOne({ _id: q._id }, { $set: { billTo, shipTo } }, { session });
                console.log(`  ${q.quotationNumber}: Bill To / Ship To → ${real.clientName} (GSTIN ${real.gstVatNo})`);
            }
            if (pos.length) {
                await PurchaseOrder.updateMany({ _id: { $in: pos.map(p => p._id) } }, { $set: { vendorName: real.clientName } }, { session });
                console.log(`  POs ${pos.map(p => p.poNumber).join(", ")}: client → ${real.clientName}`);
            }
            for (const l of leads) {
                await Lead.updateOne({ _id: l._id }, { $set: { name: real.clientName, group: real.group } }, { session });
                console.log(`  Lead ${l.leadNumber}: client → ${real.clientName}, group → Dealers`);
            }

            const stillUsed = await Promise.all([
                Quotation.countDocuments({ $or: [{ "billTo.name": TEMP_NAME }, { "shipTo.name": TEMP_NAME }] }).session(session),
                PurchaseOrder.countDocuments({ vendorName: TEMP_NAME }).session(session),
                Lead.countDocuments({ name: TEMP_NAME }).session(session)
            ]);
            if (stillUsed.some(n => n > 0)) throw new Error(`Temp client still referenced ${JSON.stringify(stillUsed)}`);
            await Client.deleteOne({ _id: temp._id }, { session });
            console.log(`  Temporary client "${TEMP_NAME}" deleted`);
        });

        console.log("\n✅ Done");
    } catch (err) {
        console.error("❌ Failed (no changes committed):", err.message);
        process.exitCode = 1;
    } finally {
        await session.endSession();
        await mongoose.disconnect();
    }
};

run();
