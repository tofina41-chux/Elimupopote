"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTenants = listTenants;
exports.createTenant = createTenant;
exports.updateTenant = updateTenant;
const prisma_1 = require("../services/prisma");
// All handlers here are mounted behind requireRole("SUPERADMIN") in
// routes/tenants.routes.ts — tenant CRUD is superadmin-only.
// GET /api/tenants
async function listTenants(_req, res) {
    const tenants = await prisma_1.prisma.tenant.findMany({
        include: { _count: { select: { users: true, courses: true } } },
        orderBy: { createdAt: "desc" },
    });
    return res.json(tenants);
}
// POST /api/tenants { name, seatsLimit? }
async function createTenant(req, res) {
    const { name, seatsLimit } = req.body;
    if (!name)
        return res.status(400).json({ error: "name is required" });
    const tenant = await prisma_1.prisma.tenant.create({
        data: { name, seatsLimit: seatsLimit ?? 5 },
    });
    return res.status(201).json(tenant);
}
// PATCH /api/tenants/:id { isActive?, seatsLimit? }
async function updateTenant(req, res) {
    const { id } = req.params;
    const { isActive, seatsLimit } = req.body;
    const tenant = await prisma_1.prisma.tenant.update({
        where: { id },
        data: {
            ...(isActive !== undefined ? { isActive } : {}),
            ...(seatsLimit !== undefined ? { seatsLimit } : {}),
        },
    });
    return res.json(tenant);
}
