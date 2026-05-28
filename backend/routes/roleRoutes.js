const express = require("express");
const router = express.Router();
const {
    getAllRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    initDefaultRoles
} = require("../controllers/roleController");

// Add auth middleware here if needed (e.g. requireAuth, adminOnly)

router.get("/init", initDefaultRoles);
router.get("/", getAllRoles);
router.get("/:id", getRole);
router.post("/", createRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

module.exports = router;
