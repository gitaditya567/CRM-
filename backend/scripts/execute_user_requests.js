const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");
const Lead = require("../models/Lead");

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // =========================================================================
    // TASK 1: Delete DRAIN VALVE (00-774683-00001) in PO 8000606727 & PI
    // =========================================================================
    console.log("\n--- TASK 1: DELETE DRAIN VALVE IN PO 8000606727 ---");
    const po = await PurchaseOrder.findOne({ poNumber: "8000606727" });
    if (!po) {
      console.error("PO 8000606727 not found!");
      process.exit(1);
    }
    console.log(`Found PO: ${po.poNumber}`);
    console.log("Before deletion, PO products:", po.products.map(p => `${p.productNo} (${p.name})`));

    // Remove 00-774683-00001
    po.products = po.products.filter(p => p.productNo !== "00-774683-00001");
    console.log("After deletion, PO products:", po.products.map(p => `${p.productNo} (${p.name})`));

    // Recalculate PO totalValue
    const newPoTotal = po.products.reduce((sum, p) => sum + (p.total || ((p.unitPrice * p.quantity) * (1 + (p.gstRate || 18)/100))), 0);
    po.totalValue = Math.round(newPoTotal * 100) / 100;

    // Verify PO status: all remaining products are invoiced and dispatched
    const allInvoiced = po.products.every(p => (p.invoicedQuantity || 0) >= p.quantity);
    const allDispatched = po.products.every(p => (p.dispatchedQuantity || 0) >= p.quantity);
    if (allDispatched) {
      po.status = "Dispatched";
    } else if (allInvoiced) {
      po.status = "Invoiced";
    }
    await po.save();
    console.log(`PO saved successfully. New totalValue = ₹${po.totalValue}, status = ${po.status}`);

    // Update linked Quotation PI-2627-AA-569
    const quote = await Quotation.findOne({
      $or: [
        { quotationNumber: "PI-2627-AA-569" },
        { poNumber: "8000606727" }
      ]
    });
    if (quote) {
      console.log(`Found Quotation: ${quote.quotationNumber}`);
      console.log("Before deletion, Quote products:", quote.products.map(p => `${p.productNo} (${p.name})`));
      quote.products = quote.products.filter(p => p.productNo !== "00-774683-00001");
      console.log("After deletion, Quote products:", quote.products.map(p => `${p.productNo} (${p.name})`));

      let subTotalTaxable = 0;
      let subTotalGst = 0;
      quote.products.forEach(p => {
        p.taxableAmount = (p.quantity || 1) * (p.unitPrice || 0);
        p.gstAmount = p.taxableAmount * ((p.gstRate || 18) / 100);
        p.total = p.taxableAmount + p.gstAmount;
        subTotalTaxable += p.taxableAmount;
        subTotalGst += p.gstAmount;
      });

      const charges = quote.additionalCharges || { installation: 0, freight: 0, insurance: 0, other: 0 };
      const chargesTaxable = (Number(charges.installation) || 0) + (Number(charges.freight) || 0) + (Number(charges.insurance) || 0) + (Number(charges.other) || 0);
      const chargesGst = 0; // freight in this PI was 600 without extra GST

      const finalGrand = subTotalTaxable + subTotalGst + chargesTaxable + chargesGst;
      quote.subTotal = subTotalTaxable;
      quote.gstTotal = subTotalGst;
      quote.grandTotal = Math.round(finalGrand);
      quote.roundOff = Math.round((quote.grandTotal - finalGrand) * 100) / 100;

      await quote.save();
      console.log(`Quotation saved. subTotal = ₹${quote.subTotal}, gstTotal = ₹${quote.gstTotal}, grandTotal = ₹${quote.grandTotal}`);
    }

    // Delete obsolete StockLedger entry for 00-774683-00001 on PI-2627-AA-569
    const delLedger = await StockLedger.deleteMany({
      piNo: "PI-2627-AA-569",
      productNo: "00-774683-00001"
    });
    console.log(`Deleted ${delLedger.deletedCount} StockLedger entries for 00-774683-00001 on PI-2627-AA-569.`);

    // Restore stock for 00-774683-00001 (+2 units)
    const drainValveProd = await Product.findOne({ productNo: "00-774683-00001" });
    if (drainValveProd) {
      const oldQty = drainValveProd.quantity || 0;
      drainValveProd.quantity = oldQty + 2;
      await drainValveProd.save();
      console.log(`Product 00-774683-00001 stock restored from ${oldQty} to ${drainValveProd.quantity}.`);
    }

    // =========================================================================
    // TASK 2: Delete DUMMY04 and DUMMY05 entire orders with leads
    // =========================================================================
    console.log("\n--- TASK 2: DELETE DUMMY04 AND DUMMY05 ENTIRE ORDERS WITH LEADS ---");
    const dummyPOs = await PurchaseOrder.find({ poNumber: { $in: ["DUMMY04", "DUMMY05"] } });
    console.log(`Found ${dummyPOs.length} dummy POs:`, dummyPOs.map(p => p.poNumber));
    const delPOs = await PurchaseOrder.deleteMany({ poNumber: { $in: ["DUMMY04", "DUMMY05"] } });
    console.log(`Deleted ${delPOs.deletedCount} POs.`);

    const delQuotes = await Quotation.deleteMany({
      $or: [
        { poNumber: { $in: ["DUMMY04", "DUMMY05"] } },
        { quotationNumber: { $in: ["PI-2627-AD-474", "PI-2627-AD-476"] } }
      ]
    });
    console.log(`Deleted ${delQuotes.deletedCount} Quotations.`);

    const delLeads = await Lead.deleteMany({
      $or: [
        { leadNumber: { $in: ["L-260619-AD-009", "L-260619-AD-010"] } },
        { _id: { $in: [
          new mongoose.Types.ObjectId("6a351ba2b5752bcae0fcc679"),
          new mongoose.Types.ObjectId("6a351bb8b5752bcae0fcc706")
        ] } }
      ]
    });
    console.log(`Deleted ${delLeads.deletedCount} Leads.`);

    // Also check and clean up any invoice or stock ledger references if any
    const db = mongoose.connection.db;
    const delInv = await db.collection("invoices").deleteMany({
      poNumber: { $in: ["DUMMY04", "DUMMY05"] }
    });
    console.log(`Deleted ${delInv.deletedCount} Invoices.`);

    // =========================================================================
    // TASK 3: IRNG-PC2F-36 - Change Type Spare Parts to Equipment
    // =========================================================================
    console.log("\n--- TASK 3: IRNG-PC2F-36 CHANGE TYPE TO EQUIPMENT ---");
    const irngProd = await Product.findOne({ productNo: "IRNG-PC2F-36" });
    if (!irngProd) {
      console.error("Product IRNG-PC2F-36 not found!");
    } else {
      console.log(`Found Product: ${irngProd.productNo} - current type: "${irngProd.type}"`);
      irngProd.type = "Equipment";
      await irngProd.save();
      console.log(`Product ${irngProd.productNo} type successfully updated to "${irngProd.type}".`);
    }

    // Also update any quotations where IRNG-PC2F-36 is cached
    const quoteUpdate = await Quotation.updateMany(
      { "products.productNo": "IRNG-PC2F-36" },
      { $set: { "products.$[elem].type": "Equipment" } },
      { arrayFilters: [{ "elem.productNo": "IRNG-PC2F-36" }] }
    );
    console.log(`Updated ${quoteUpdate.modifiedCount} Quotations containing IRNG-PC2F-36.`);

    // Also check POs just in case
    const poUpdate = await PurchaseOrder.updateMany(
      { "products.productNo": "IRNG-PC2F-36" },
      { $set: { "products.$[elem].type": "Equipment" } },
      { arrayFilters: [{ "elem.productNo": "IRNG-PC2F-36" }] }
    );
    console.log(`Updated ${poUpdate.modifiedCount} POs containing IRNG-PC2F-36.`);

    console.log("\n=== ALL TASKS COMPLETED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("Error executing tasks:", err);
    process.exit(1);
  }
}

main();
