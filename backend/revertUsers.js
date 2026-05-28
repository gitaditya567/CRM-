const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const User = require('./models/User');
    await User.updateMany({ role: 'superadmin' }, { $set: { role: 'admin' } });
    await User.updateMany({ role: 'Sales' }, { $set: { role: 'staff' } });
    console.log('Users role reverted to admin/staff');
    process.exit(0);
}).catch(console.error);
