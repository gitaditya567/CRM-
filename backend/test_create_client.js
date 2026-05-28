const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Client = require('./models/Client');
const Group = require('./models/Group');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find "Dealer" group
        const group = await Group.findOne({ name: "Dealers" });
        console.log('Dealer group ID:', group ? group._id : 'None');

        const payload = {
            group: group ? group._id : null,
            clientName: "Test Client " + Date.now(),
            legalEntityName: "Test Legal Entity",
            billingAddress: {
                addressLine1: "123 Street",
                city: "Mumbai",
                distt: "Mumbai",
                state: "Maharashtra",
                zipCode: "400001",
                country: "India"
            },
            gstVatNo: "27AAAAA0000A1Z5",
            contactPerson1: {
                name: "John Doe",
                designation: "Manager",
                phone: "1234567890",
                email: "john@example.com"
            },
            contactPerson2: {
                name: "Jane Doe",
                designation: "Assistant",
                phone: "0987654321",
                email: "jane@example.com"
            },
            isDispatchAddressSame: true,
            isVisible: true,
            isSecret: false,
            allowedUsers: []
        };

        // Replicate controller logic
        let prefix = "GEN";
        if (payload.group) {
            const existingGroup = await Group.findById(payload.group);
            if (!existingGroup) {
                console.log("Selected group not found");
                return;
            }
            prefix = existingGroup.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || "GRP";
        }

        const lastClient = await Client.findOne({
            clientId: { $regex: new RegExp(`^${prefix}-\\d+$`) }
        }).sort({ clientId: -1 });

        let sequence = 1;
        if (lastClient && lastClient.clientId) {
            const parts = lastClient.clientId.split('-');
            if (parts.length === 2 && !isNaN(parts[1])) {
                sequence = parseInt(parts[1], 10) + 1;
            }
        }

        const clientId = `${prefix}-${String(sequence).padStart(3, '0')}`;
        console.log('Generated clientId:', clientId);

        const newClient = new Client({
            ...payload,
            clientId,
            dispatchAddress: payload.isDispatchAddressSame ? payload.billingAddress : payload.dispatchAddress,
        });

        const savedClient = await newClient.save();
        console.log('Successfully saved client:', savedClient.clientName);

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

test();
