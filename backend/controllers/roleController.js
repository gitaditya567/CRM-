const Role = require("../models/Role");

exports.getAllRoles = async (req, res) => {
    try {
        const roles = await Role.find();
        res.status(200).json(roles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({ error: "Role not found" });
        }
        res.status(200).json(role);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createRole = async (req, res) => {
    try {
        const newRole = new Role(req.body);
        await newRole.save();
        res.status(201).json(newRole);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const updatedRole = await Role.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        res.status(200).json(updatedRole);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteRole = async (req, res) => {
    try {
        // Option to prevent deletion of SuperAdmin
        const role = await Role.findById(req.params.id);
        if (role && role.name === "SuperAdmin") {
            return res.status(400).json({ error: "Cannot delete SuperAdmin role" });
        }

        await Role.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Role deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.initDefaultRoles = async (req, res) => {
    const defaultRoles = ["SuperAdmin", "Sales", "Services", "Client Support", "Dispatch", "Assets"];
    try {
        for (let name of defaultRoles) {
            const exists = await Role.findOne({ name });
            if (!exists) {
                await Role.create({ name });
            }
        }
        res.status(200).json({ message: "Defaults initialized" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
