const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Client = require('./models/Client');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const duplicates = await Client.aggregate([
            { $group: { _id: "$clientId", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
        ]);

        if (duplicates.length > 0) {
            console.log('Found duplicate clientIds:');
            duplicates.forEach(d => console.log(`- ${d._id}: ${d.count} times`));
        } else {
            console.log('No duplicate clientIds found.');
        }

        const nullClientId = await Client.countDocuments({ clientId: null });
        console.log('Clients with null clientId:', nullClientId);

        const undefinedClientId = await Client.countDocuments({ clientId: "undefined" });
        console.log('Clients with string "undefined" clientId:', undefinedClientId);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
