const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Client = require('./models/Client');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const clients = await Client.find({}, 'clientId clientName');
        console.log('Total clients:', clients.length);
        clients.forEach(c => console.log(`- ${c.clientId}: ${c.clientName}`));

        const lastClient = await Client.findOne({
            clientId: { $regex: new RegExp(`^GEN-\\d+$`) }
        }).sort({ createdAt: -1 });
        
        console.log('Last GEN client:', lastClient ? lastClient.clientId : 'None');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
