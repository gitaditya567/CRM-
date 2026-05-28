require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log("Attempting to connect to:", process.env.MONGO_URI.split('@')[1]); // Log safe part of URI
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connection SUCCESS");
        process.exit(0);
    } catch (err) {
        console.error("MongoDB Connection FAILED");
        console.error(err);
        process.exit(1);
    }
};

connectDB();
