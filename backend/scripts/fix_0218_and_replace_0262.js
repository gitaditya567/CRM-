const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // =========================================================================
    // TASK 1: Fix PO/SE/INR/26-27/0218
    // =========================================================================
    console.log("\n--- EXECUTING TASK 1: Fix PO/SE/INR/26-27/0218 ---");
    const po0218 = await PurchaseOrder.findOne({ poNumber: /PO\/SE\/INR\/26-27\/0218/i });
    if (!po0218) {
      console.error("PO/SE/INR/26-27/0218 not found!");
    } else {
      console.log(`Found PO: ${po0218.poNumber} (Current Status: ${po0218.status})`);

      // Item 1: GS.3898 -> Invoiced (qty 2)
      // Item 2: PD.4608E-4 -> Pending (invoicedQty 0, currentInvoiceQty 2)
      po0218.products.forEach(p => {
        if (p.productNo === "GS.3898") {
          p.invoicedQuantity = 2;
          p.currentInvoiceQty = 0;
          p.selected = true;
          console.log(`- Set GS.3898: invoicedQuantity = 2, currentInvoiceQty = 0, selected = true`);
        } else if (p.productNo === "PD.4608E-4") {
          p.invoicedQuantity = 0;
          p.currentInvoiceQty = 2;
          p.selected = false; // Remains pending for inward invoice
          console.log(`- Set PD.4608E-4: invoicedQuantity = 0, currentInvoiceQty = 2, selected = false (Pending)`);
        }
      });

      // Update invoiceHistory[0] for TBSPL262700678: only GS.3898 was billed
      if (po0218.invoiceHistory && po0218.invoiceHistory.length > 0) {
        const inv = po0218.invoiceHistory[0];
        inv.products = [
          {
            productNo: "GS.3898",
            name: "Universal Thermocouple 900 mm length, nickel pltd",
            brand: "Nayati",
            quantity: 2,
            unitPrice: 3800,
            total: 7600
          }
        ];
        inv.totalValue = 7600;
        console.log(`- Updated invoiceHistory[0] (${inv.invoiceNo}): totalValue = 7600, products = [GS.3898 (qty 2)]`);
      }

      po0218.status = "Partially Invoiced";
      po0218.isMovedToInvoice = true;
      await po0218.save();
      console.log(`PO/SE/INR/26-27/0218 updated successfully. Status: ${po0218.status}`);

      // Update StockLedger entries for 0218:
      // GS.3898 should keep invoiceNo TBSPL262700678
      // PD.4608E-4 should clear invoiceNo since it's not invoiced yet
      await StockLedger.updateMany(
        { piNo: "PI-2627-AD-1066", productNo: "PD.4608E-4" },
        { $unset: { invoiceNo: "" } }
      );
      console.log("- StockLedger updated for PD.4608E-4 (cleared invoiceNo).");
    }

    // =========================================================================
    // TASK 2: REC/0262/2026 Replace GS.2006 with GS.2006B
    // =========================================================================
    console.log("\n--- EXECUTING TASK 2: Replace GS.2006 with GS.2006B in REC/0262/2026 ---");

    // 1. Fetch GS.2006B product
    const prod2006B = await Product.findOne({ productNo: /GS\.2006B/i });
    if (!prod2006B) {
      console.error("Product GS.2006B not found!");
      process.exit(1);
    }
    console.log(`Found Target Product GS.2006B: id=${prod2006B._id}, name="${prod2006B.name}", currentQty=${prod2006B.quantity}`);

    const prod2006Old = await Product.findOne({ productNo: "GS.2006" });
    if (prod2006Old) {
      console.log(`Found Old Product GS.2006: id=${prod2006Old._id}, currentQty=${prod2006Old.quantity}`);
    }

    // 2. Update PO REC/0262/2026
    const po0262 = await PurchaseOrder.findOne({ poNumber: /REC\/0262\/2026/i });
    if (!po0262) {
      console.error("PO REC/0262/2026 not found!");
    } else {
      console.log(`Found PO: ${po0262.poNumber}`);
      let replacedInPO = false;
      po0262.products.forEach(p => {
        if (p.productNo === "GS.2006") {
          p.product = prod2006B._id;
          p.productNo = prod2006B.productNo;
          p.name = prod2006B.name;
          p.brand = prod2006B.brand || "Nayati";
          p.type = prod2006B.type || "Spare Part";
          p.hsnCode = prod2006B.hsnCode || "84189090";
          replacedInPO = true;
          console.log("- Replaced GS.2006 with GS.2006B in PO products.");
        }
      });
      if (replacedInPO) {
        await po0262.save();
        console.log("PO REC/0262/2026 saved successfully.");
      } else {
        console.log("GS.2006 not found in PO REC/0262/2026 products (already replaced?).");
      }
    }

    // 3. Update Quotation PI-2627-AA-645 (linked to REC/0262/2026)
    const quote0262 = await Quotation.findOne({
      $or: [
        { quotationNumber: "PI-2627-AA-645" },
        { poNumber: /REC\/0262\/2026/i }
      ]
    });
    if (!quote0262) {
      console.error("Quotation for REC/0262/2026 not found!");
    } else {
      console.log(`Found Quotation: ${quote0262.quotationNumber}`);
      let replacedInPI = false;
      quote0262.products.forEach(p => {
        if (p.productNo === "GS.2006") {
          p.product = prod2006B._id;
          p.productNo = prod2006B.productNo;
          p.name = prod2006B.name;
          p.brand = prod2006B.brand || "Nayati";
          p.type = prod2006B.type || "Spare Part";
          p.hsnCode = prod2006B.hsnCode || "84189090";
          replacedInPI = true;
          console.log("- Replaced GS.2006 with GS.2006B in Quotation products.");
        }
      });
      if (replacedInPI) {
        await quote0262.save();
        console.log(`Quotation ${quote0262.quotationNumber} saved successfully.`);
      } else {
        console.log("GS.2006 not found in Quotation products (already replaced?).");
      }
    }

    // 4. Update Product Stock Quantities
    if (prod2006Old) {
      prod2006Old.quantity = (prod2006Old.quantity || 0) + 1; // revert 1 deducted unit: -1 -> 0
      await prod2006Old.save();
      console.log(`Updated GS.2006 quantity -> ${prod2006Old.quantity}`);
    }

    prod2006B.quantity = Math.max(0, (prod2006B.quantity || 0) - 1); // deduct 1 unit for 0262: 1 -> 0
    await prod2006B.save();
    console.log(`Updated GS.2006B quantity -> ${prod2006B.quantity}`);

    // 5. Update StockLedger entry for PI-2627-AA-645
    const ledgerEntry = await StockLedger.findOne({
      piNo: "PI-2627-AA-645",
      productNo: "GS.2006",
      entryType: "OUT"
    });
    if (ledgerEntry) {
      ledgerEntry.product = prod2006B._id;
      ledgerEntry.productNo = prod2006B.productNo;
      ledgerEntry.brand = prod2006B.brand || "Nayati";
      ledgerEntry.balanceAfter = prod2006B.quantity;
      await ledgerEntry.save();
      console.log(`Updated StockLedger entry ${ledgerEntry._id} from GS.2006 to GS.2006B.`);
    } else {
      console.log("No StockLedger entry with GS.2006 found for PI-2627-AA-645 (already updated?).");
    }

    console.log("\n=== ALL TASKS EXECUTED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("Error executing tasks:", err);
    process.exit(1);
  }
}

main();
