const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Role = require('./models/Role');
    const defaultRoles = ["Sales", "Services", "Client Support", "Dispatch", "Assets"];
    try {
        for (let name of defaultRoles) {
            const exists = await Role.findOne({ name });
            if (!exists) {
                await Role.create({ name });
                console.log("Created", name);
            }
        }
        res.status(200).json({ message: "Defaults initialized" });
    } catch (err) { }
    console.log('Roles verified');
    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
