import { Request, Response } from "express";
import { prisma } from "../services/prisma";

// All handlers here are mounted behind requireRole("SUPERADMIN") in
// routes/tenants.routes.ts — tenant CRUD is superadmin-only.

// GET /api/tenants
export async function listTenants(_req: Request, res: Response) {
  const tenants = await prisma.tenant.findMany({
    include: { _count: { select: { users: true, courses: true } } },
    orderBy: { createdAt: "desc" },
  });
  return res.json(tenants);
}

// POST /api/tenants { name, seatsLimit? }
export async function createTenant(req: Request, res: Response) {
  const { name, seatsLimit } = req.body as { name: string; seatsLimit?: number };
  if (!name) return res.status(400).json({ error: "name is required" });

  const tenant = await prisma.tenant.create({
    data: { name, seatsLimit: seatsLimit ?? 5 },
  });
  return res.status(201).json(tenant);
}

// PATCH /api/tenants/:id { isActive?, seatsLimit? }
export async function updateTenant(req: Request, res: Response) {
  const { id } = req.params;
  const { isActive, seatsLimit } = req.body as { isActive?: boolean; seatsLimit?: number };

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(seatsLimit !== undefined ? { seatsLimit } : {}),
    },
  });
  return res.json(tenant);
}
