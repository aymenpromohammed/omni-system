import { Router } from "express";
import { db, verifyPassword, createSession, getSessionUser, deleteSession } from "../lib/sqlite";
import { logger } from "../lib/logger";

const router = Router();

function getAuthUser(req: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const userId = getSessionUser(token);
  if (!userId) return null;
  const user = db.prepare("SELECT id, username, name, role, active FROM users WHERE id=?").get(userId) as any;
  return user;
}

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "بيانات ناقصة" });
    return;
  }

  // Production Mode Lockdown: If there are no licenses in the database, ONLY developer can login
  try {
    const licCount = (db.prepare("SELECT COUNT(*) as c FROM licenses WHERE active=1").get() as any).c;
    if (licCount === 0 && username !== "developer") {
      res.status(403).json({ error: "يرجى التواصل مع مالك النظام ادارة اتقان سوفت" });
      return;
    }
  } catch (e) {
    // If table doesn't exist yet, proceed or safe lock
  }

  const user = db.prepare("SELECT * FROM users WHERE username=?").get(username) as any;
  if (!user || !user.active) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }
  const ok = verifyPassword(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }
  const token = createSession(user.id);

  // Log active session in erp_sessions
  const deviceName = req.body.device_name || (req.headers["user-agent"] ? req.headers["user-agent"].split(" ")[0] : "متصفح الويب");
  try {
    db.prepare(`
      INSERT INTO erp_sessions (username, device_name, login_time, status, branch_id, language)
      VALUES (?, ?, datetime('now', 'localtime'), 'نشط', 1, 'عربي')
    `).run(user.name, deviceName);
  } catch (err) {
    console.error("Failed to log erp session:", err);
  }

  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role, active: Boolean(user.active) },
  });
});

router.get("/auth/me", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }
  res.json({ id: user.id, username: user.username, name: user.name, role: user.role, active: Boolean(user.active) });
});

router.post("/auth/logout", (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const userId = getSessionUser(token);
    if (userId) {
      const user = db.prepare("SELECT name FROM users WHERE id=?").get(userId) as any;
      if (user) {
        try {
          db.prepare(`
            UPDATE erp_sessions 
            SET status = 'خروج', logout_time = datetime('now', 'localtime') 
            WHERE username = ? AND status = 'نشط'
          `).run(user.name);
        } catch (err) {
          console.error("Failed to log erp session logout:", err);
        }
      }
    }
    deleteSession(token);
  }
  res.json({ ok: true });
});

export { getAuthUser };
export default router;
