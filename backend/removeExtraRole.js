const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Role = require('./models/Role');
    // We are deleting the lower case version "superadmin"
    await Role.deleteOne({ name: "superadmin" });

    // Check if there are other roles they might want to remove, e.g. "SuperAdmin", but wait they might have said "last wala superadmin hatao extra hai"

    const roles = await Role.find({});
    console.log("Current Roles:", roles.map(r => r.name));
    process.exit(0);
}).catch(console.error);



