const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ""
    },
    menuPermissions: {
        type: Map,
        of: {
            view: { type: Boolean, default: false },
            add: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            all: { type: Boolean, default: false }
        },
        default: {}
    },
    modulePermissions: {
        type: Map,
        of: {
            view: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            all: { type: Boolean, default: false }
        },
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model("Role", roleSchema);
