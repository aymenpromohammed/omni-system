import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryTable } from "@workspace/db";
import { eq, lt, sum } from "drizzle-orm";

const router = Router();

function fmt(item: typeof inventoryTable.$inferSelect) {
  const cur = Number(item.currentStock);
  const min = Number(item.minStock);
  return {
    ...item,
    currentStock: cur,
    minStock: min,
    maxStock: item.maxStock ? Number(item.maxStock) : null,
    costPerUnit: Number(item.costPerUnit),
    totalValue: cur * Number(item.costPerUnit),
    isLowStock: cur <= min,
  };
}

router.get("/inventory/summary", async (req, res) => {
  try {
    const rows = await db.select().from(inventoryTable);
    const totalItems = rows.length;
    const lowStockItems = rows.filter((i) => Number(i.currentStock) <= Number(i.minStock)).length;
    const outOfStockItems = rows.filter((i) => Number(i.currentStock) === 0).length;
    const totalValue = rows.reduce((acc, i) => acc + Number(i.currentStock) * Number(i.costPerUnit), 0);
    res.json({ totalItems, lowStockItems, outOfStockItems, totalValue: Number(totalValue.toFixed(2)) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inventory", async (req, res) => {
  try {
    const { search, lowStock } = req.query;
    let rows = await db.select().from(inventoryTable).orderBy(inventoryTable.name);
    if (lowStock === "true") rows = rows.filter((i) => Number(i.currentStock) <= Number(i.minStock));
    if (search) {
      const s = String(search).toLowerCase();
      rows = rows.filter((i) => i.name.toLowerCase().includes(s) || i.nameAr.toLowerCase().includes(s));
    }
    res.json(rows.map(fmt));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory", async (req, res) => {
  try {
    const { name, nameAr, unit, currentStock, minStock, maxStock, costPerUnit, supplier } = req.body;
    const [item] = await db.insert(inventoryTable).values({
      name, nameAr, unit,
      currentStock: String(currentStock),
      minStock: String(minStock),
      maxStock: maxStock ? String(maxStock) : null,
      costPerUnit: String(costPerUnit),
      supplier,
    }).returning();
    res.status(201).json(fmt(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inventory/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [item] = await db.select().from(inventoryTable).where(eq(inventoryTable.id, id));
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(fmt(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/inventory/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, nameAr, unit, currentStock, minStock, maxStock, costPerUnit, supplier } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (nameAr !== undefined) updates.nameAr = nameAr;
    if (unit !== undefined) updates.unit = unit;
    if (currentStock !== undefined) updates.currentStock = String(currentStock);
    if (minStock !== undefined) updates.minStock = String(minStock);
    if (maxStock !== undefined) updates.maxStock = maxStock ? String(maxStock) : null;
    if (costPerUnit !== undefined) updates.costPerUnit = String(costPerUnit);
    if (supplier !== undefined) updates.supplier = supplier;
    const [item] = await db.update(inventoryTable).set(updates).where(eq(inventoryTable.id, id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(fmt(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/inventory/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(inventoryTable).where(eq(inventoryTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
