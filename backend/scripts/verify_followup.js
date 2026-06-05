const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Lead = require("../models/Lead");
const Quotation = require("../models/Quotation");
const User = require("../models/User");
const Group = require("../models/Group");
const Product = require("../models/Product");
const Client = require("../models/Client");
const Role = require("../models/Role");

const leadController = require("../controllers/leadController");
const quotationController = require("../controllers/quotationController");

async function run() {
    try {
        console.log("Connecting to database: ", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully!\n");

        // Find or create an admin user
        let user = await User.findOne({ role: "admin" });
        if (!user) {
            console.log("Creating a temporary admin user...");
            user = await User.create({
                name: "Test Admin",
                email: "testadmin@shop.com",
                password: "hashedpassword123",
                role: "admin"
            });
        }
        console.log(`Using admin user: ${user.name} (ID: ${user._id})`);

        // Create a dummy lead
        const lead = await Lead.create({
            name: "Test Verification Lead",
            phone: "9999988888",
            status: "New"
        });
        console.log(`Created test lead: ${lead.name} (ID: ${lead._id})`);

        // Create a dummy quotation
        const quotation = await Quotation.create({
            quotationNumber: `Q-TEST-${Date.now()}`,
            lead: lead._id,
            products: []
        });
        console.log(`Created test quotation: ${quotation.quotationNumber} (ID: ${quotation._id})\n`);

        // Mock app and sockets for controller
        const mockApp = {
            get: (key) => {
                if (key === "io") {
                    return {
                        emit: (event, data) => {
                            console.log(`   [Socket.io] Emitted event: ${event}`);
                        }
                    };
                }
                return null;
            }
        };

        const createMockRes = () => {
            const res = {
                statusCode: 200,
                jsonData: null,
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(data) {
                    this.jsonData = data;
                    return this;
                }
            };
            return res;
        };

        // --- TEST CASE 1: Lead Follow-up under 100 words ---
        console.log("=== Test Case 1: Add Lead Follow-up (under 100 words) ===");
        const req1 = {
            params: { id: lead._id.toString() },
            body: { date: new Date().toISOString(), remark: "Good meeting today. Client requested a follow up next week." },
            user: { _id: user._id },
            app: mockApp
        };
        const res1 = createMockRes();
        await leadController.addFollowUp(req1, res1);

        console.log(`Response Code: ${res1.statusCode}`);
        if (res1.statusCode === 200) {
            console.log("✓ Success: Lead follow-up added!");
            const lastFU = res1.jsonData.followUps[res1.jsonData.followUps.length - 1];
            console.log(`   Creator ID: ${lastFU.createdBy?._id || lastFU.createdBy}`);
            console.log(`   Creator Name (populated): ${lastFU.createdBy?.name}`);
            console.log(`   Remark: "${lastFU.remark}"`);
        } else {
            console.error("✗ Failure: Status code is not 200", res1.jsonData);
        }
        console.log();

        // --- TEST CASE 2: Lead Follow-up over 100 words ---
        console.log("=== Test Case 2: Add Lead Follow-up (over 100 words) ===");
        const longRemark = Array(105).fill("word").join(" ");
        const req2 = {
            params: { id: lead._id.toString() },
            body: { date: new Date().toISOString(), remark: longRemark },
            user: { _id: user._id },
            app: mockApp
        };
        const res2 = createMockRes();
        await leadController.addFollowUp(req2, res2);

        console.log(`Response Code: ${res2.statusCode}`);
        if (res2.statusCode === 400) {
            console.log("✓ Success: Blocked Lead follow-up > 100 words!");
            console.log(`   Message: "${res2.jsonData.message}"`);
        } else {
            console.error("✗ Failure: Expected 400 Bad Request", res2.jsonData);
        }
        console.log();

        // --- TEST CASE 3: Quotation Follow-up under 100 words ---
        console.log("=== Test Case 3: Add Quotation Follow-up (under 100 words) ===");
        const req3 = {
            params: { id: quotation._id.toString() },
            body: { date: new Date().toISOString(), remark: "Quotation follow up remark. Client is happy with the pricing." },
            user: { _id: user._id },
            app: mockApp
        };
        const res3 = createMockRes();
        await quotationController.addFollowUp(req3, res3);

        console.log(`Response Code: ${res3.statusCode}`);
        if (res3.statusCode === 200) {
            console.log("✓ Success: Quotation follow-up added!");
            const lastFU = res3.jsonData.followUps[res3.jsonData.followUps.length - 1];
            console.log(`   Creator ID: ${lastFU.createdBy?._id || lastFU.createdBy}`);
            console.log(`   Creator Name (populated): ${lastFU.createdBy?.name}`);
            console.log(`   Remark: "${lastFU.remark}"`);
        } else {
            console.error("✗ Failure: Status code is not 200", res3.jsonData);
        }
        console.log();

        // --- TEST CASE 4: Quotation Follow-up over 100 words ---
        console.log("=== Test Case 4: Add Quotation Follow-up (over 100 words) ===");
        const req4 = {
            params: { id: quotation._id.toString() },
            body: { date: new Date().toISOString(), remark: longRemark },
            user: { _id: user._id },
            app: mockApp
        };
        const res4 = createMockRes();
        await quotationController.addFollowUp(req4, res4);

        console.log(`Response Code: ${res4.statusCode}`);
        if (res4.statusCode === 400) {
            console.log("✓ Success: Blocked Quotation follow-up > 100 words!");
            console.log(`   Message: "${res4.jsonData.message}"`);
        } else {
            console.error("✗ Failure: Expected 400 Bad Request", res4.jsonData);
        }
        console.log();

        // Clean up
        console.log("Cleaning up test documents...");
        await Lead.findByIdAndDelete(lead._id);
        await Quotation.findByIdAndDelete(quotation._id);
        console.log("Clean up finished!");

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("Error running verification script:", err);
        mongoose.disconnect();
        process.exit(1);
    }
}

run();
