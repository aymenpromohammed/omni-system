import { Router } from "express";
import { db } from "@workspace/db";
import { tablesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/tables", async (req, res) => {
  try {
    const { status } = req.query;
    let rows = await db.select().from(tablesTable).orderBy(tablesTable.number);
    if (status) rows = rows.filter((t) => t.status === status);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tables", async (req, res) => {
  try {
    const { number, name, capacity, section } = req.body;
    const [table] = await db.insert(tablesTable).values({ number: Number(number), name, capacity: Number(capacity), section }).returning();
    res.status(201).json(table);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tables/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, id));
    if (!table) return res.status(404).json({ error: "Not found" });
    res.json(table);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tables/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { number, name, capacity, status, section } = req.body;
    const updates: Record<string, unknown> = {};
    if (number !== undefined) updates.number = Number(number);
    if (name !== undefined) updates.name = name;
    if (capacity !== undefined) updates.capacity = Number(capacity);
    if (status !== undefined) updates.status = status;
    if (section !== undefined) updates.section = section;
    const [table] = await db.update(tablesTable).set(updates).where(eq(tablesTable.id, id)).returning();
    if (!table) return res.status(404).json({ error: "Not found" });
    res.json(table);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tables/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(tablesTable).where(eq(tablesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
