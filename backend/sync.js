require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const PurchaseOrder = require('./models/PurchaseOrder');
        const StockLedger = require('./models/StockLedger');
        const Product = require('./models/Product');
        const Quotation = require('./models/Quotation');

        // Find all Inward POs
        const inwardPOs = await PurchaseOrder.find({ type: 'inward' }).populate('pi');
        console.log(`Found ${inwardPOs.length} inward POs.`);

        let processedCount = 0;

        for (const po of inwardPOs) {
            // Check if there is an initialization StockLedger entry for this PO
            const hasLedger = await StockLedger.findOne({ 
                poNo: po.poNumber, 
                remarks: { $regex: /Subtracted stock upon PI conversion to Inward PO/i }
            });

            if (!hasLedger) {
                console.log(`Processing legacy PO: ${po.poNumber}`);
                for (const p of po.products) {
                    if (p.selected === false || !p.product) continue;
                    
                    const qtyToSubtract = Number(p.quantity) || 0;
                    if (qtyToSubtract <= 0) continue;

                    const productDoc = await Product.findById(p.product);
                    if (productDoc) {
                        productDoc.quantity = (productDoc.quantity || 0) - qtyToSubtract;
                        const updatedProduct = await productDoc.save();

                        const ledgerEntry = new StockLedger({
                            product: updatedProduct._id,
                            productNo: updatedProduct.productNo,
                            brand: updatedProduct.brand,
                            entryType: "OUT",
                            piNo: po.pi?.quotationNumber || "",
                            poNo: po.poNumber,
                            date: po.createdAt || new Date(),
                            quantity: qtyToSubtract,
                            unitPrice: p.unitPrice || 0,
                            balanceAfter: updatedProduct.quantity,
                            remarks: `Subtracted stock upon PI conversion to Inward PO (Legacy Sync)`
                        });
                        await ledgerEntry.save();
                        console.log(`Deducted ${qtyToSubtract} from ${productDoc.name}`);
                    }
                }
                processedCount++;
            }
        }
        
        console.log(`Successfully processed ${processedCount} legacy POs.`);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
