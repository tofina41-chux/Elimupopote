"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const payment_controller_1 = require("../controllers/payment.controller");
const router = (0, express_1.Router)();
// Superadmin triggers/confirms seat top-ups on behalf of a tenant.
router.post("/mock-mpesa", auth_1.authenticate, (0, auth_1.requireRole)("SUPERADMIN"), payment_controller_1.mockMpesaPayment);
exports.default = router;
