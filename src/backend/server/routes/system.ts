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

router.get("/system/backup", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const user = getAuthUser(req);
  const products = db.prepare("SELECT * FROM products").all();
  const categories = db.prepare("SELECT * FROM categories").all();
  const orders = db.prepare("SELECT * FROM orders").all();
  const orderItems = db.prepare("SELECT * FROM order_items").all();
  const customers = db.prepare("SELECT * FROM customers").all();
  const expenses = db.prepare("SELECT * FROM expenses").all();
  const suppliers = db.prepare("SELECT * FROM suppliers").all();

  const backupData = {
    version: "2.5.0",
    timestamp: new Date().toISOString(),
    products,
    categories,
    orders,
    orderItems,
    customers,
    expenses,
    suppliers
  };

  logAudit(user.id, user.name, "نسخ احتياطي", "تصدير نسخة احتياطية من النظام");
  res.setHeader("Content-Disposition", `attachment; filename=omni-backup-${new Date().toISOString().slice(0, 10)}.json`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(backupData, null, 2));
});

export default router;
