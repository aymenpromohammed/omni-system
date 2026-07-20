import { Router } from "express";
import { db, logAudit } from "../lib/sqlite";
import { getAuthUser } from "./auth";

const router = Router();

function requireAdmin(req: any, res: any): boolean {
  const user = getAuthUser(req);
  if (!user || (user.role !== "admin" && user.role !== "developer")) {
    res.status(403).json({ error: "غير مصرح" });
    return false;
  }
  return true;
}

// ─── Currency Endpoints ───
router.get("/onyx/currencies", (req, res) => {
  try {
    const data = db.prepare("SELECT * FROM currencies ORDER BY id").all();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/onyx/currencies", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const user = getAuthUser(req);
  const { name, symbol, fraction, type, exchange_rate } = req.body;
  if (!name || !symbol) {
    res.status(400).json({ error: "اسم العملة ورمزها مطلوبان" });
    return;
  }
  try {
    const r = db.prepare(
      "INSERT INTO currencies (name, symbol, fraction, type, exchange_rate) VALUES (?,?,?,?,?)"
    ).run(name, symbol, fraction ?? null, type ?? "foreign", Number(exchange_rate || 1));
    logAudit(user.id, user.name, "إضافة عملة", `عملة: ${name} (${symbol})`);
    res.status(201).json({ id: r.lastInsertRowid, name, symbol, fraction, type, exchange_rate, active: 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/onyx/currencies/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const user = getAuthUser(req);
  const { name, symbol, fraction, type, exchange_rate, active } = req.body;
  try {
    db.prepare(
      "UPDATE currencies SET name=?, symbol=?, fraction=?, type=?, exchange_rate=?, active=? WHERE id=?"
    ).run(name, symbol, fraction ?? null, type ?? "foreign", Number(exchange_rate || 1), active ?? 1, req.params.id);
    logAudit(user.id, user.name, "تعديل عملة", `تعديل عملة رقم: ${req.params.id} إلى ${name}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/onyx/currencies/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const user = getAuthUser(req);
  try {
    db.prepare("DELETE FROM currencies WHERE id=?").run(req.params.id);
    logAudit(user.id, user.name, "حذف عملة", `حذف عملة رقم: ${req.params.id}`);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ─── Active Sessions & Logs Endpoints ───
router.get("/onyx/sessions", (req, res) => {
  try {
    const active = db.prepare("SELECT * FROM erp_sessions WHERE status='نشط' OR logout_time IS NULL ORDER BY login_time DESC").all();
    const history = db.prepare("SELECT * FROM erp_sessions ORDER BY login_time DESC LIMIT 100").all();
    res.json({ active, history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/onyx/sessions/disconnect/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const user = getAuthUser(req);
  try {
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    db.prepare("UPDATE erp_sessions SET status='قطع اتصال', logout_time=? WHERE id=?").run(now, req.params.id);
    logAudit(user.id, user.name, "قطع اتصال مستخدم", `قطع جلسة رقم: ${req.params.id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ─── Branches Extended Endpoints ───
router.get("/onyx/branches", (req, res) => {
  try {
    const data = db.prepare("SELECT * FROM branches ORDER BY id").all();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/onyx/branches/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const user = getAuthUser(req);
  const {
    name, address, phone, active,
    company_id, company_name, foreign_name, branch_foreign_name, group_id,
    header_1, header_2, header_3, header_1_foreign, header_2_foreign, header_3_foreign,
    tax_id, tax_rate, commercial_reg, lat, long, city, street, building
  } = req.body;
  try {
    db.prepare(`
      UPDATE branches SET
        name=?, address=?, phone=?, active=?,
        company_id=?, company_name=?, foreign_name=?, branch_foreign_name=?, group_id=?,
        header_1=?, header_2=?, header_3=?, header_1_foreign=?, header_2_foreign=?, header_3_foreign=?,
        tax_id=?, tax_rate=?, commercial_reg=?, lat=?, long=?, city=?, street=?, building=?
      WHERE id=?
    `).run(
      name, address ?? null, phone ?? null, active ?? 1,
      company_id ?? 1, company_name ?? null, foreign_name ?? null, branch_foreign_name ?? null, group_id ?? 1,
      header_1 ?? null, header_2 ?? null, header_3 ?? null, header_1_foreign ?? null, header_2_foreign ?? null, header_3_foreign ?? null,
      tax_id ?? null, tax_rate ?? 15, commercial_reg ?? null, lat ?? null, long ?? null, city ?? null, street ?? null, building ?? null,
      req.params.id
    );
    logAudit(user.id, user.name, "تحديث تفاصيل الفرع", `فرع رقم: ${req.params.id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
