"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenants_controller_1 = require("../controllers/tenants.controller");
const router = (0, express_1.Router)();
// Tenant management is SUPERADMIN-only.
router.use(auth_1.authenticate, (0, auth_1.requireRole)("SUPERADMIN"));
router.get("/", tenants_controller_1.listTenants);
router.post("/", tenants_controller_1.createTenant);
router.patch("/:id", tenants_controller_1.updateTenant);
exports.default = router;
