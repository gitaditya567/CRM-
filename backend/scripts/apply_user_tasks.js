const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Lead = require('../models/Lead');
const Product = require('../models/Product');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        console.log('Connected to MongoDB successfully!');

        // =========================================================================
        // TASK 1: Revert PO 100221 / PI-2627-KA-819 back to Quotation Management
        // =========================================================================
        console.log('\n=========================================================================');
        console.log('TASK 1: Revert PO 100221 / PI-2627-KA-819 to Quotation Management (Q-2627-KA-819)');
        console.log('=========================================================================');

        const q819 = await Quotation.findOne({
            $or: [
                { quotationNumber: 'PI-2627-KA-819' },
                { quotationNumber: 'Q-2627-KA-819' },
                { poNumber: '100221' }
            ]
        });

        if (!q819) {
            console.error('Quotation 819 / PO 100221 not found!');
        } else {
            console.log('Found Quotation 819 before update:', {
                _id: q819._id,
                quotationNumber: q819.quotationNumber,
                poNumber: q819.poNumber,
                status: q819.status,
                isConvertedToPO: q819.isConvertedToPO
            });

            // Update to Quotation
            q819.quotationNumber = 'Q-2627-KA-819';
            q819.status = 'Sent';
            q819.poNumber = '';
            q819.poDate = null;
            q819.poComment = '';
            q819.isConvertedToPO = false;

            // Also ensure any brand T&S is updated to NAYATI if present
            q819.products.forEach(p => {
                if (p.brand && p.brand.trim().toUpperCase() === 'T&S') {
                    console.log(`Updating product ${p.productNo} brand from ${p.brand} to NAYATI`);
                    p.brand = 'NAYATI';
                }
            });

            await q819.save();
            console.log('Quotation 819 successfully updated to Q-2627-KA-819 in Quotation Management!');

            // Delete Inward PO 100221
            const poDelete819 = await PurchaseOrder.deleteMany({
                $or: [
                    { poNumber: '100221' },
                    { pi: q819._id }
                ]
            });
            console.log(`Deleted ${poDelete819.deletedCount} Purchase Order(s) for PO 100221 / Quotation 819.`);

            // Revert Lead status to "Quotation Submitted"
            if (q819.lead) {
                const lead819 = await Lead.findById(q819.lead);
                if (lead819) {
                    console.log(`Lead ${lead819.leadNumber} (${lead819.name}) before status: ${lead819.status}`);
                    lead819.status = 'Quotation Submitted';
                    await lead819.save();
                    console.log(`Lead ${lead819.leadNumber} status updated to: ${lead819.status}`);
                }
            }
        }

        // =========================================================================
        // TASK 2: Move Q-2627-AD-873 / PI-2627-AD-873 back to PI Management
        //         and Change brand T&S to NAYATI
        // =========================================================================
        console.log('\n=========================================================================');
        console.log('TASK 2: Move Q-2627-AD-873 / PI-2627-AD-873 back to PI Management & change brand T&S to NAYATI');
        console.log('=========================================================================');

        const q873 = await Quotation.findOne({
            $or: [
                { quotationNumber: 'PI-2627-AD-873' },
                { quotationNumber: 'Q-2627-AD-873' },
                { poNumber: 'Q-2627-AD-873' }
            ]
        });

        if (!q873) {
            console.error('Quotation 873 not found!');
        } else {
            console.log('Found Quotation 873 before update:', {
                _id: q873._id,
                quotationNumber: q873.quotationNumber,
                poNumber: q873.poNumber,
                status: q873.status,
                isConvertedToPO: q873.isConvertedToPO,
                products: q873.products.map(p => ({ productNo: p.productNo, name: p.name, brand: p.brand }))
            });

            // Update to PI Management
            q873.quotationNumber = 'PI-2627-AD-873';
            q873.status = 'Accepted';
            q873.isConvertedToPO = false;
            q873.poDate = null;
            q873.poComment = '';

            // Update brand T&S to NAYATI
            q873.products.forEach(p => {
                if (p.brand && (p.brand.trim().toUpperCase() === 'T&S' || p.productNo === 'GS.9711R-1')) {
                    console.log(`Updating Quotation 873 product ${p.productNo} brand from "${p.brand}" to "NAYATI"`);
                    p.brand = 'NAYATI';
                }
            });

            await q873.save();
            console.log('Quotation 873 successfully updated to PI-2627-AD-873 in PI Management!');

            // Delete Inward PO Q-2627-AD-873 created from this PI
            const poDelete873 = await PurchaseOrder.deleteMany({
                $or: [
                    { poNumber: 'Q-2627-AD-873' },
                    { pi: q873._id }
                ]
            });
            console.log(`Deleted ${poDelete873.deletedCount} Purchase Order(s) for PI-2627-AD-873.`);
        }

        // =========================================================================
        // TASK 3: Update Product Master for GS.9711R-1 brand to NAYATI
        // =========================================================================
        console.log('\n=========================================================================');
        console.log('TASK 3: Update Product Master for GS.9711R-1 brand to NAYATI');
        console.log('=========================================================================');

        const productMaster = await Product.findOne({ productNo: /GS\.9711R-1/i });
        if (productMaster) {
            console.log(`Found Product Master: ${productMaster.productNo}, current brand: ${productMaster.brand}`);
            productMaster.brand = 'NAYATI';
            await productMaster.save();
            console.log(`Product Master ${productMaster.productNo} brand updated to: ${productMaster.brand}`);
        } else {
            console.log('Product Master GS.9711R-1 not found in Product collection.');
        }

        console.log('\n=========================================================================');
        console.log('ALL TASKS COMPLETED SUCCESSFULLY!');
        console.log('=========================================================================');

    } catch (e) {
        console.error('Error executing tasks:', e);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
}

run();
