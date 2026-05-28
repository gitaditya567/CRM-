const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Client = require('./models/Client');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const prefix = "GEN";
        const lastByCreatedAt = await Client.findOne({
            clientId: { $regex: new RegExp(`^${prefix}-\\d+$`) }
        }).sort({ createdAt: -1 });

        const lastByClientId = await Client.findOne({
            clientId: { $regex: new RegExp(`^${prefix}-\\d+$`) }
        }).sort({ clientId: -1 });

        console.log('Last by createdAt:', lastByCreatedAt ? lastByCreatedAt.clientId : 'None');
        console.log('Last by clientId:', lastByClientId ? lastByClientId.clientId : 'None');

        if (lastByCreatedAt && lastByClientId && lastByCreatedAt.clientId !== lastByClientId.clientId) {
            console.log('DISCREPANCY FOUND!');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
