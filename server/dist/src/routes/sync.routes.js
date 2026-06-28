"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenantScope_1 = require("../middleware/tenantScope");
const sync_controller_1 = require("../controllers/sync.controller");
const router = (0, express_1.Router)();
// Any authenticated learner can sync their own queued progress.
router.post("/progress", auth_1.authenticate, tenantScope_1.tenantScope, sync_controller_1.syncProgress);
exports.default = router;
