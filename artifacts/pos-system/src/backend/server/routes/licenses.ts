import { Router } from "express";
import { db } from "@workspace/db";
import { licensesTable, licenseActivationsTable, licenseLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const DEV_KEY = process.env.DEV_ADMIN_KEY ?? "DEV-ADMIN-2024";

function isAdmin(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  return req.headers["x-dev-key"] === DEV_KEY;
}

function requireAdmin(res: { status: (code: number) => { json: (body: unknown) => void } }, next: () => void, req: Parameters<typeof isAdmin>[0]) {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${seg()}-${seg()}-${seg()}-${seg()}`;
}

function addLog(licenseId: number, action: string, user: string, details?: string) {
  return db.insert(licenseLogsTable).values({ licenseId, action, user, details });
}

function calcExpire(type: string, start: Date): Date | null {
  const d = new Date(start);
  if (type === "trial") { d.setDate(d.getDate() + 30); return d; }
  if (type === "monthly") { d.setMonth(d.getMonth() + 1); return d; }
  if (type === "semi_annual") { d.setMonth(d.getMonth() + 6); return d; }
  if (type === "annual") { d.setFullYear(d.getFullYear() + 1); return d; }
  if (type === "lifetime" || type === "cloud") return null;
  if (type === "multi_branch") { d.setFullYear(d.getFullYear() + 1); return d; }
  if (type === "local") { d.setFullYear(d.getFullYear() + 1); return d; }
  return null;
}

/* ── ADMIN: list all licenses ── */
router.get("/licenses", async (req, res) => {
  if (!isAdmin(req)) return void res.status(403).json({ error: "Unauthorized" });
  try {
    const rows = await db.select().from(licensesTable).orderBy(desc(licensesTable.createdDate));
    const result = await Promise.all(rows.map(async (lic) => {
      const activations = await db.select().from(licenseActivationsTable).where(eq(licenseActivationsTable.licenseId, lic.id));
      return { ...lic, activationCount: activations.length, activations };
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── ADMIN: get single license ── */
router.get("/licenses/:id", async (req, res) => {
  if (!isAdmin(req)) return void res.status(403).json({ error: "Unauthorized" });
  try {
    const id = Number(req.params.id);
    const [lic] = await db.select().from(licensesTable).where(eq(licensesTable.id, id));
    if (!lic) return void res.status(404).json({ error: "Not found" });
    const activations = await db.select().from(licenseActivationsTable).where(eq(licenseActivationsTable.licenseId, id));
    const logs = await db.select().from(licenseLogsTable).where(eq(licenseLogsTable.licenseId, id)).orderBy(desc(licenseLogsTable.date));
    res.json({ ...lic, activations, logs });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── ADMIN: create license ── */
router.post("/licenses", async (req, res) => {
  if (!isAdmin(req)) return void res.status(403).json({ error: "Unauthorized" });
  try {
    const { companyName, licenseType, customerId, branchLimit, userLimit, posLimit, notes } = req.body;
    if (!companyName || !licenseType) return void res.status(400).json({ error: "companyName and licenseType required" });
    const licenseKey = generateLicenseKey();
    const startDate = new Date();
    const expireDate = calcExpire(licenseType, startDate);
    const [lic] = await db.insert(licensesTable).values({
      licenseKey,
      customerId,
      companyName,
      licenseType,
      startDate,
      expireDate,
      status: "pending",
      branchLimit: branchLimit ?? 1,
      userLimit: userLimit ?? 5,
      posLimit: posLimit ?? 1,
      notes,
    }).returning();
    await addLog(lic.id, "created", "developer", `نوع الترخيص: ${licenseType}`);
    res.status(201).json(lic);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── ADMIN: update license (renew, activate, suspend, transfer) ── */
router.patch("/licenses/:id", async (req, res) => {
  if (!isAdmin(req)) return void res.status(403).json({ error: "Unauthorized" });
  try {
    const id = Number(req.params.id);
    const { status, companyName, branchLimit, userLimit, posLimit, notes, licenseType, renewMonths, machineId } = req.body;
    const [existing] = await db.select().from(licensesTable).where(eq(licensesTable.id, id));
    if (!existing) return void res.status(404).json({ error: "Not found" });

    const updates: Partial<typeof existing> = {};
    if (status) updates.status = status;
    if (companyName) updates.companyName = companyName;
    if (branchLimit !== undefined) updates.branchLimit = branchLimit;
    if (userLimit !== undefined) updates.userLimit = userLimit;
    if (posLimit !== undefined) updates.posLimit = posLimit;
    if (notes !== undefined) updates.notes = notes;
    if (licenseType) {
      updates.licenseType = licenseType;
      const base = new Date();
      updates.expireDate = calcExpire(licenseType, base) ?? undefined;
    }
    if (renewMonths) {
      const base = existing.expireDate && existing.expireDate > new Date() ? existing.expireDate : new Date();
      const d = new Date(base);
      d.setMonth(d.getMonth() + Number(renewMonths));
      updates.expireDate = d;
    }
    if (machineId !== undefined) {
      updates.machineId = machineId;
      if (machineId === null) {
        await db.delete(licenseActivationsTable).where(eq(licenseActivationsTable.licenseId, id));
      }
    }

    const [updated] = await db.update(licensesTable).set(updates).where(eq(licensesTable.id, id)).returning();
    const action = status === "active" ? "activated" : status === "suspended" ? "suspended" : renewMonths ? "renewed" : machineId === null ? "transferred" : "updated";
    await addLog(id, action, "developer", JSON.stringify(updates));
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── ADMIN: delete license ── */
router.delete("/licenses/:id", async (req, res) => {
  if (!isAdmin(req)) return void res.status(403).json({ error: "Unauthorized" });
  try {
    const id = Number(req.params.id);
    await db.delete(licenseActivationsTable).where(eq(licenseActivationsTable.licenseId, id));
    await db.delete(licenseLogsTable).where(eq(licenseLogsTable.licenseId, id));
    await db.delete(licensesTable).where(eq(licensesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── CLIENT: activate license ── */
router.post("/license/activate", async (req, res) => {
  try {
    const { licenseKey, machineId } = req.body;
    if (!licenseKey || !machineId) return void res.status(400).json({ error: "licenseKey and machineId required" });

    const [lic] = await db.select().from(licensesTable).where(eq(licensesTable.licenseKey, licenseKey));
    if (!lic) return void res.status(404).json({ error: "license_not_found", message: "مفتاح الترخيص غير صحيح" });
    if (lic.status === "suspended") return void res.status(403).json({ error: "license_suspended", message: "الترخيص موقوف" });
    if (lic.expireDate && lic.expireDate < new Date()) return void res.status(403).json({ error: "license_expired", message: "انتهت صلاحية الترخيص" });
    if (lic.machineId && lic.machineId !== machineId) return void res.status(403).json({ error: "machine_mismatch", message: "الترخيص مرتبط بجهاز آخر" });

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.socket?.remoteAddress ?? "";

    if (!lic.machineId) {
      await db.update(licensesTable).set({ machineId, status: "active" }).where(eq(licensesTable.id, lic.id));
      await db.insert(licenseActivationsTable).values({ licenseId: lic.id, machineId, ipAddress: ip });
      await addLog(lic.id, "activated", machineId, `IP: ${ip}`);
    } else {
      const [existingAct] = await db.select().from(licenseActivationsTable).where(eq(licenseActivationsTable.licenseId, lic.id));
      if (existingAct) {
        await db.update(licenseActivationsTable).set({ lastSeen: new Date(), ipAddress: ip }).where(eq(licenseActivationsTable.id, existingAct.id));
      }
    }

    const [refreshed] = await db.select().from(licensesTable).where(eq(licensesTable.id, lic.id));
    res.json({
      ok: true,
      license: {
        licenseKey: refreshed.licenseKey,
        companyName: refreshed.companyName,
        licenseType: refreshed.licenseType,
        status: refreshed.status,
        expireDate: refreshed.expireDate,
        branchLimit: refreshed.branchLimit,
        userLimit: refreshed.userLimit,
        posLimit: refreshed.posLimit,
        machineId: refreshed.machineId,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── CLIENT: verify license ── */
router.post("/license/verify", async (req, res) => {
  try {
    const { licenseKey, machineId } = req.body;
    if (!licenseKey || !machineId) return void res.status(400).json({ valid: false, error: "missing_params" });

    const [lic] = await db.select().from(licensesTable).where(eq(licensesTable.licenseKey, licenseKey));
    if (!lic) return void res.json({ valid: false, error: "license_not_found" });
    if (lic.status === "suspended") return void res.json({ valid: false, error: "license_suspended" });
    if (lic.status === "pending") return void res.json({ valid: false, error: "license_pending" });
    if (lic.machineId && lic.machineId !== machineId) return void res.json({ valid: false, error: "machine_mismatch" });
    if (lic.expireDate && lic.expireDate < new Date()) {
      await db.update(licensesTable).set({ status: "expired" }).where(eq(licensesTable.id, lic.id));
      return void res.json({ valid: false, error: "license_expired" });
    }

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.socket?.remoteAddress ?? "";
    const [act] = await db.select().from(licenseActivationsTable).where(eq(licenseActivationsTable.licenseId, lic.id));
    if (act) {
      await db.update(licenseActivationsTable).set({ lastSeen: new Date(), ipAddress: ip }).where(eq(licenseActivationsTable.id, act.id));
    }

    const daysLeft = lic.expireDate ? Math.ceil((lic.expireDate.getTime() - Date.now()) / 86400000) : null;

    res.json({
      valid: true,
      license: {
        licenseKey: lic.licenseKey,
        companyName: lic.companyName,
        licenseType: lic.licenseType,
        status: lic.status,
        expireDate: lic.expireDate,
        branchLimit: lic.branchLimit,
        userLimit: lic.userLimit,
        posLimit: lic.posLimit,
        daysLeft,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ valid: false, error: "server_error" });
  }
});

export default router;
