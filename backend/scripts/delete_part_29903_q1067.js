const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // 1. Update PO Q-2627-KA-1067
    const po = await PurchaseOrder.findOne({ poNumber: /Q-2627-KA-1067/i });
    if (!po) {
      console.error("PO Q-2627-KA-1067 not found!");
      process.exit(1);
    }
    console.log(`Found PO: ${po.poNumber}`);
    console.log("Before deletion, PO products:", po.products.map(p => p.productNo));

    // Filter out 29903
    po.products = po.products.filter(p => p.productNo !== "29903");
    console.log("After deletion, PO products:", po.products.map(p => p.productNo));

    // Recalculate PO totalValue
    // 29533: 1665 * 1.18 = 1964.7
    // 102481S: 6690 * 1.18 = 7894.2
    // Total = 9858.9
    const newTotal = po.products.reduce((sum, p) => sum + (p.total || ((p.unitPrice * p.quantity) * (1 + (p.gstRate || 18)/100))), 0);
    po.totalValue = Math.round(newTotal * 100) / 100;

    // Check status: all remaining products are invoiced and dispatched!
    const allInvoiced = po.products.every(p => (p.invoicedQuantity || 0) >= p.quantity);
    const allDispatched = po.products.every(p => (p.dispatchedQuantity || 0) >= p.quantity);
    if (allDispatched) {
      po.status = "Dispatched";
    } else if (allInvoiced) {
      po.status = "Invoiced";
    }
    await po.save();
    console.log(`PO saved successfully. New totalValue = ${po.totalValue}, status = ${po.status}`);

    // 2. Update Quotation PI-2627-KA-1067
    const quote = await Quotation.findOne({
      $or: [
        { quotationNumber: "PI-2627-KA-1067" },
        { poNumber: /Q-2627-KA-1067/i }
      ]
    });
    if (!quote) {
      console.log("Quotation PI-2627-KA-1067 not found!");
    } else {
      console.log(`Found Quotation: ${quote.quotationNumber}`);
      console.log("Before deletion, Quote products:", quote.products.map(p => p.productNo));
      quote.products = quote.products.filter(p => p.productNo !== "29903");
      console.log("After deletion, Quote products:", quote.products.map(p => p.productNo));

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
      const chargesGst = chargesTaxable * 0.18;

      const finalGrand = subTotalTaxable + subTotalGst + chargesTaxable + chargesGst;
      quote.subTotal = subTotalTaxable + chargesTaxable;
      quote.gstTotal = subTotalGst + chargesGst;
      quote.grandTotal = Math.round(finalGrand);
      quote.roundOff = Math.round((quote.grandTotal - finalGrand) * 100) / 100;

      await quote.save();
      console.log(`Quotation saved successfully. subTotal = ${quote.subTotal}, gstTotal = ${quote.gstTotal}, grandTotal = ${quote.grandTotal}`);
    }

    // 3. Remove obsolete StockLedger conversion entries for 29903 on PI-2627-KA-1067
    const delLedger = await StockLedger.deleteMany({
      piNo: "PI-2627-KA-1067",
      productNo: "29903"
    });
    console.log(`Deleted ${delLedger.deletedCount} StockLedger entries for 29903 on PI-2627-KA-1067.`);

    // 4. Verify Product 29903 stock
    const prod = await Product.findOne({ productNo: "29903" });
    console.log(`Product 29903 (${prod.name}) current stock = ${prod.quantity}`);

    console.log("\n=== DELETION COMPLETED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("Error during deletion:", err);
    process.exit(1);
  }
}

main();
