"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockMpesaPayment = mockMpesaPayment;
const prisma_1 = require("../services/prisma");
const KES_PER_SEAT = 500;
// ============================================================================
// POST /api/payment/mock-mpesa { tenantId, amount }
// ----------------------------------------------------------------------------
// Simulates an M-Pesa STK push payment confirmation. In production this
// would be a webhook Safaricom calls after the customer approves the
// payment on their phone; here we just trust the request body (MVP only —
// real version MUST verify the M-Pesa callback signature / checkout id).
// Increases tenant.seatsLimit by floor(amount / 500).
// ============================================================================
async function mockMpesaPayment(req, res) {
    const { tenantId, amount } = req.body;
    if (!tenantId || !amount || amount <= 0) {
        return res.status(400).json({ error: "tenantId and a positive amount are required" });
    }
    const seatsPurchased = Math.floor(amount / KES_PER_SEAT);
    if (seatsPurchased < 1) {
        return res.status(400).json({ error: `Minimum payment is KES ${KES_PER_SEAT} (1 seat)` });
    }
    const tenant = await prisma_1.prisma.tenant.update({
        where: { id: tenantId },
        data: { seatsLimit: { increment: seatsPurchased } },
    });
    return res.json({
        status: "success",
        seatsPurchased,
        newSeatsLimit: tenant.seatsLimit,
        receipt: `MOCK-MPESA-${Date.now()}`,
    });
}
