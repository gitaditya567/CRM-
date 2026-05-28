const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Role = require('./models/Role');
    await Role.deleteOne({ name: "SuperAdmin" });

    const roles = await Role.find({});
    console.log("Current Roles:", roles.map(r => r.name));
    process.exit(0);
}).catch(console.error);
