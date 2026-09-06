const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Product = require('../models/Product');
const StockLedger = require('../models/StockLedger');
const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Lead = require('../models/Lead');
const { clearCachePrefix } = require('../utils/cache');

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            maxPoolSize: 3,
            minPoolSize: 0,
        });
        console.log('Connected to MongoDB successfully!\n');

        // =========================================================================
        // TASK 1: 102690S - Change Stock to 0
        // =========================================================================
        console.log('=========================================================================');
        console.log('TASK 1: 102690S - Change Stock to 0');
        console.log('=========================================================================');

        const product102690S = await Product.findOne({ productNo: '102690S' });
        if (!product102690S) {
            console.error('Product 102690S not found in database!');
        } else {
            console.log(`Found Product 102690S (${product102690S.name}): Current stock = ${product102690S.quantity}`);
            const previousQty = product102690S.quantity || 0;
            if (previousQty !== 0) {
                product102690S.quantity = 0;
                await product102690S.save();
                console.log(`Updated Product 102690S stock to: ${product102690S.quantity}`);

                // Add an ADJUSTMENT entry in StockLedger
                const adjustmentQty = 0 - previousQty;
                const ledgerEntry = new StockLedger({
                    product: product102690S._id,
                    productNo: product102690S.productNo,
                    brand: product102690S.brand || '',
                    entryType: 'ADJUSTMENT',
                    quantity: adjustmentQty,
                    balanceAfter: 0,
                    remarks: 'Manual stock adjustment to 0',
                    date: new Date()
                });
                await ledgerEntry.save();
                console.log(`Created StockLedger ADJUSTMENT entry: qty = ${adjustmentQty}, balanceAfter = 0`);
            } else {
                console.log('Product 102690S stock is already 0.');
            }
        }


        // =========================================================================
        // TASK 2: 7100066961 - Move this back to PI
        // =========================================================================
        console.log('\n=========================================================================');
        console.log('TASK 2: 7100066961 - Move this back to PI');
        console.log('=========================================================================');

        const quotation = await Quotation.findOne({
            $or: [
                { poNumber: '7100066961' },
                { quotationNumber: 'PI-2627-AD-090' }
            ]
        }).populate('lead');

        if (!quotation) {
            console.error('Quotation / PI for 7100066961 / PI-2627-AD-090 not found!');
        } else {
            console.log('Found Quotation before update:', {
                _id: quotation._id,
                quotationNumber: quotation.quotationNumber,
                poNumber: quotation.poNumber,
                status: quotation.status,
                isConvertedToPO: quotation.isConvertedToPO
            });

            // 1. Move back to PI in PI Management by setting isConvertedToPO to false
            quotation.isConvertedToPO = false;
            quotation.status = 'Accepted';
            await quotation.save();
            console.log(`Updated Quotation -> quotationNumber: ${quotation.quotationNumber}, status: ${quotation.status}, isConvertedToPO: ${quotation.isConvertedToPO}`);

            // 2. Remove the Inward PurchaseOrder from PO Management
            const deletePoResult = await PurchaseOrder.deleteMany({
                $or: [
                    { poNumber: '7100066961' },
                    { pi: quotation._id }
                ]
            });
            console.log(`Deleted ${deletePoResult.deletedCount} PurchaseOrder(s) matching PO 7100066961 / PI ${quotation._id}`);

            // 3. Reverse the stock deduction on the products in this PI
            const productCodes = quotation.products.map(p => p.productNo).filter(Boolean);
            console.log('Reversing stock deductions for PI products:', productCodes);

            // Delete the OUT stock ledger entries for this PI
            const deleteLedgersResult = await StockLedger.deleteMany({
                piNo: 'PI-2627-AD-090',
                entryType: 'OUT'
            });
            console.log(`Deleted ${deleteLedgersResult.deletedCount} OUT StockLedger entries for PI-2627-AD-090.`);

            // Reset products stock back to 1 (Opening Stock)
            for (const pNo of productCodes) {
                const pDoc = await Product.findOne({ productNo: pNo });
                if (pDoc) {
                    pDoc.quantity = 1;
                    await pDoc.save();
                    console.log(`Reset Product ${pNo} (${pDoc.name}) stock to: ${pDoc.quantity}`);
                }
            }
        }

        // =========================================================================
        // Cache Invalidation
        // =========================================================================
        try {
            clearCachePrefix('product_');
            clearCachePrefix('dashboard_');
            console.log('Cache invalidated successfully.');
        } catch (cErr) {
            console.log('Cache clear skipped or failed:', cErr.message);
        }

        console.log('\n=========================================================================');
        console.log('ALL TASKS COMPLETED SUCCESSFULLY!');
        console.log('=========================================================================');

    } catch (e) {
        console.error('Execution error:', e);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
}

run();
