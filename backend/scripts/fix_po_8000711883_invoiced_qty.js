const mongoose = require("mongoose");
require("dotenv").config();

const PurchaseOrder = require("../models/PurchaseOrder");

async function fixInvoicedQty() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const po = await PurchaseOrder.findOne({ poNumber: /8000711883/i });
    if (!po) {
      console.error("PO 8000711883 not found!");
      process.exit(1);
    }

    console.log(`Found PO: ${po.poNumber}`);

    // Recalculate invoicedQuantity for each product from invoiceHistory
    po.products.forEach(p => {
      let invoicedSum = 0;
      if (po.invoiceHistory && po.invoiceHistory.length > 0) {
        po.invoiceHistory.forEach(inv => {
          if (inv.products && inv.products.length > 0) {
            inv.products.forEach(invItem => {
              if (invItem.productNo === p.productNo) {
                invoicedSum += (Number(invItem.quantity) || 0);
              }
            });
          }
        });
      }
      p.invoicedQuantity = invoicedSum;
      p.currentInvoiceQty = Math.max(0, p.quantity - invoicedSum);
      console.log(`Product ${p.productNo}: quantity=${p.quantity}, invoicedQuantity=${p.invoicedQuantity}, currentInvoiceQty=${p.currentInvoiceQty}`);
    });

    const allBilled = po.products.every(p => (p.invoicedQuantity || 0) >= p.quantity);
    po.status = allBilled ? "Invoiced" : "Partially Invoiced";
    po.isMovedToInvoice = true;

    await po.save();
    console.log(`PO ${po.poNumber} updated! Status: ${po.status}`);

    process.exit(0);
  } catch (err) {
    console.error("Error fixing PO invoiced quantity:", err);
    process.exit(1);
  }
}

fixInvoicedQty();
