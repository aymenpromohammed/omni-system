var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron-main.ts
var import_electron = require("electron");
var import_node_path4 = __toESM(require("node:path"), 1);

// artifacts/api-server/src/app.ts
var import_express34 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_pino_http = __toESM(require("pino-http"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);

// artifacts/api-server/src/routes/index.ts
var import_express33 = require("express");

// artifacts/api-server/src/routes/health.ts
var import_express = require("express");
var router = (0, import_express.Router)();
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});
var health_default = router;

// artifacts/api-server/src/routes/auth.ts
var import_express2 = require("express");

// artifacts/api-server/src/lib/sqlite.ts
var import_node_sqlite = require("node:sqlite");
var import_node_path = __toESM(require("node:path"), 1);
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
var StatementWrapper = class {
  stmt;
  constructor(stmt) {
    this.stmt = stmt;
  }
  all(...params) {
    return this.stmt.all(...params);
  }
  get(...params) {
    return this.stmt.get(...params);
  }
  run(...params) {
    const result = this.stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid)
    };
  }
};
var DatabaseWrapper = class {
  db;
  constructor(filename) {
    this.db = new import_node_sqlite.DatabaseSync(filename);
  }
  prepare(sql) {
    const stmt = this.db.prepare(sql);
    return new StatementWrapper(stmt);
  }
  exec(sql) {
    return this.db.exec(sql);
  }
  pragma(sql) {
    this.db.exec(`PRAGMA ${sql}`);
  }
  transaction(fn) {
    return (...args) => {
      this.db.exec("BEGIN TRANSACTION");
      try {
        const result = fn(...args);
        this.db.exec("COMMIT");
        return result;
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    };
  }
  close() {
    this.db.close();
  }
};
var workspaceRoot = process.cwd().endsWith(import_node_path.default.join("artifacts", "api-server")) ? import_node_path.default.resolve(process.cwd(), "../..") : process.cwd();
var dbPath = process.env.DB_PATH || import_node_path.default.resolve(workspaceRoot, "artifacts/api-server/data/pos.db");
(0, import_node_fs.mkdirSync)(import_node_path.default.dirname(dbPath), { recursive: true });
var dbInstance;
try {
  dbInstance = new DatabaseWrapper(dbPath);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");
  const integrity = dbInstance.prepare("PRAGMA integrity_check").get();
  const resVal = integrity ? Object.values(integrity)[0] : "ok";
  if (resVal !== "ok") {
    throw new Error("Database integrity check failed: " + JSON.stringify(integrity));
  }
} catch (err) {
  console.error("Database connection/corruption error:", err);
  if (err?.message?.includes("malformed") || err?.code === "SQLITE_CORRUPT" || err?.message?.includes("corrupt") || err?.message?.includes("integrity check")) {
    if (dbInstance) {
      try {
        dbInstance.close();
      } catch (closeErr) {
        console.error("Failed to close corrupted database:", closeErr);
      }
    }
    const timestamp = Date.now();
    const backupPath = `${dbPath}.corrupt.${timestamp}`;
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    const walBackupPath = `${walPath}.corrupt.${timestamp}`;
    const shmBackupPath = `${shmPath}.corrupt.${timestamp}`;
    try {
      if ((0, import_node_fs.existsSync)(dbPath)) {
        try {
          (0, import_node_fs.renameSync)(dbPath, backupPath);
          console.warn(`Backed up corrupted database to ${backupPath}`);
        } catch (renameErr) {
          console.warn("Could not rename locked DB file. Attempting to delete instead.");
          (0, import_node_fs.unlinkSync)(dbPath);
        }
      }
      if ((0, import_node_fs.existsSync)(walPath)) {
        try {
          (0, import_node_fs.renameSync)(walPath, walBackupPath);
        } catch {
          try {
            (0, import_node_fs.unlinkSync)(walPath);
          } catch {
          }
        }
      }
      if ((0, import_node_fs.existsSync)(shmPath)) {
        try {
          (0, import_node_fs.renameSync)(shmPath, shmBackupPath);
        } catch {
          try {
            (0, import_node_fs.unlinkSync)(shmPath);
          } catch {
          }
        }
      }
      console.warn("Cleared corrupted database files. Creating fresh database.");
    } catch (e) {
      console.error("Failed to backup/clear corrupted db:", e);
    }
  }
  dbInstance = new DatabaseWrapper(dbPath);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");
}
var db = dbInstance;
function hashPassword(password) {
  const salt = (0, import_node_crypto.randomBytes)(16).toString("hex");
  const hash = (0, import_node_crypto.scryptSync)(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, storedHash] = stored.split(":");
  const hash = (0, import_node_crypto.scryptSync)(password, salt, 64);
  const storedBuf = Buffer.from(storedHash, "hex");
  return (0, import_node_crypto.timingSafeEqual)(hash, storedBuf);
}
var sessions = /* @__PURE__ */ new Map();
function createSession(userId) {
  const token = (0, import_node_crypto.randomBytes)(32).toString("hex");
  sessions.set(token, userId);
  return token;
}
function getSessionUser(token) {
  return sessions.get(token);
}
function deleteSession(token) {
  sessions.delete(token);
}
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT,
      cost REAL DEFAULT 0.0,
      revenue REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      cost REAL,
      barcode TEXT,
      category_id INTEGER REFERENCES categories(id),
      active INTEGER NOT NULL DEFAULT 1,
      stock INTEGER
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      cash_amount REAL,
      card_amount REAL,
      customer_id INTEGER REFERENCES customers(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      note TEXT,
      order_type TEXT NOT NULL DEFAULT 'dine-in',
      table_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      category_name TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS receipt_copy_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      copy_number INTEGER NOT NULL,
      label TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS department_print_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      printer_name TEXT,
      copies INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      print_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS print_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      receipt_type TEXT NOT NULL,
      department_name TEXT,
      printer_name TEXT,
      printed_at TEXT NOT NULL DEFAULT (datetime('now')),
      user_id INTEGER NOT NULL,
      user_name TEXT,
      copies INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'success',
      reprint_reason TEXT,
      reprint_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS printer_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      paper_width INTEGER NOT NULL DEFAULT 80,
      left_margin REAL NOT NULL DEFAULT 4,
      right_margin REAL NOT NULL DEFAULT 4,
      top_margin REAL NOT NULL DEFAULT 2,
      bottom_margin REAL NOT NULL DEFAULT 2,
      font_size INTEGER NOT NULL DEFAULT 10,
      line_spacing REAL NOT NULL DEFAULT 2,
      characters_per_line INTEGER NOT NULL DEFAULT 48
    );

    CREATE TABLE IF NOT EXISTS document_print_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      company_name TEXT DEFAULT 'OmniSystem Pro',
      company_subtitle TEXT DEFAULT '\u0646\u0638\u0627\u0645 \u0646\u0642\u0627\u0637 \u0627\u0644\u0628\u064A\u0639 \u0648\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0631\u062F',
      logo_url TEXT DEFAULT '/omnisystem-logo.png',
      customer_header_text TEXT DEFAULT '\u0643\u0634\u0641 \u062D\u0633\u0627\u0628 \u0639\u0645\u064A\u0644 \u0645\u0639\u062A\u0645\u062F',
      customer_footer_text TEXT DEFAULT '\u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0639\u0627\u0645\u0644\u0643\u0645 \u0645\u0639\u0646\u0627 - \u064A\u064F\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u062E\u0644\u0627\u0644 15 \u064A\u0648\u0645\u0627\u064B',
      employee_header_text TEXT DEFAULT '\u0643\u0634\u0641 \u062D\u0633\u0627\u0628 \u0648\u0645\u0633\u064A\u0631 \u0631\u0648\u0627\u062A\u0628 \u0645\u0648\u0638\u0641',
      employee_footer_text TEXT DEFAULT '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629 - \u0627\u0644\u062A\u0648\u0642\u064A\u0639 \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F',
      voucher_receipt_title TEXT DEFAULT '\u0633\u0646\u062F \u0642\u0628\u0636',
      voucher_payment_title TEXT DEFAULT '\u0633\u0646\u062F \u0635\u0631\u0641',
      voucher_footer_text TEXT DEFAULT '\u0627\u0644\u0645\u062D\u0627\u0633\u0628 _______ \u0627\u0644\u0645\u062F\u064A\u0631 _______ \u0627\u0644\u0645\u0633\u062A\u0644\u0645 _______',
      report_header_text TEXT DEFAULT '\u062A\u0642\u0631\u064A\u0631 \u0639\u0627\u0645 \u0634\u0627\u0645\u0644',
      report_footer_text TEXT DEFAULT '\u0637\u0628\u0639 \u0628\u0648\u0627\u0633\u0637\u0629 \u0646\u0638\u0627\u0645 OmniSystem Pro',
      accent_color TEXT DEFAULT '#2563eb'
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- 'in', 'out', 'adjustment'
      quantity REAL NOT NULL,
      previous_stock REAL NOT NULL,
      new_stock REAL NOT NULL,
      reason TEXT,
      reference_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      user_id INTEGER,
      user_name TEXT
    );

    CREATE TABLE IF NOT EXISTS hr_departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      budget REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS hr_employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      position TEXT,
      department_id INTEGER REFERENCES hr_departments(id),
      basic_salary REAL NOT NULL DEFAULT 0,
      hire_date TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS hr_salaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      basic_salary REAL NOT NULL DEFAULT 0,
      bonuses REAL NOT NULL DEFAULT 0,
      deductions REAL NOT NULL DEFAULT 0,
      net_salary REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hr_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      status TEXT NOT NULL DEFAULT 'present',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      invoice_number TEXT NOT NULL,
      order_id INTEGER,
      reason TEXT,
      total_refund REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      customer_id INTEGER REFERENCES customers(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meal_deductions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES hr_employees(id),
      employee_name TEXT NOT NULL,
      employee_number TEXT NOT NULL,
      order_id INTEGER REFERENCES orders(id),
      invoice_number TEXT,
      amount REAL NOT NULL DEFAULT 0,
      cashier_id INTEGER NOT NULL REFERENCES users(id),
      cashier_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_number TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL, -- 'receipt' or 'payment'
      party_type TEXT NOT NULL, -- 'employee' or 'customer'
      party_id INTEGER NOT NULL,
      party_name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT '\u062F\u064A\u0646\u0627\u0631',
      received_from TEXT,
      payment_against TEXT,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      amount_text TEXT,
      notes TEXT,
      header_title TEXT DEFAULT '\u0645\u062E\u0627\u0628\u0632 \u0627\u0644\u0634\u0627\u0645 \u0644\u0644\u062E\u0628\u0632 \u0627\u0644\u0639\u0631\u0628\u064A',
      header_subtitle TEXT DEFAULT 'Maamil Al Sham',
      logo_url TEXT DEFAULT '/omnisystem-logo.png',
      accent_color TEXT DEFAULT '#ef4444',
      bottom_text TEXT DEFAULT '\u062C\u0648\u062F\u0629 \u0627\u0644\u062E\u0628\u0632 ... \u0633\u0631 \u062B\u0642\u0629 \u0639\u0645\u0644\u0627\u0626\u0646\u0627',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS manual_ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_type TEXT NOT NULL, -- 'employee' or 'customer'
      party_id INTEGER NOT NULL,
      entry_date TEXT NOT NULL,
      description TEXT NOT NULL,
      debit REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      location TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS warehouse_stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      stock REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      rating INTEGER NOT NULL DEFAULT 5,
      balance REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id),
      status TEXT NOT NULL DEFAULT 'pending', -- pending, received, cancelled
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      user_name TEXT NOT NULL,
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT,
      starting_cash REAL NOT NULL DEFAULT 0,
      cash_sales REAL NOT NULL DEFAULT 0,
      card_sales REAL NOT NULL DEFAULT 0,
      withdrawals REAL NOT NULL DEFAULT 0,
      deposits REAL NOT NULL DEFAULT 0,
      actual_cash REAL,
      difference REAL,
      status TEXT NOT NULL DEFAULT 'open' -- open, closed
    );

    CREATE TABLE IF NOT EXISTS restaurant_tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number TEXT UNIQUE NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'available', -- available, occupied, reserved
      section TEXT DEFAULT '\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629',
      current_order_id INTEGER REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS product_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      ingredient_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT '\u062C\u0645'
    );

    CREATE TABLE IF NOT EXISTS product_modifiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, -- \u0643\u0647\u0631\u0628\u0627\u0621\u060C \u0645\u0627\u0621\u060C \u0625\u064A\u062C\u0627\u0631\u060C \u0645\u0631\u062A\u0628\u0627\u062A\u060C \u062A\u0634\u063A\u064A\u0644
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL DEFAULT (date('now')),
      notes TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT UNIQUE NOT NULL,
      client_name TEXT NOT NULL,
      devices_limit INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS license_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      device_name TEXT,
      last_active TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(license_id, device_id)
    );

    CREATE TABLE IF NOT EXISTS safes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT '\u0631\u064A\u0627\u0644',
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      user_name TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- DOUBLE ENTRY ACCOUNTING TABLES
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense', 'cogs', 'wastage'
      parent_code TEXT,
      balance REAL NOT NULL DEFAULT 0.0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_number TEXT UNIQUE NOT NULL,
      entry_date TEXT NOT NULL DEFAULT (date('now')),
      description TEXT NOT NULL,
      source_type TEXT, -- 'sale', 'return', 'purchase', 'expense', 'voucher', 'shift_difference'
      source_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS journal_entry_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      debit REAL NOT NULL DEFAULT 0.0,
      credit REAL NOT NULL DEFAULT 0.0,
      description TEXT
    );
  `);
}
function logAudit(userId, userName, action, details) {
  try {
    db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?,?,?,?)").run(userId ?? null, userName ?? "system", action, details);
  } catch {
  }
}
function runMigrations() {
  try {
    db.exec("ALTER TABLE categories ADD COLUMN cost REAL DEFAULT 0.0");
  } catch {
  }
  try {
    db.exec("ALTER TABLE categories ADD COLUMN revenue REAL DEFAULT 0.0");
  } catch {
  }
  try {
    db.exec("ALTER TABLE order_items ADD COLUMN category_id INTEGER REFERENCES categories(id)");
  } catch {
  }
  try {
    db.exec("ALTER TABLE order_items ADD COLUMN category_name TEXT");
  } catch {
  }
  try {
    db.exec("ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'dine-in'");
  } catch {
  }
  try {
    db.exec("ALTER TABLE orders ADD COLUMN table_number TEXT");
  } catch {
  }
  try {
    db.exec("ALTER TABLE printer_settings ADD COLUMN main_printer_name TEXT");
  } catch {
  }
  try {
    db.exec("ALTER TABLE users ADD COLUMN allow_meal_deduction INTEGER NOT NULL DEFAULT 0");
  } catch {
  }
  try {
    db.exec("ALTER TABLE orders ADD COLUMN is_employee_meal INTEGER NOT NULL DEFAULT 0");
  } catch {
  }
  try {
    db.exec("ALTER TABLE orders ADD COLUMN employee_id INTEGER");
  } catch {
  }
  try {
    db.exec("ALTER TABLE safes ADD COLUMN opening_balance REAL DEFAULT 0.0");
  } catch {
  }
  try {
    db.exec("ALTER TABLE safes ADD COLUMN actual_balance REAL DEFAULT 0.0");
  } catch {
  }
  try {
    db.exec("ALTER TABLE safes ADD COLUMN difference REAL DEFAULT 0.0");
  } catch {
  }
  try {
    db.exec("ALTER TABLE safes ADD COLUMN status TEXT DEFAULT 'open'");
  } catch {
  }
  try {
    db.exec("ALTER TABLE safes ADD COLUMN branch_id INTEGER");
  } catch {
  }
  try {
    db.exec("ALTER TABLE safes ADD COLUMN cashier_id INTEGER");
  } catch {
  }
  try {
    db.exec("ALTER TABLE safes ADD COLUMN last_closing_date TEXT");
  } catch {
  }
  try {
    db.exec("ALTER TABLE safes ADD COLUMN reconciliation_reason TEXT");
  } catch {
  }
  try {
    db.exec("ALTER TABLE returns ADD COLUMN approved_by INTEGER REFERENCES users(id)");
  } catch {
  }
  try {
    db.exec("ALTER TABLE returns ADD COLUMN approved_at TEXT");
  } catch {
  }
  try {
    db.exec("ALTER TABLE returns ADD COLUMN status TEXT DEFAULT 'approved'");
  } catch {
  }
  try {
    db.exec("ALTER TABLE expenses ADD COLUMN safe_id INTEGER REFERENCES safes(id)");
  } catch {
  }
  try {
    db.exec("ALTER TABLE vouchers ADD COLUMN safe_id INTEGER REFERENCES safes(id)");
  } catch {
  }
  try {
    const safeCount = db.prepare("SELECT COUNT(*) as c FROM safes").get().c;
    if (safeCount === 0) {
      db.prepare("INSERT INTO safes (name, balance, currency, notes, active) VALUES (?, ?, ?, ?, 1)").run("\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A", 1e6, "\u0631\u064A\u0627\u0644", "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A \u0644\u0644\u0646\u0638\u0627\u0645");
    }
  } catch (e) {
    console.error("Error seeding default safe:", e);
  }
  try {
    const devUser = db.prepare("SELECT id FROM users WHERE username='developer'").get();
    const devHash = hashPassword("dev123");
    if (!devUser) {
      db.prepare(`INSERT INTO users (username, password_hash, name, role, active) VALUES (?,?,?,?,1)`).run("developer", devHash, "\u0645\u0637\u0648\u0631 \u0627\u0644\u0646\u0638\u0627\u0645", "developer");
    } else {
      db.prepare("UPDATE users SET role = 'developer', password_hash = ?, active = 1 WHERE username = 'developer'").run(devHash);
    }
    const adminUser = db.prepare("SELECT id FROM users WHERE username='admin'").get();
    const adminHash = hashPassword("admin123");
    if (!adminUser) {
      db.prepare(`INSERT INTO users (username, password_hash, name, role, active) VALUES (?,?,?,?,1)`).run("admin", adminHash, "\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645", "admin");
    } else {
      db.prepare("UPDATE users SET role = 'admin', password_hash = ?, active = 1 WHERE username = 'admin'").run(adminHash);
    }
  } catch (e) {
    console.error("Error ensuring admin/developer users:", e);
  }
  try {
    db.exec(`INSERT OR IGNORE INTO printer_settings (id, paper_width, left_margin, right_margin, top_margin, bottom_margin, font_size, line_spacing, characters_per_line)
             VALUES (1, 80, 1.5, 1.5, 1, 1, 11, 0, 48)`);
    db.exec(`UPDATE printer_settings SET paper_width = 80, left_margin = 1.5, right_margin = 1.5, top_margin = 1, bottom_margin = 1, font_size = 11, line_spacing = 0 WHERE id = 1`);
  } catch {
  }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS currencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        fraction TEXT,
        type TEXT NOT NULL, -- 'local' or 'foreign'
        exchange_rate REAL NOT NULL DEFAULT 1.0,
        active INTEGER NOT NULL DEFAULT 1
      );
    `);
    const curCount = db.prepare("SELECT COUNT(*) as c FROM currencies").get().c;
    if (curCount === 0) {
      db.prepare("INSERT INTO currencies (name, symbol, fraction, type, exchange_rate) VALUES (?,?,?,?,?)").run("\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A", "YER", "\u0641\u0644\u0633", "local", 1);
      db.prepare("INSERT INTO currencies (name, symbol, fraction, type, exchange_rate) VALUES (?,?,?,?,?)").run("\u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A", "SAR", "\u0647\u0644\u0644\u0629", "foreign", 0.27);
      db.prepare("INSERT INTO currencies (name, symbol, fraction, type, exchange_rate) VALUES (?,?,?,?,?)").run("\u062F\u0648\u0644\u0627\u0631 \u0623\u0645\u0631\u064A\u0643\u064A", "USD", "\u0633\u0646\u062A", "foreign", 1);
      db.prepare("INSERT INTO currencies (name, symbol, fraction, type, exchange_rate) VALUES (?,?,?,?,?)").run("\u062F\u064A\u0646\u0627\u0631 \u0623\u0631\u062F\u0646\u064A", "JOD", "\u0642\u0631\u0634", "foreign", 0.71);
    }
  } catch (e) {
    console.error("Error creating currencies:", e);
  }
  const branchCols = [
    ["company_id", "INTEGER DEFAULT 1"],
    ["company_name", "TEXT DEFAULT '\u0634\u0631\u0643\u0629 \u0639\u0645\u0627\u062F \u0639\u0642\u0644\u0627\u0646'"],
    ["foreign_name", "TEXT DEFAULT 'Emad Aqlaan Co.'"],
    ["branch_foreign_name", "TEXT DEFAULT 'Main Branch'"],
    ["group_id", "INTEGER DEFAULT 1"],
    ["header_1", "TEXT"],
    ["header_2", "TEXT"],
    ["header_3", "TEXT"],
    ["header_1_foreign", "TEXT"],
    ["header_2_foreign", "TEXT"],
    ["header_3_foreign", "TEXT"],
    ["tax_id", "TEXT"],
    ["tax_rate", "REAL DEFAULT 15"],
    ["commercial_reg", "TEXT"],
    ["lat", "TEXT"],
    ["long", "TEXT"],
    ["city", "TEXT"],
    ["street", "TEXT"],
    ["building", "TEXT"]
  ];
  for (const [col, type] of branchCols) {
    try {
      db.exec(`ALTER TABLE branches ADD COLUMN ${col} ${type}`);
    } catch {
    }
  }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS erp_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        device_name TEXT NOT NULL,
        login_time TEXT NOT NULL,
        logout_time TEXT,
        status TEXT NOT NULL DEFAULT '\u0646\u0634\u0637',
        branch_id INTEGER DEFAULT 1,
        language TEXT DEFAULT '\u0639\u0631\u0628\u064A'
      );
    `);
    const sCount = db.prepare("SELECT COUNT(*) as c FROM erp_sessions").get().c;
    if (sCount === 0) {
      db.prepare("INSERT INTO erp_sessions (username, device_name, login_time, logout_time, status, branch_id, language) VALUES (?,?,?,?,?,?,?)").run("\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645", "DESKTOP-QLP03GF-EMAD", "2026-07-18 07:29:52", null, "\u0646\u0634\u0637", 1, "\u0639\u0631\u0628\u064A");
      db.prepare("INSERT INTO erp_sessions (username, device_name, login_time, logout_time, status, branch_id, language) VALUES (?,?,?,?,?,?,?)").run("\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645", "DESKTOP-QLP03GF-EMAD", "2026-07-18 10:52:12", "2026-07-18 11:45:00", "\u062E\u0631\u0648\u062C", 1, "\u0639\u0631\u0628\u064A");
      db.prepare("INSERT INTO erp_sessions (username, device_name, login_time, logout_time, status, branch_id, language) VALUES (?,?,?,?,?,?,?)").run("\u0645\u0637\u0648\u0631 \u0627\u0644\u0646\u0638\u0627\u0645", "DESKTOP-DEV-PC", "2026-07-18 09:15:30", null, "\u0646\u0634\u0637", 1, "\u0639\u0631\u0628\u064A");
    }
  } catch (e) {
  }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role TEXT PRIMARY KEY,
        can_void_bills INTEGER NOT NULL DEFAULT 0,
        can_view_cost INTEGER NOT NULL DEFAULT 0,
        can_change_currencies INTEGER NOT NULL DEFAULT 0,
        can_approve_returns INTEGER NOT NULL DEFAULT 0,
        can_open_close_safe INTEGER NOT NULL DEFAULT 0,
        can_transfer_funds INTEGER NOT NULL DEFAULT 0,
        can_edit_products INTEGER NOT NULL DEFAULT 0,
        can_delete_orders INTEGER NOT NULL DEFAULT 0
      );
    `);
    const permCount = db.prepare("SELECT COUNT(*) as c FROM role_permissions").get().c;
    if (permCount === 0) {
      db.prepare(`INSERT INTO role_permissions (role, can_void_bills, can_view_cost, can_change_currencies, can_approve_returns, can_open_close_safe, can_transfer_funds, can_edit_products, can_delete_orders) VALUES (?, 1, 1, 1, 1, 1, 1, 1, 1)`).run("developer");
      db.prepare(`INSERT INTO role_permissions (role, can_void_bills, can_view_cost, can_change_currencies, can_approve_returns, can_open_close_safe, can_transfer_funds, can_edit_products, can_delete_orders) VALUES (?, 1, 1, 1, 1, 1, 1, 1, 1)`).run("admin");
      db.prepare(`INSERT INTO role_permissions (role, can_void_bills, can_view_cost, can_change_currencies, can_approve_returns, can_open_close_safe, can_transfer_funds, can_edit_products, can_delete_orders) VALUES (?, 0, 1, 0, 0, 1, 1, 0, 0)`).run("accountant");
      db.prepare(`INSERT INTO role_permissions (role, can_void_bills, can_view_cost, can_change_currencies, can_approve_returns, can_open_close_safe, can_transfer_funds, can_edit_products, can_delete_orders) VALUES (?, 0, 0, 0, 0, 1, 0, 0, 0)`).run("cashier");
    }
  } catch (e) {
    console.error("Error creating role_permissions table:", e);
  }
  try {
    const accCount = db.prepare("SELECT COUNT(*) as c FROM accounts").get().c;
    if (accCount === 0) {
      const standardAccounts = [
        // Assets (10000)
        { code: "10000", name: "\u0627\u0644\u0623\u0635\u0648\u0644", type: "asset", parent_code: null },
        { code: "11000", name: "\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629", type: "asset", parent_code: "10000" },
        { code: "11100", name: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A", type: "asset", parent_code: "11000" },
        { code: "11101", name: "\u0635\u0646\u062F\u0648\u0642 \u0643\u0627\u0634\u064A\u0631 \u0627\u0644\u0635\u0627\u0644\u0629", type: "asset", parent_code: "11000" },
        { code: "11200", name: "\u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 (\u0627\u0644\u0639\u0645\u0644\u0627\u0621)", type: "asset", parent_code: "11000" },
        { code: "11300", name: "\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0648\u0627\u0644\u0633\u0644\u0639", type: "asset", parent_code: "11000" },
        // Liabilities (20000)
        { code: "20000", name: "\u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A", type: "liability", parent_code: null },
        { code: "21000", name: "\u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629", type: "liability", parent_code: "20000" },
        { code: "21100", name: "\u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 (\u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646)", type: "liability", parent_code: "21000" },
        { code: "21200", name: "\u0631\u0648\u0627\u062A\u0628 \u0648\u0623\u062C\u0648\u0631 \u0645\u0633\u062A\u062D\u0642\u0629", type: "liability", parent_code: "21000" },
        // Equity (30000)
        { code: "30000", name: "\u062D\u0642\u0648\u0642 \u0627\u0644\u0645\u0644\u0643\u064A\u0629", type: "equity", parent_code: null },
        { code: "31000", name: "\u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644 \u0627\u0644\u0645\u0639\u062A\u0645\u062F", type: "equity", parent_code: "30000" },
        { code: "32000", name: "\u0627\u0644\u0623\u0631\u0628\u0627\u062D \u0648\u0627\u0644\u062E\u0633\u0627\u0626\u0631 \u0627\u0644\u0645\u0628\u0642\u0627\u0629", type: "equity", parent_code: "30000" },
        // Revenue (40000)
        { code: "40000", name: "\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A", type: "revenue", parent_code: null },
        { code: "41000", name: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0648\u0627\u0644\u062E\u062F\u0645\u0627\u062A", type: "revenue", parent_code: "40000" },
        // COGS (50000)
        { code: "50000", name: "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A (COGS)", type: "cogs", parent_code: null },
        { code: "51000", name: "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u062E\u0627\u0645 \u0648\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0645\u0628\u0627\u0639\u0629", type: "cogs", parent_code: "50000" },
        // Expenses (60000)
        { code: "60000", name: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A", type: "expense", parent_code: null },
        { code: "61000", name: "\u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629 \u0648\u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0639\u0645\u0648\u0645\u064A\u0629", type: "expense", parent_code: "60000" },
        { code: "62000", name: "\u0645\u0635\u0631\u0648\u0641 \u062A\u0627\u0644\u0641 \u0648\u0645\u0641\u0642\u0648\u062F\u0627\u062A \u0627\u0644\u0645\u0637\u0628\u062E", type: "expense", parent_code: "60000" },
        { code: "63000", name: "\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0648\u0627\u0644\u0623\u062C\u0648\u0631 \u0644\u0644\u0639\u0645\u0627\u0644", type: "expense", parent_code: "60000" }
      ];
      const stmt = db.prepare("INSERT INTO accounts (code, name, type, parent_code, balance) VALUES (?, ?, ?, ?, 0.0)");
      for (const acc of standardAccounts) {
        stmt.run(acc.code, acc.name, acc.type, acc.parent_code);
      }
    }
  } catch (e) {
    console.error("Error seeding chart of accounts:", e);
  }
}
function seedData() {
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (userCount > 0) return;
  const adminHash = hashPassword("admin123");
  const cashierHash = hashPassword("cashier123");
  const devHash = hashPassword("dev123");
  db.prepare(`INSERT INTO users (username, password_hash, name, role, active) VALUES (?,?,?,?,1)`).run("developer", devHash, "\u0645\u0637\u0648\u0631 \u0627\u0644\u0646\u0638\u0627\u0645", "developer");
  db.prepare(`INSERT INTO users (username, password_hash, name, role, active) VALUES (?,?,?,?,1)`).run("admin", adminHash, "\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645", "admin");
  db.prepare(`INSERT INTO users (username, password_hash, name, role, active) VALUES (?,?,?,?,1)`).run("cashier", cashierHash, "\u0627\u0644\u0643\u0627\u0634\u064A\u0631 \u0627\u0644\u0623\u0648\u0644", "cashier");
  const categories = [
    { name: "\u0627\u0644\u0645\u0637\u0628\u062E", color: "#f59e0b" },
    { name: "\u0627\u0644\u0639\u0635\u0627\u0626\u0631", color: "#3b82f6" },
    { name: "\u0627\u0644\u062D\u0644\u0648\u064A\u0627\u062A", color: "#ec4899" },
    { name: "\u0627\u0644\u0634\u0627\u0648\u0631\u0645\u0627", color: "#10b981" }
  ];
  const insertCat = db.prepare("INSERT INTO categories (name, color) VALUES (?,?)");
  const catIds = [];
  for (const cat of categories) {
    const r = insertCat.run(cat.name, cat.color);
    catIds.push(r.lastInsertRowid);
  }
  const products = [
    { number: 1, name: "\u0628\u0631\u064A\u0627\u0646\u064A \u062F\u062C\u0627\u062C", price: 14e3, cost: 8e3, category_id: catIds[0] },
    { number: 2, name: "\u0631\u0632 \u0623\u0628\u064A\u0636", price: 6500, cost: 3e3, category_id: catIds[0] },
    { number: 3, name: "\u062F\u062C\u0627\u062C \u0645\u0634\u0648\u064A", price: 18e3, cost: 1e4, category_id: catIds[0] },
    { number: 4, name: "\u0644\u062D\u0645 \u0645\u0634\u0648\u064A", price: 25e3, cost: 15e3, category_id: catIds[0] },
    { number: 5, name: "\u0633\u0645\u0643 \u0645\u0642\u0644\u064A", price: 2e4, cost: 12e3, category_id: catIds[0] },
    { number: 6, name: "\u0639\u0635\u064A\u0631 \u0628\u0631\u062A\u0642\u0627\u0644", price: 3e3, cost: 1e3, category_id: catIds[1] },
    { number: 7, name: "\u0634\u0627\u064A", price: 1500, cost: 500, category_id: catIds[1] },
    { number: 8, name: "\u0645\u0627\u0621 \u0645\u0639\u062F\u0646\u064A", price: 1e3, cost: 300, category_id: catIds[1] },
    { number: 9, name: "\u0643\u0648\u0644\u0627", price: 2e3, cost: 800, category_id: catIds[1] },
    { number: 10, name: "\u0643\u064A\u0643 \u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629", price: 5e3, cost: 2500, category_id: catIds[2] },
    { number: 11, name: "\u0622\u064A\u0633 \u0643\u0631\u064A\u0645", price: 4e3, cost: 1500, category_id: catIds[2] },
    { number: 12, name: "\u0634\u0627\u0648\u0631\u0645\u0627 \u062F\u062C\u0627\u062C", price: 8e3, cost: 4e3, category_id: catIds[3] },
    { number: 13, name: "\u0634\u0627\u0648\u0631\u0645\u0627 \u0644\u062D\u0645", price: 1e4, cost: 5e3, category_id: catIds[3] },
    { number: 14, name: "\u0641\u062A\u0629", price: 8e3, cost: 4e3, category_id: catIds[0] },
    { number: 15, name: "\u0645\u0631\u0642 \u0644\u062D\u0645", price: 5e3, cost: 2e3, category_id: catIds[0] }
  ];
  const insertProd = db.prepare(
    "INSERT INTO products (number, name, price, cost, category_id, active) VALUES (?,?,?,?,?,1)"
  );
  for (const p of products) {
    insertProd.run(p.number, p.name, p.price, p.cost, p.category_id);
  }
  const defaultSettings2 = [
    ["businessName", "\u0645\u0637\u0639\u0645 \u0625\u062A\u0642\u0627\u0646"],
    ["address", "\u0627\u0644\u0631\u064A\u0627\u0636\u060C \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629"],
    ["phone", "0501234567"],
    ["taxNumber", "300000000000003"],
    ["taxRate", "15"],
    ["currency", "\u0631\u064A\u0627\u0644"],
    ["receiptMessage", "\u0634\u0643\u0631\u0627\u064B \u0644\u0632\u064A\u0627\u0631\u062A\u0643\u0645 - \u064A\u0633\u0639\u062F\u0646\u0627 \u062E\u062F\u0645\u062A\u0643\u0645"],
    ["printLogo", "true"],
    ["printQr", "false"],
    ["showCashier", "true"],
    ["showCustomer", "true"],
    ["receiptPaperSize", "80mm"],
    ["showOrderNumber", "true"],
    ["showTableNumber", "true"],
    ["showDateTime", "true"],
    ["showBarcode", "false"],
    ["showOrderType", "true"],
    ["showTax", "true"],
    ["showDiscount", "true"],
    ["showNotes", "true"],
    ["autoPrintTrigger", "after_payment"],
    ["maxReprintCount", "3"],
    ["masterCopiesCount", "1"],
    ["logoUrl", ""]
  ];
  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?,?)");
  for (const [key, value] of defaultSettings2) {
    insertSetting.run(key, value);
  }
  const copyConfigs = [
    { copy_number: 1, label: "\u0646\u0633\u062E\u0629 \u0627\u0644\u0639\u0645\u064A\u0644" },
    { copy_number: 2, label: "\u0646\u0633\u062E\u0629 \u0627\u0644\u0643\u0627\u0634\u064A\u0631" },
    { copy_number: 3, label: "\u0646\u0633\u062E\u0629 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u0629" },
    { copy_number: 4, label: "\u0646\u0633\u062E\u0629 \u0627\u0644\u0623\u0631\u0634\u064A\u0641" }
  ];
  const insertCopy = db.prepare("INSERT OR IGNORE INTO receipt_copy_configs (copy_number, label, enabled) VALUES (?,?,?)");
  for (const c of copyConfigs) {
    insertCopy.run(c.copy_number, c.label, c.copy_number <= 2 ? 1 : 0);
  }
  const insertDept = db.prepare(
    "INSERT OR IGNORE INTO department_print_configs (category_id, printer_name, copies, enabled, print_order) VALUES (?,?,?,?,?)"
  );
  catIds.forEach((cid, idx) => {
    insertDept.run(cid, null, 1, 1, idx + 1);
  });
  const now = /* @__PURE__ */ new Date();
  const adminUser = db.prepare("SELECT id FROM users WHERE username='admin'").get();
  const insertOrder = db.prepare(`
    INSERT INTO orders (invoice_number, subtotal, discount, tax, total, payment_method, cash_amount, user_id, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total, category_id, category_name)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  for (let i = 0; i < 20; i++) {
    const d = new Date(now);
    d.setHours(d.getHours() - i * 2);
    const subtotal = 20500 + i * 3e3;
    const tax = Math.round(subtotal * 0.15);
    const total = subtotal + tax;
    const invNum = `INV-${String(i + 1).padStart(4, "0")}`;
    const result = insertOrder.run(invNum, subtotal, 0, tax, total, "cash", total, adminUser.id, d.toISOString());
    const orderId = result.lastInsertRowid;
    insertItem.run(orderId, 1, "\u0628\u0631\u064A\u0627\u0646\u064A \u062F\u062C\u0627\u062C", 4, 14e3, 56e3, catIds[0], "\u0627\u0644\u0645\u0637\u0628\u062E");
    insertItem.run(orderId, 2, "\u0631\u0632 \u0623\u0628\u064A\u0636", 5, 6500, 32500, catIds[0], "\u0627\u0644\u0645\u0637\u0628\u062E");
  }
}
initSchema();
runMigrations();
seedData();
function createDoubleEntryJournal(entryDate, description, sourceType, sourceId, lines) {
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > 0.01) {
    throw new Error(`\u0627\u0644\u0642\u064A\u062F \u063A\u064A\u0631 \u0645\u062A\u0632\u0646! \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u062F\u064A\u0646: ${totalDebit}\u060C \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062F\u0627\u0626\u0646: ${totalCredit}`);
  }
  const countRow = db.prepare("SELECT COUNT(*) as c FROM journal_entries").get();
  const entryNumber = `JV-${String(countRow.c + 1).padStart(5, "0")}`;
  const cleanDate = entryDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const entryRes = db.prepare(`
    INSERT INTO journal_entries (entry_number, entry_date, description, source_type, source_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(entryNumber, cleanDate, description, sourceType, sourceId);
  const entryId = entryRes.lastInsertRowid;
  for (const line of lines) {
    const acc = db.prepare("SELECT id, type FROM accounts WHERE code = ?").get(line.account_code);
    if (!acc) {
      throw new Error(`\u0627\u0644\u062D\u0633\u0627\u0628 \u0630\u0648 \u0627\u0644\u0631\u0645\u0632 ${line.account_code} \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u062F\u0644\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A!`);
    }
    db.prepare(`
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(entryId, acc.id, line.debit || 0, line.credit || 0, line.description || null);
    const isDebitNormal = ["asset", "expense", "cogs", "wastage"].includes(acc.type);
    const amountChange = isDebitNormal ? line.debit - line.credit : line.credit - line.debit;
    db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amountChange, acc.id);
  }
  return entryId;
}

// artifacts/api-server/src/routes/auth.ts
var router2 = (0, import_express2.Router)();
function getAuthUser(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const userId = getSessionUser(token);
  if (!userId) return null;
  const user = db.prepare("SELECT id, username, name, role, active FROM users WHERE id=?").get(userId);
  return user;
}
router2.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629" });
    return;
  }
  try {
    const licCount = db.prepare("SELECT COUNT(*) as c FROM licenses WHERE active=1").get().c;
    if (licCount === 0 && username !== "developer") {
      res.status(403).json({ error: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0645\u0627\u0644\u0643 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u062F\u0627\u0631\u0629 \u0627\u062A\u0642\u0627\u0646 \u0633\u0648\u0641\u062A" });
      return;
    }
  } catch (e) {
  }
  const user = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if (!user || !user.active) {
    res.status(401).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
    return;
  }
  const ok = verifyPassword(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
    return;
  }
  const token = createSession(user.id);
  const deviceName = req.body.device_name || (req.headers["user-agent"] ? req.headers["user-agent"].split(" ")[0] : "\u0645\u062A\u0635\u0641\u062D \u0627\u0644\u0648\u064A\u0628");
  try {
    db.prepare(`
      INSERT INTO erp_sessions (username, device_name, login_time, status, branch_id, language)
      VALUES (?, ?, datetime('now', 'localtime'), '\u0646\u0634\u0637', 1, '\u0639\u0631\u0628\u064A')
    `).run(user.name, deviceName);
  } catch (err) {
    console.error("Failed to log erp session:", err);
  }
  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role, active: Boolean(user.active) }
  });
});
router2.get("/auth/me", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  res.json({ id: user.id, username: user.username, name: user.name, role: user.role, active: Boolean(user.active) });
});
router2.post("/auth/logout", (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const userId = getSessionUser(token);
    if (userId) {
      const user = db.prepare("SELECT name FROM users WHERE id=?").get(userId);
      if (user) {
        try {
          db.prepare(`
            UPDATE erp_sessions 
            SET status = '\u062E\u0631\u0648\u062C', logout_time = datetime('now', 'localtime') 
            WHERE username = ? AND status = '\u0646\u0634\u0637'
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
var auth_default = router2;

// artifacts/api-server/src/routes/categories.ts
var import_express3 = require("express");
var router3 = (0, import_express3.Router)();
router3.get("/categories", (_req, res) => {
  const rows = db.prepare("SELECT id, name, color, cost, revenue FROM categories ORDER BY name").all();
  res.json(rows);
});
router3.post("/categories", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { name, color, cost, revenue } = req.body;
  if (!name) {
    res.status(400).json({ error: "\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628" });
    return;
  }
  const r = db.prepare("INSERT INTO categories (name, color, cost, revenue) VALUES (?,?,?,?)").run(
    name,
    color ?? null,
    Number(cost || 0),
    Number(revenue || 0)
  );
  const cat = db.prepare("SELECT * FROM categories WHERE id=?").get(r.lastInsertRowid);
  res.status(201).json(cat);
});
router3.put("/categories/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { name, color, cost, revenue } = req.body;
  db.prepare("UPDATE categories SET name=?, color=?, cost=?, revenue=? WHERE id=?").run(
    name,
    color ?? null,
    Number(cost || 0),
    Number(revenue || 0),
    req.params.id
  );
  const cat = db.prepare("SELECT * FROM categories WHERE id=?").get(req.params.id);
  res.json(cat);
});
router3.delete("/categories/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  db.prepare("DELETE FROM categories WHERE id=?").run(req.params.id);
  res.status(204).send();
});
var categories_default = router3;

// artifacts/api-server/src/routes/products.ts
var import_express4 = require("express");
var router4 = (0, import_express4.Router)();
router4.get("/products", (req, res) => {
  const { categoryId } = req.query;
  const search = req.query.search || req.query.q;
  let sql = `
    SELECT p.id, p.number, p.name, p.price, p.cost, p.barcode,
           p.category_id as categoryId, c.name as categoryName, p.active, p.stock
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE 1=1
  `;
  const params = [];
  if (categoryId) {
    sql += " AND p.category_id=?";
    params.push(categoryId);
  }
  if (search) {
    sql += " AND (p.name LIKE ? OR p.barcode LIKE ? OR CAST(p.number AS TEXT) = ?)";
    params.push(`%${search}%`, `%${search}%`, search);
  }
  sql += " ORDER BY p.number";
  const rows = db.prepare(sql).all(...params).map((r) => ({ ...r, active: Boolean(r.active) }));
  res.json(rows);
});
router4.get("/products/next-number", (req, res) => {
  const row = db.prepare("SELECT MAX(number) as maxNum FROM products").get();
  const nextNumber = (row?.maxNum || 0) + 1;
  res.json({ nextNumber });
});
router4.get("/products/:id", (req, res) => {
  const row = db.prepare(`
    SELECT p.id, p.number, p.name, p.price, p.cost, p.barcode,
           p.category_id as categoryId, c.name as categoryName, p.active, p.stock
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id=?
  `).get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    return;
  }
  res.json({ ...row, active: Boolean(row.active) });
});
router4.post("/products", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { name, number, price, cost, barcode, categoryId, active, stock } = req.body;
  if (!name || !number || !price) {
    res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629" });
    return;
  }
  const r = db.prepare(`
    INSERT INTO products (name, number, price, cost, barcode, category_id, active, stock)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(name, number, price, cost ?? null, barcode ?? null, categoryId ?? null, active !== false ? 1 : 0, stock ?? null);
  const prod = db.prepare(`
    SELECT p.id, p.number, p.name, p.price, p.cost, p.barcode,
           p.category_id as categoryId, c.name as categoryName, p.active, p.stock
    FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id=?
  `).get(r.lastInsertRowid);
  res.status(201).json({ ...prod, active: Boolean(prod.active) });
});
router4.put("/products/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { name, number, price, cost, barcode, categoryId, active, stock } = req.body;
  db.prepare(`
    UPDATE products SET name=?, number=?, price=?, cost=?, barcode=?, category_id=?, active=?, stock=?
    WHERE id=?
  `).run(name, number, price, cost ?? null, barcode ?? null, categoryId ?? null, active !== false ? 1 : 0, stock ?? null, req.params.id);
  const prod = db.prepare(`
    SELECT p.id, p.number, p.name, p.price, p.cost, p.barcode,
           p.category_id as categoryId, c.name as categoryName, p.active, p.stock
    FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id=?
  `).get(req.params.id);
  res.json({ ...prod, active: Boolean(prod.active) });
});
router4.delete("/products/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
  res.status(204).send();
});
var products_default = router4;

// artifacts/api-server/src/routes/orders.ts
var import_express5 = require("express");
var router5 = (0, import_express5.Router)();
function formatOrder(o, items) {
  return {
    id: o.id,
    invoiceNumber: o.invoice_number,
    subtotal: o.subtotal,
    discount: o.discount,
    tax: o.tax,
    total: o.total,
    paymentMethod: o.payment_method,
    cashAmount: o.cash_amount,
    cardAmount: o.card_amount,
    customerId: o.customer_id,
    customerName: o.customer_name,
    userId: o.user_id,
    userName: o.user_name,
    note: o.note,
    orderType: o.order_type ?? "dine-in",
    tableNumber: o.table_number ?? null,
    createdAt: o.created_at,
    items: items.map((i) => ({
      productId: i.product_id,
      productName: i.product_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      total: i.total,
      categoryId: i.category_id ?? null,
      categoryName: i.category_name ?? null
    }))
  };
}
router5.get("/orders", (req, res) => {
  const { startDate, endDate, userId, orderType } = req.query;
  let sql = `
    SELECT o.*, u.name as user_name, c.name as customer_name
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE 1=1
  `;
  const params = [];
  if (startDate) {
    sql += " AND DATE(o.created_at) >= ?";
    params.push(startDate);
  }
  if (endDate) {
    sql += " AND DATE(o.created_at) <= ?";
    params.push(endDate);
  }
  if (userId) {
    sql += " AND o.user_id=?";
    params.push(userId);
  }
  if (orderType) {
    sql += " AND o.order_type=?";
    params.push(orderType);
  }
  sql += " ORDER BY o.created_at DESC LIMIT 200";
  const orders = db.prepare(sql).all(...params);
  const result = orders.map((o) => {
    const items = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(o.id);
    return formatOrder(o, items);
  });
  res.json(result);
});
router5.post("/orders", (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { items, paymentMethod, subtotal, discount, tax, total, cashAmount, cardAmount, customerId, userId, note, orderType, tableNumber } = req.body;
  if (!items?.length) {
    res.status(400).json({ error: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0646\u062A\u062C\u0627\u062A" });
    return;
  }
  const count = db.prepare("SELECT COUNT(*) as c FROM orders").get();
  const invoiceNumber = String(count.c + 1);
  const effectiveUserId = userId ?? authUser.id;
  const r = db.prepare(`
    INSERT INTO orders (invoice_number, subtotal, discount, tax, total, payment_method, cash_amount, card_amount, customer_id, user_id, note, order_type, table_number, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    invoiceNumber,
    subtotal ?? 0,
    discount ?? 0,
    tax ?? 0,
    total,
    paymentMethod ?? "cash",
    cashAmount ?? null,
    cardAmount ?? null,
    customerId ?? null,
    effectiveUserId,
    note ?? null,
    orderType ?? "dine-in",
    tableNumber ?? null,
    (/* @__PURE__ */ new Date()).toISOString()
  );
  const orderId = r.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total, category_id, category_name)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  let orderCogs = 0;
  for (const item of items) {
    const prod = db.prepare("SELECT p.*, c.name as cat_name FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=?").get(item.productId);
    const name = prod?.name ?? "\u0645\u0646\u062A\u062C \u0645\u062D\u0630\u0648\u0641";
    insertItem.run(orderId, item.productId, name, item.quantity, item.unitPrice, item.quantity * item.unitPrice, prod?.category_id ?? null, prod?.cat_name ?? null);
    if (prod) {
      const recipes = db.prepare("SELECT * FROM product_recipes WHERE product_id=?").all(prod.id);
      if (recipes.length > 0) {
        let recipeCostSum = 0;
        for (const rec of recipes) {
          const ingProduct = db.prepare("SELECT * FROM products WHERE name=? COLLATE NOCASE LIMIT 1").get(rec.ingredient_name);
          const totalQtyDeducted = (rec.quantity || 1) * item.quantity;
          if (ingProduct) {
            const prevStock = ingProduct.stock ?? 0;
            const newStock = Math.max(0, prevStock - totalQtyDeducted);
            db.prepare("UPDATE products SET stock=? WHERE id=?").run(newStock, ingProduct.id);
            db.prepare(`
              INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, reference_id, user_name)
              VALUES (?, 'out', ?, ?, ?, ?, ?, ?)
            `).run(ingProduct.id, totalQtyDeducted, prevStock, newStock, `\u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0648\u0635\u0641\u0629 \u0645\u0628\u064A\u0639\u0627\u062A \u0644\u0640 ${prod.name}`, orderId, authUser.name);
            recipeCostSum += (ingProduct.cost || 0) * (rec.quantity || 1);
          }
        }
        orderCogs += recipeCostSum * item.quantity;
      } else {
        const prevStock = prod.stock ?? 0;
        const newStock = Math.max(0, prevStock - item.quantity);
        db.prepare("UPDATE products SET stock=? WHERE id=?").run(newStock, prod.id);
        db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, reference_id, user_name)
          VALUES (?, 'out', ?, ?, ?, ?, ?, ?)
        `).run(prod.id, item.quantity, prevStock, newStock, "\u0645\u0628\u064A\u0639\u0627\u062A \u0645\u0628\u0627\u0634\u0631\u0629", orderId, authUser.name);
        orderCogs += (prod.cost || 0) * item.quantity;
      }
    }
  }
  try {
    const safeAccount = "11100";
    const revenueAccount = "41000";
    const lines = [
      { account_code: safeAccount, debit: total, credit: 0, description: `\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0631\u0642\u0645 ${invoiceNumber}` },
      { account_code: revenueAccount, debit: 0, credit: total, description: `\u0625\u064A\u0631\u0627\u062F \u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0631\u0642\u0645 ${invoiceNumber}` }
    ];
    if (orderCogs > 0) {
      lines.push({ account_code: "51000", debit: orderCogs, credit: 0, description: `\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0627\u0644\u0645\u0628\u0627\u0639\u0629 \u0644\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0631\u0642\u0645 ${invoiceNumber}` });
      lines.push({ account_code: "11300", debit: 0, credit: orderCogs, description: `\u062A\u062E\u0641\u064A\u0636 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0644\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0631\u0642\u0645 ${invoiceNumber}` });
    }
    createDoubleEntryJournal(
      (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      `\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A \u0631\u0642\u0645 ${invoiceNumber}`,
      "sale",
      orderId,
      lines
    );
  } catch (journalErr) {
    console.error("Failed to generate double entry for sale:", journalErr.message);
  }
  const order = db.prepare(`
    SELECT o.*, u.name as user_name, c.name as customer_name
    FROM orders o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN customers c ON c.id=o.customer_id
    WHERE o.id=?
  `).get(orderId);
  const orderItems = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(orderId);
  res.status(201).json(formatOrder(order, orderItems));
});
router5.get("/orders/:id", (req, res) => {
  const order = db.prepare(`
    SELECT o.*, u.name as user_name, c.name as customer_name
    FROM orders o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN customers c ON c.id=o.customer_id
    WHERE o.id=?
  `).get(req.params.id);
  if (!order) {
    res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    return;
  }
  const items = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(order.id);
  res.json(formatOrder(order, items));
});
router5.delete("/orders/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  db.prepare("DELETE FROM orders WHERE id=?").run(req.params.id);
  res.status(204).send();
});
var orders_default = router5;

// artifacts/api-server/src/routes/customers.ts
var import_express6 = require("express");
var router6 = (0, import_express6.Router)();
router6.get("/customers", (_req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.name, c.phone, c.email, c.address, c.created_at as createdAt,
           COALESCE(SUM(o.total), 0) as totalPurchases
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id ORDER BY c.name
  `).all();
  res.json(rows);
});
router6.post("/customers", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { name, phone, email, address } = req.body;
  if (!name) {
    res.status(400).json({ error: "\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628" });
    return;
  }
  const r = db.prepare("INSERT INTO customers (name, phone, email, address) VALUES (?,?,?,?)").run(name, phone ?? null, email ?? null, address ?? null);
  const cust = db.prepare("SELECT *, 0 as totalPurchases, created_at as createdAt FROM customers WHERE id=?").get(r.lastInsertRowid);
  res.status(201).json(cust);
});
router6.put("/customers/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { name, phone, email, address } = req.body;
  db.prepare("UPDATE customers SET name=?, phone=?, email=?, address=? WHERE id=?").run(name, phone ?? null, email ?? null, address ?? null, req.params.id);
  const cust = db.prepare(`
    SELECT c.id, c.name, c.phone, c.email, c.address, c.created_at as createdAt,
           COALESCE(SUM(o.total), 0) as totalPurchases
    FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.id=?
  `).get(req.params.id);
  res.json(cust);
});
router6.delete("/customers/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  db.prepare("DELETE FROM customers WHERE id=?").run(req.params.id);
  res.status(204).send();
});
var customers_default = router6;

// artifacts/api-server/src/routes/users.ts
var import_express7 = require("express");
var router7 = (0, import_express7.Router)();
var toUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, active: Boolean(u.active) });
router7.get("/users", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  let rows = db.prepare("SELECT id, username, name, role, active FROM users ORDER BY name").all();
  if (user.role !== "developer") {
    rows = rows.filter((r) => r.role !== "developer");
  }
  res.json(rows.map(toUser));
});
router7.post("/users", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { username, name, role, password, active } = req.body;
  if (!username || !name || !role || !password) {
    res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629" });
    return;
  }
  if (role === "developer" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u063A\u064A\u0631 \u0627\u0644\u0645\u0637\u0648\u0631 \u0628\u062A\u0639\u064A\u064A\u0646 \u062F\u0648\u0631 \u0627\u0644\u0645\u0637\u0648\u0631" });
    return;
  }
  const hash = hashPassword(password);
  const r = db.prepare("INSERT INTO users (username, password_hash, name, role, active) VALUES (?,?,?,?,?)").run(username, hash, name, role, active !== false ? 1 : 0);
  const u = db.prepare("SELECT id, username, name, role, active FROM users WHERE id=?").get(r.lastInsertRowid);
  res.status(201).json(toUser(u));
});
router7.put("/users/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const targetUser = db.prepare("SELECT id, username, name, role, active FROM users WHERE id=?").get(req.params.id);
  if (!targetUser) {
    res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    return;
  }
  if (targetUser.role === "developer" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0627\u0644\u062A\u0639\u062F\u064A\u0644 \u0639\u0644\u0649 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0637\u0648\u0631" });
    return;
  }
  const { username, name, role, password, active } = req.body;
  if (role === "developer" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u063A\u064A\u0631 \u0627\u0644\u0645\u0637\u0648\u0631 \u0628\u062A\u0639\u064A\u064A\u0646 \u062F\u0648\u0631 \u0627\u0644\u0645\u0637\u0648\u0631" });
    return;
  }
  const targetRole = role ?? targetUser.role;
  if (password) {
    const hash = hashPassword(password);
    db.prepare("UPDATE users SET username=?, name=?, role=?, password_hash=?, active=? WHERE id=?").run(username, name, targetRole, hash, active !== false ? 1 : 0, req.params.id);
  } else {
    db.prepare("UPDATE users SET username=?, name=?, role=?, active=? WHERE id=?").run(username, name, targetRole, active !== false ? 1 : 0, req.params.id);
  }
  const u = db.prepare("SELECT id, username, name, role, active FROM users WHERE id=?").get(req.params.id);
  res.json(toUser(u));
});
router7.delete("/users/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const targetUser = db.prepare("SELECT id, username, name, role, active FROM users WHERE id=?").get(req.params.id);
  if (targetUser && targetUser.role === "developer" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0637\u0648\u0631" });
    return;
  }
  db.prepare("DELETE FROM users WHERE id=?").run(req.params.id);
  res.status(204).send();
});
var users_default = router7;

// artifacts/api-server/src/routes/dashboard.ts
var import_express8 = require("express");
var router8 = (0, import_express8.Router)();
router8.get("/dashboard/summary", (_req, res) => {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  const todayStats = db.prepare(`
    SELECT COALESCE(SUM(total),0) as sales, COUNT(*) as orders
    FROM orders WHERE DATE(created_at)=?
  `).get(today);
  const todayProfit = db.prepare(`
    SELECT COALESCE(SUM((oi.unit_price - COALESCE(p.cost,0)) * oi.quantity), 0) as profit
    FROM order_items oi
    JOIN orders o ON o.id=oi.order_id
    LEFT JOIN products p ON p.id=oi.product_id
    WHERE DATE(o.created_at)=?
  `).get(today);
  const monthStats = db.prepare(`
    SELECT COALESCE(SUM(total),0) as sales, COUNT(*) as orders
    FROM orders WHERE DATE(created_at)>=?
  `).get(monthStart);
  const totalProducts = db.prepare("SELECT COUNT(*) as c FROM products WHERE active=1").get().c;
  const totalCustomers = db.prepare("SELECT COUNT(*) as c FROM customers").get().c;
  res.json({
    todaySales: todayStats.sales,
    todayOrders: todayStats.orders,
    todayProfit: todayProfit.profit,
    monthSales: monthStats.sales,
    monthOrders: monthStats.orders,
    totalProducts,
    totalCustomers
  });
});
router8.get("/dashboard/top-products", (_req, res) => {
  const monthStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7) + "-01";
  const rows = db.prepare(`
    SELECT oi.product_id as productId, oi.product_name as productName,
           SUM(oi.quantity) as totalQty, SUM(oi.total) as totalRevenue
    FROM order_items oi
    JOIN orders o ON o.id=oi.order_id
    WHERE DATE(o.created_at)>=?
    GROUP BY oi.product_id, oi.product_name
    ORDER BY totalQty DESC LIMIT 10
  `).all(monthStart);
  res.json(rows);
});
router8.get("/dashboard/sales-by-hour", (_req, res) => {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
           COALESCE(SUM(total),0) as total, COUNT(*) as orders
    FROM orders
    WHERE DATE(created_at)=?
    GROUP BY hour ORDER BY hour
  `).all(today);
  const result = Array.from({ length: 24 }, (_, h) => {
    const found = rows.find((r) => r.hour === h);
    return { hour: h, total: found?.total ?? 0, orders: found?.orders ?? 0 };
  });
  res.json(result);
});
var dashboard_default = router8;

// artifacts/api-server/src/routes/settings.ts
var import_express9 = require("express");
var router9 = (0, import_express9.Router)();
function getSettingsObj() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const map = {};
  for (const r of rows) {
    if (r.value === "true") map[r.key] = true;
    else if (r.value === "false") map[r.key] = false;
    else if (r.value === "null" || r.value === "") map[r.key] = null;
    else if (!isNaN(Number(r.value)) && r.value !== "") map[r.key] = Number(r.value);
    else map[r.key] = r.value;
  }
  return {
    businessName: map["businessName"] ?? "\u0645\u0637\u0639\u0645\u064A",
    address: map["address"] ?? null,
    phone: map["phone"] ?? null,
    taxNumber: map["taxNumber"] ?? null,
    taxRate: map["taxRate"] ?? 15,
    currency: map["currency"] ?? "\u0631\u064A\u0627\u0644",
    receiptMessage: map["receiptMessage"] ?? null,
    printLogo: map["printLogo"] ?? true,
    printQr: map["printQr"] ?? false,
    showCashier: map["showCashier"] ?? true,
    showCustomer: map["showCustomer"] ?? true,
    // Receipt format
    receiptPaperSize: map["receiptPaperSize"] ?? "80mm",
    showOrderNumber: map["showOrderNumber"] ?? true,
    showTableNumber: map["showTableNumber"] ?? true,
    showDateTime: map["showDateTime"] ?? true,
    showBarcode: map["showBarcode"] ?? false,
    showOrderType: map["showOrderType"] ?? true,
    showTax: map["showTax"] ?? true,
    showDiscount: map["showDiscount"] ?? true,
    showNotes: map["showNotes"] ?? true,
    // Print behavior
    autoPrintTrigger: map["autoPrintTrigger"] ?? "print_button",
    maxReprintCount: map["maxReprintCount"] ?? 3,
    masterCopiesCount: map["masterCopiesCount"] ?? 2,
    logoUrl: map["logoUrl"] ?? null,
    systemLogoUrl: map["systemLogoUrl"] ?? null
  };
}
router9.get("/settings", (_req, res) => {
  res.json(getSettingsObj());
});
router9.put("/settings", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)");
  let updates = req.body;
  if (updates && updates.data && typeof updates.data === "object") {
    updates = updates.data;
  }
  for (const [k, v] of Object.entries(updates)) {
    if (k === "systemLogoUrl" && user.role !== "developer") {
      res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u062A\u0639\u062F\u064A\u0644 \u0634\u0639\u0627\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0623\u0633\u0627\u0633\u064A \u0644\u063A\u064A\u0631 \u0627\u0644\u0645\u0637\u0648\u0631" });
      return;
    }
    upsert.run(k, v === null || v === void 0 ? "null" : String(v));
  }
  res.json(getSettingsObj());
});
var settings_default = router9;

// artifacts/api-server/src/routes/reports.ts
var import_express10 = require("express");
var router10 = (0, import_express10.Router)();
router10.get("/reports/sales", (req, res) => {
  const { startDate, endDate, groupBy = "day" } = req.query;
  let format = "%Y-%m-%d";
  if (groupBy === "month") format = "%Y-%m";
  if (groupBy === "year") format = "%Y";
  let sql = `
    SELECT strftime(?, created_at) as period,
           COALESCE(SUM(total), 0) as total,
           COALESCE(SUM(subtotal), 0) as subtotal,
           COALESCE(SUM(discount), 0) as discount,
           COALESCE(SUM(tax), 0) as tax,
           COUNT(*) as orders
    FROM orders WHERE 1=1
  `;
  const params = [format];
  if (startDate) {
    sql += " AND DATE(created_at)>=?";
    params.push(startDate);
  }
  if (endDate) {
    sql += " AND DATE(created_at)<=?";
    params.push(endDate);
  }
  sql += " GROUP BY period ORDER BY period";
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});
router10.get("/reports/by-cashier", (req, res) => {
  const { startDate, endDate } = req.query;
  let sql = `
    SELECT u.id as userId, u.name as userName,
           COUNT(o.id) as orders,
           COALESCE(SUM(o.total), 0) as total,
           COALESCE(SUM(o.subtotal), 0) as subtotal,
           COALESCE(SUM(o.discount), 0) as discount,
           COALESCE(SUM(o.tax), 0) as tax
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE 1=1
  `;
  const params = [];
  if (startDate) {
    sql += " AND DATE(o.created_at)>=?";
    params.push(startDate);
  }
  if (endDate) {
    sql += " AND DATE(o.created_at)<=?";
    params.push(endDate);
  }
  sql += " GROUP BY u.id, u.name ORDER BY total DESC";
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});
router10.get("/reports/by-product", (req, res) => {
  const { startDate, endDate, limit = "20" } = req.query;
  let sql = `
    SELECT oi.product_id as productId, oi.product_name as productName,
           oi.category_name as categoryName,
           SUM(oi.quantity) as totalQty,
           COALESCE(SUM(oi.total), 0) as totalRevenue,
           COALESCE(SUM((oi.unit_price - COALESCE(p.cost, 0)) * oi.quantity), 0) as totalProfit,
           COUNT(DISTINCT oi.order_id) as orderCount
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE 1=1
  `;
  const params = [];
  if (startDate) {
    sql += " AND DATE(o.created_at)>=?";
    params.push(startDate);
  }
  if (endDate) {
    sql += " AND DATE(o.created_at)<=?";
    params.push(endDate);
  }
  sql += " GROUP BY oi.product_id, oi.product_name, oi.category_name ORDER BY totalQty DESC LIMIT ?";
  params.push(Number(limit) || 20);
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});
router10.get("/reports/by-category", (req, res) => {
  const { startDate, endDate } = req.query;
  let sql = `
    SELECT oi.category_id as categoryId,
           COALESCE(oi.category_name, '\u063A\u064A\u0631 \u0645\u0635\u0646\u0651\u0641') as categoryName,
           SUM(oi.quantity) as totalQty,
           COALESCE(SUM(oi.total), 0) as totalRevenue,
           COUNT(DISTINCT oi.order_id) as orderCount
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE 1=1
  `;
  const params = [];
  if (startDate) {
    sql += " AND DATE(o.created_at)>=?";
    params.push(startDate);
  }
  if (endDate) {
    sql += " AND DATE(o.created_at)<=?";
    params.push(endDate);
  }
  sql += " GROUP BY oi.category_id, oi.category_name ORDER BY totalRevenue DESC";
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});
router10.get("/reports/by-payment", (req, res) => {
  const { startDate, endDate } = req.query;
  let sql = `
    SELECT payment_method as paymentMethod,
           COUNT(*) as orders,
           COALESCE(SUM(total), 0) as total
    FROM orders WHERE 1=1
  `;
  const params = [];
  if (startDate) {
    sql += " AND DATE(created_at)>=?";
    params.push(startDate);
  }
  if (endDate) {
    sql += " AND DATE(created_at)<=?";
    params.push(endDate);
  }
  sql += " GROUP BY payment_method ORDER BY total DESC";
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});
var reports_default = router10;

// artifacts/api-server/src/routes/print-config.ts
var import_express11 = require("express");
var router11 = (0, import_express11.Router)();
router11.get("/print-config/receipt-copies", (_req, res) => {
  const rows = db.prepare("SELECT * FROM receipt_copy_configs ORDER BY copy_number").all();
  res.json(rows.map((r) => ({
    id: r.id,
    copyNumber: r.copy_number,
    label: r.label,
    enabled: Boolean(r.enabled)
  })));
});
router11.post("/print-config/receipt-copies", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { copyNumber, label, enabled } = req.body;
  if (!copyNumber || !label) {
    res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629" });
    return;
  }
  const r = db.prepare(
    "INSERT INTO receipt_copy_configs (copy_number, label, enabled) VALUES (?,?,?)"
  ).run(copyNumber, label, enabled !== false ? 1 : 0);
  const row = db.prepare("SELECT * FROM receipt_copy_configs WHERE id=?").get(r.lastInsertRowid);
  res.status(201).json({ id: row.id, copyNumber: row.copy_number, label: row.label, enabled: Boolean(row.enabled) });
});
router11.put("/print-config/receipt-copies/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { copyNumber, label, enabled } = req.body;
  db.prepare(
    "UPDATE receipt_copy_configs SET copy_number=?, label=?, enabled=? WHERE id=?"
  ).run(copyNumber, label, enabled !== false ? 1 : 0, req.params.id);
  const row = db.prepare("SELECT * FROM receipt_copy_configs WHERE id=?").get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    return;
  }
  res.json({ id: row.id, copyNumber: row.copy_number, label: row.label, enabled: Boolean(row.enabled) });
});
router11.delete("/print-config/receipt-copies/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  db.prepare("DELETE FROM receipt_copy_configs WHERE id=?").run(req.params.id);
  res.status(204).send();
});
function formatDeptConfig(r) {
  return {
    id: r.id,
    categoryId: r.category_id,
    categoryName: r.category_name ?? null,
    printerName: r.printer_name ?? null,
    copies: r.copies,
    enabled: Boolean(r.enabled),
    printOrder: r.print_order
  };
}
router11.get("/print-config/departments", (_req, res) => {
  const rows = db.prepare(`
    SELECT d.*, c.name as category_name
    FROM department_print_configs d
    LEFT JOIN categories c ON c.id = d.category_id
    ORDER BY d.print_order
  `).all();
  res.json(rows.map(formatDeptConfig));
});
router11.post("/print-config/departments", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { categoryId, printerName, copies, enabled, printOrder } = req.body;
  const r = db.prepare(
    "INSERT INTO department_print_configs (category_id, printer_name, copies, enabled, print_order) VALUES (?,?,?,?,?)"
  ).run(categoryId ?? null, printerName ?? null, copies ?? 1, enabled !== false ? 1 : 0, printOrder ?? 0);
  const row = db.prepare(`
    SELECT d.*, c.name as category_name FROM department_print_configs d
    LEFT JOIN categories c ON c.id = d.category_id WHERE d.id=?
  `).get(r.lastInsertRowid);
  res.status(201).json(formatDeptConfig(row));
});
router11.put("/print-config/departments/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { categoryId, printerName, copies, enabled, printOrder } = req.body;
  db.prepare(
    "UPDATE department_print_configs SET category_id=?, printer_name=?, copies=?, enabled=?, print_order=? WHERE id=?"
  ).run(categoryId ?? null, printerName ?? null, copies ?? 1, enabled !== false ? 1 : 0, printOrder ?? 0, req.params.id);
  const row = db.prepare(`
    SELECT d.*, c.name as category_name FROM department_print_configs d
    LEFT JOIN categories c ON c.id = d.category_id WHERE d.id=?
  `).get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    return;
  }
  res.json(formatDeptConfig(row));
});
router11.delete("/print-config/departments/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  db.prepare("DELETE FROM department_print_configs WHERE id=?").run(req.params.id);
  res.status(204).send();
});
var print_config_default = router11;

// artifacts/api-server/src/routes/print-log.ts
var import_express12 = require("express");
var router12 = (0, import_express12.Router)();
function formatLog(r) {
  return {
    id: r.id,
    orderId: r.order_id,
    invoiceNumber: r.invoice_number,
    receiptType: r.receipt_type,
    departmentName: r.department_name ?? null,
    printerName: r.printer_name ?? null,
    printedAt: r.printed_at,
    userId: r.user_id,
    userName: r.user_name ?? null,
    copies: r.copies,
    status: r.status,
    reprintReason: r.reprint_reason ?? null,
    reprintCount: r.reprint_count
  };
}
router12.get("/print-log", (req, res) => {
  const { orderId, startDate, endDate } = req.query;
  let sql = `
    SELECT p.*, u.name as user_name
    FROM print_log p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE 1=1
  `;
  const params = [];
  if (orderId) {
    sql += " AND p.order_id=?";
    params.push(orderId);
  }
  if (startDate) {
    sql += " AND DATE(p.printed_at) >= ?";
    params.push(startDate);
  }
  if (endDate) {
    sql += " AND DATE(p.printed_at) <= ?";
    params.push(endDate);
  }
  sql += " ORDER BY p.printed_at DESC LIMIT 500";
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(formatLog));
});
router12.post("/print-log", (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { orderId, invoiceNumber, receiptType, departmentName, printerName, copies, status, reprintReason, reprintCount } = req.body;
  if (!orderId || !invoiceNumber || !receiptType) {
    res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629" });
    return;
  }
  const r = db.prepare(`
    INSERT INTO print_log (order_id, invoice_number, receipt_type, department_name, printer_name, user_id, copies, status, reprint_reason, reprint_count)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    orderId,
    invoiceNumber,
    receiptType,
    departmentName ?? null,
    printerName ?? null,
    authUser.id,
    copies ?? 1,
    status ?? "success",
    reprintReason ?? null,
    reprintCount ?? 0
  );
  const row = db.prepare(`
    SELECT p.*, u.name as user_name FROM print_log p
    LEFT JOIN users u ON u.id = p.user_id WHERE p.id=?
  `).get(r.lastInsertRowid);
  res.status(201).json(formatLog(row));
});
router12.get("/print-log/reprint-count/:orderId", (req, res) => {
  const row = db.prepare(
    "SELECT COALESCE(MAX(reprint_count), 0) as count FROM print_log WHERE order_id=? AND receipt_type='master'"
  ).get(req.params.orderId);
  res.json({ reprintCount: row?.count ?? 0 });
});
var print_log_default = router12;

// artifacts/api-server/src/routes/printers.ts
var import_express13 = require("express");
var import_node_child_process = require("node:child_process");
var import_node_os = require("node:os");
var import_node_fs2 = require("node:fs");
var import_node_os2 = require("node:os");
var import_node_path2 = require("node:path");
var import_node_crypto2 = require("node:crypto");
var import_node_net = __toESM(require("node:net"), 1);
var router13 = (0, import_express13.Router)();
var ORDER_TYPE_LABELS = {
  "dine-in": "\u0645\u062D\u0644\u064A",
  "takeaway": "\u0633\u0641\u0631\u064A",
  "delivery": "\u062A\u0648\u0635\u064A\u0644"
};
function getPrinterSettings() {
  const row = db.prepare("SELECT * FROM printer_settings WHERE id = 1").get();
  if (!row) {
    return {
      paperWidth: 80,
      leftMargin: 1.5,
      rightMargin: 1.5,
      topMargin: 1,
      bottomMargin: 1,
      fontSize: 11,
      lineSpacing: 0,
      charactersPerLine: 48,
      mainPrinterName: null
    };
  }
  return {
    paperWidth: row.paper_width,
    leftMargin: row.left_margin,
    rightMargin: row.right_margin,
    topMargin: row.top_margin,
    bottomMargin: row.bottom_margin,
    fontSize: row.font_size,
    lineSpacing: row.line_spacing,
    charactersPerLine: row.characters_per_line,
    mainPrinterName: row.main_printer_name ?? null
  };
}
function getGeneralSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const map = {};
  for (const r of rows) {
    if (r.value === "true") map[r.key] = true;
    else if (r.value === "false") map[r.key] = false;
    else if (r.value === "null" || r.value === "") map[r.key] = null;
    else if (!isNaN(Number(r.value)) && r.value !== "") map[r.key] = Number(r.value);
    else map[r.key] = r.value;
  }
  return {
    businessName: map["businessName"] ?? "\u0645\u0637\u0639\u0645\u064A",
    address: map["address"] ?? null,
    phone: map["phone"] ?? null,
    taxNumber: map["taxNumber"] ?? null,
    taxRate: map["taxRate"] ?? 15,
    currency: map["currency"] ?? "\u0631\u064A\u0627\u0644",
    receiptMessage: map["receiptMessage"] ?? null,
    printLogo: map["printLogo"] ?? true,
    printQr: map["printQr"] ?? false,
    showCashier: map["showCashier"] ?? true,
    showCustomer: map["showCustomer"] ?? true,
    receiptPaperSize: map["receiptPaperSize"] ?? "80mm",
    showOrderNumber: map["showOrderNumber"] ?? true,
    showTableNumber: map["showTableNumber"] ?? true,
    showDateTime: map["showDateTime"] ?? true,
    showBarcode: map["showBarcode"] ?? false,
    showOrderType: map["showOrderType"] ?? true,
    showTax: map["showTax"] ?? true,
    showDiscount: map["showDiscount"] ?? true,
    showNotes: map["showNotes"] ?? true,
    autoPrintTrigger: map["autoPrintTrigger"] ?? "print_button",
    maxReprintCount: map["maxReprintCount"] ?? 3,
    masterCopiesCount: map["masterCopiesCount"] ?? 2,
    logoUrl: map["logoUrl"] ?? null
  };
}
function getDepartmentConfigs() {
  const rows = db.prepare(`
    SELECT d.*, c.name as category_name
    FROM department_print_configs d
    LEFT JOIN categories c ON c.id = d.category_id
    ORDER BY d.print_order
  `).all();
  return rows.map((r) => ({
    id: r.id,
    categoryId: r.category_id,
    printerName: r.printer_name ?? null,
    copies: r.copies ?? 1,
    enabled: r.enabled !== 0,
    printOrder: r.print_order ?? 0,
    categoryName: r.category_name ?? "\u0642\u0633\u0645"
  }));
}
function getBackendDeptGroups(order, deptConfigs) {
  const categoryMap = /* @__PURE__ */ new Map();
  for (const item of order.items ?? []) {
    const key = item.categoryId ?? "__no_category__";
    if (!categoryMap.has(key)) {
      const config = deptConfigs.find((d) => d.categoryId === item.categoryId);
      categoryMap.set(key, {
        categoryId: item.categoryId ?? null,
        categoryName: item.categoryName ?? "\u0642\u0633\u0645",
        items: [],
        printOrder: config?.printOrder ?? 999
      });
    }
    categoryMap.get(key).items.push(item);
  }
  return Array.from(categoryMap.values()).filter((g) => g.items.length > 0).sort((a, b) => a.printOrder - b.printOrder).map((g) => {
    const config = deptConfigs.find((d) => d.categoryId === g.categoryId);
    return {
      dept: {
        id: config?.id ?? (g.categoryId ?? 0),
        categoryId: g.categoryId,
        categoryName: g.categoryName ?? "\u0642\u0633\u0645",
        printerName: config?.printerName ?? null,
        copies: config?.copies ?? 1,
        enabled: config ? config.enabled : true,
        printOrder: g.printOrder
      },
      items: g.items
    };
  });
}
function parseOrderDate(dateStr) {
  if (!dateStr) return /* @__PURE__ */ new Date();
  let s = String(dateStr).trim();
  if (s && !s.endsWith("Z") && !s.includes("+") && !/-\d{2}:\d{2}$/.test(s)) {
    s = s.replace(" ", "T") + "Z";
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? /* @__PURE__ */ new Date() : parsed;
}
function generateReceiptText(order, settings, cashierName, printerSettings) {
  const lines = [];
  const w = Number(printerSettings?.charactersPerLine || settings?.charactersPerLine || 40);
  const leftMarginSpaces = Math.max(0, Math.floor((printerSettings?.leftMargin ?? 0) / 1.5));
  const padLeft = " ".repeat(leftMarginSpaces);
  const center = (s) => {
    if (s.length >= w) return s;
    const padLen = Math.floor((w - s.length) / 2);
    return " ".repeat(padLen) + s;
  };
  const line = (ch = "-") => ch.repeat(w);
  const cleanInvoiceNumber = (order.invoiceNumber || String(order.id)).replace(/^INV-0*/, "") || "0";
  const topMarginLines = Math.max(0, Math.floor((printerSettings?.topMargin ?? 0) / 4));
  for (let i = 0; i < topMarginLines; i++) {
    lines.push("");
  }
  lines.push(center(settings?.businessName ?? "\u0627\u0644\u0645\u0637\u0639\u0645"));
  if (settings?.address) lines.push(center(settings.address));
  lines.push(line("."));
  lines.push(center("\u0641\u0627\u062A\u0648\u0631\u0629 \u062E\u0627\u0635\u0629 \u0628\u0627\u0644\u0632\u0628\u0648\u0646"));
  lines.push(center(`\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u0644\u0633\u0644: [ ${cleanInvoiceNumber} ]`));
  lines.push(line("."));
  const d = order.createdAt ? parseOrderDate(order.createdAt) : /* @__PURE__ */ new Date();
  const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  lines.push(`\u0627\u0644\u062A\u0627\u0631\u064A\u062E: ${dateStr}  ${timeStr}`);
  lines.push(`\u0646\u0648\u0639 \u0627\u0644\u0637\u0644\u0628: ${ORDER_TYPE_LABELS[order.orderType ?? "dine-in"] ?? "\u0645\u062D\u0644\u064A"}`);
  lines.push(`\u0627\u0644\u0637\u0627\u0648\u0644\u0629: ${order.tableNumber || "0"}    \u0637`);
  lines.push(line("-"));
  const priceW = Math.max(8, Math.floor(w * 0.25));
  const qtyW = Math.max(4, Math.floor(w * 0.15));
  const nameW = w - priceW - qtyW;
  lines.push(`${"\u0627\u0644\u0635\u0646\u0641".padEnd(nameW)}${"\u0627\u0644\u0643\u0645\u064A\u0629".padStart(qtyW)}${"\u0627\u0644\u0633\u0639\u0631".padStart(priceW)}`);
  lines.push(line("-"));
  for (const item of order.items ?? []) {
    const name = (item.productName || item.product?.name || "").substring(0, Math.max(5, nameW - 1)).padEnd(nameW);
    const qty = String(item.quantity).padStart(qtyW);
    const price = String((item.unitPrice || item.price || 0).toLocaleString()).padStart(priceW);
    lines.push(`${name}${qty}${price}`);
  }
  lines.push(line("-"));
  const totalStr = `\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: ${(order.total || 0).toFixed(2)} ${settings?.currency ?? "\u0631\u064A\u0627\u0644"}`;
  lines.push(totalStr.padStart(w));
  lines.push(line("="));
  if (cashierName) lines.push(center(`\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0634\u064A\u0631: ${cashierName}`));
  if (order.note) lines.push(`\u0645\u0644\u0627\u062D\u0638\u0627\u062A: ${order.note}`);
  lines.push(line("-"));
  lines.push(center("\u0627\u0644\u0637\u0644\u0628 \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0633\u062A\u0631\u062C\u0627\u0639\u0647 \u0623\u0648 \u0625\u0644\u063A\u0627\u0624\u0647"));
  if (settings?.phone) lines.push(center(`\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u062A\u0648\u0627\u0635\u0644: ${settings.phone}`));
  lines.push(line("-"));
  lines.push(center("\u2704 - - - - - - - - - - - - - - - - \u2704"));
  lines.push(line("-"));
  const bottomMarginLines = Math.max(6, Math.floor((printerSettings?.bottomMargin ?? 8) / 2));
  for (let i = 0; i < bottomMarginLines; i++) {
    lines.push("");
  }
  return lines.map((l) => l ? padLeft + l : l).join("\n");
}
function generateDeptReceiptText(order, dept, items, settings, printerSettings) {
  const lines = [];
  const w = Number(printerSettings?.charactersPerLine || settings?.charactersPerLine || 32);
  const leftMarginSpaces = Math.max(0, Math.floor((printerSettings?.leftMargin ?? 0) / 1.5));
  const padLeft = " ".repeat(leftMarginSpaces);
  const center = (s) => {
    if (s.length >= w) return s;
    const padLen = Math.floor((w - s.length) / 2);
    return " ".repeat(padLen) + s;
  };
  const line = (ch = "-") => ch.repeat(w);
  const cleanInvoiceNumber = (order.invoiceNumber || String(order.id)).replace(/^INV-0*/, "") || "0";
  const topMarginLines = Math.max(0, Math.floor((printerSettings?.topMargin ?? 0) / 4));
  for (let i = 0; i < topMarginLines; i++) {
    lines.push("");
  }
  lines.push(center(settings?.businessName ?? "\u0627\u0644\u0645\u0637\u0639\u0645"));
  lines.push(center(`\u0642\u0633\u0645: ${dept.categoryName}`));
  lines.push(line("."));
  lines.push(center(`\u0623\u0645\u0631 \u0635\u0631\u0641 \u0631\u0642\u0645: [ ${cleanInvoiceNumber} ]`));
  lines.push(line("-"));
  const d = order.createdAt ? parseOrderDate(order.createdAt) : /* @__PURE__ */ new Date();
  const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  lines.push(`\u0627\u0644\u062A\u0627\u0631\u064A\u062E: ${dateStr}`);
  lines.push(`\u0646\u0648\u0639 \u0627\u0644\u0637\u0644\u0628: ${ORDER_TYPE_LABELS[order.orderType ?? "dine-in"] ?? "\u0645\u062D\u0644\u064A"}`);
  lines.push(`\u0627\u0644\u0637\u0627\u0648\u0644\u0629: ${order.tableNumber || "0"}    \u0637`);
  lines.push(line("="));
  const qtyW = Math.max(4, Math.floor(w * 0.15));
  const nameW = w - qtyW;
  for (const item of items) {
    const name = (item.productName || item.product?.name || "").substring(0, Math.max(5, nameW - 1)).padEnd(nameW);
    const qty = `x${item.quantity}`.padStart(qtyW);
    lines.push(`${name}${qty}`);
  }
  lines.push(line("="));
  if (order.note) lines.push(`\u0645\u0644\u0627\u062D\u0638\u0627\u062A: ${order.note}`);
  lines.push(line("-"));
  lines.push(center("\u2704 - - - - - - - - - - - - - - - - \u2704"));
  lines.push(line("-"));
  const bottomMarginLines = Math.max(6, Math.floor((printerSettings?.bottomMargin ?? 8) / 2));
  for (let i = 0; i < bottomMarginLines; i++) {
    lines.push("");
  }
  return lines.map((l) => l ? padLeft + l : l).join("\n");
}
async function printDirect(printerName, content, copies) {
  const targetPrinter = printerName ? printerName.trim() : "";
  if (!targetPrinter) {
    printViaSystem("", content, copies);
    return;
  }
  const ipPortMatch = targetPrinter.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?$/);
  if (ipPortMatch) {
    const host = ipPortMatch[1];
    const port = ipPortMatch[2] ? parseInt(ipPortMatch[2]) : 9100;
    await printViaTcp(host, port, content, copies);
  } else {
    printViaSystem(targetPrinter, content, copies);
  }
}
function listPrinters() {
  const os = (0, import_node_os.platform)();
  try {
    if (os === "win32") {
      const out = (0, import_node_child_process.execSync)(
        `powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"`,
        { timeout: 5e3, encoding: "utf8" }
      );
      return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    } else {
      const out = (0, import_node_child_process.execSync)("lpstat -a 2>/dev/null || lpstat -p 2>/dev/null || echo ''", {
        timeout: 5e3,
        encoding: "utf8",
        shell: "/bin/bash"
      });
      return out.split(/\r?\n/).map((line) => {
        const match = line.match(/^(\S+)/);
        return match ? match[1] : "";
      }).filter(Boolean);
    }
  } catch {
    return [];
  }
}
function printViaSystem(printerName, content, copies) {
  const os = (0, import_node_os.platform)();
  const tmpFile = (0, import_node_path2.join)((0, import_node_os2.tmpdir)(), `pos-receipt-${(0, import_node_crypto2.randomBytes)(6).toString("hex")}.txt`);
  try {
    (0, import_node_fs2.writeFileSync)(tmpFile, "\uFEFF" + content, { encoding: "utf8" });
    const targetPrinter = printerName ? printerName.trim() : "";
    for (let i = 0; i < copies; i++) {
      if (os === "win32") {
        try {
          const escapedPath = tmpFile.replace(/'/g, "''");
          if (targetPrinter) {
            const escapedPrinter = targetPrinter.replace(/'/g, "''");
            (0, import_node_child_process.execSync)(`powershell -Command "$ErrorActionPreference = 'Stop'; Get-Content -LiteralPath '${escapedPath}' -Raw -Encoding utf8 | Out-Printer -Name '${escapedPrinter}'"`, { timeout: 1e4 });
          } else {
            (0, import_node_child_process.execSync)(`powershell -Command "$ErrorActionPreference = 'Stop'; Get-Content -LiteralPath '${escapedPath}' -Raw -Encoding utf8 | Out-Printer"`, { timeout: 1e4 });
          }
        } catch (pwErr) {
          console.error("PowerShell printing failed, trying legacy fallback:", pwErr);
          if (targetPrinter) {
            try {
              (0, import_node_child_process.execSync)(`print /D:"${targetPrinter}" "${tmpFile}"`, { timeout: 1e4 });
            } catch (legacyErr) {
              throw new Error(`PowerShell print failed (${pwErr.message}) and legacy fallback failed (${legacyErr.message})`);
            }
          } else {
            throw new Error(`PowerShell print failed: ${pwErr.message}`);
          }
        }
      } else {
        try {
          if (targetPrinter) {
            (0, import_node_child_process.execSync)(`lp -d "${targetPrinter}" "${tmpFile}"`, { timeout: 1e4, shell: "/bin/bash" });
          } else {
            (0, import_node_child_process.execSync)(`lp "${tmpFile}"`, { timeout: 1e4, shell: "/bin/bash" });
          }
        } catch (linuxErr) {
          console.error("Linux printing failed:", linuxErr);
          const errMsg = linuxErr.message || "";
          if (errMsg.includes("not found") || errMsg.includes("command not found") || errMsg.includes("ENOENT")) {
            throw new Error(`\u0646\u0638\u0627\u0645 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 (lp) \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062C\u0647\u0627\u0632. \u064A\u0631\u062C\u0649 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0646\u0638\u0627\u0645 \u0645\u062D\u0644\u064A\u0627\u064B \u0644\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0635\u0627\u0645\u062A\u0629 \u0639\u0628\u0631 USB \u0623\u0648 \u062A\u062B\u0628\u064A\u062A \u062E\u062F\u0645\u0629 CUPS (\u062E\u0637\u0623: lp not found)`);
          } else {
            throw new Error(`\u0641\u0634\u0644\u062A \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0639\u0628\u0631 \u0627\u0644\u0646\u0638\u0627\u0645: ${errMsg}`);
          }
        }
      }
    }
  } finally {
    try {
      if ((0, import_node_fs2.existsSync)(tmpFile)) (0, import_node_fs2.unlinkSync)(tmpFile);
    } catch {
    }
  }
}
function printViaTcp(host, port, content, copies) {
  return new Promise((resolve, reject) => {
    let sent = 0;
    const cutCommand = "VB\0";
    const contentWithCut = content.endsWith(cutCommand) ? content : content + "\n\n" + cutCommand;
    function sendCopy() {
      if (sent >= copies) {
        resolve();
        return;
      }
      const client = new import_node_net.default.Socket();
      client.connect(port, host, () => {
        client.write(Buffer.from(contentWithCut, "utf8"), () => {
          client.end();
        });
      });
      client.on("close", () => {
        sent++;
        sendCopy();
      });
      client.on("error", reject);
      client.setTimeout(8e3, () => {
        client.destroy();
        reject(new Error("TCP print timeout"));
      });
    }
    sendCopy();
  });
}
router13.get("/printers/list", (_req, res) => {
  const printers = listPrinters();
  res.json(printers);
});
router13.post("/printers/print-direct", async (req, res) => {
  const { printerName, content, copies = 1 } = req.body;
  if (!content) {
    res.status(400).json({ ok: false, message: "content is required" });
    return;
  }
  try {
    await printDirect(printerName ?? "", content, copies);
    res.json({ ok: true, message: "\u062A\u0645\u062A \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.json({ ok: false, message: err?.message ?? "\u0641\u0634\u0644\u062A \u0627\u0644\u0637\u0628\u0627\u0639\u0629" });
  }
});
router13.post("/printers/print", async (req, res) => {
  const { printerName, content, copies = 1 } = req.body;
  if (!content) {
    res.status(400).json({ ok: false, message: "content is required" });
    return;
  }
  try {
    await printDirect(printerName ?? "", content, copies);
    res.json({ ok: true, message: "\u062A\u0645\u062A \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.json({ ok: false, message: err?.message ?? "\u0641\u0634\u0644\u062A \u0627\u0644\u0637\u0628\u0627\u0639\u0629" });
  }
});
router13.post("/printers/electron-print", async (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { order } = req.body;
  if (!order) {
    res.status(400).json({ ok: false, message: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0644\u0628 \u0645\u0637\u0644\u0648\u0628\u0629" });
    return;
  }
  try {
    const printerSettings = getPrinterSettings();
    const generalSettings = getGeneralSettings();
    const deptConfigs = getDepartmentConfigs();
    const deptGroups = getBackendDeptGroups(order, deptConfigs);
    const printJobs = [];
    const mainPrinter = printerSettings.mainPrinterName || "";
    const copiesCount = generalSettings.masterCopiesCount ?? 2;
    const masterText = generateReceiptText(order, generalSettings, authUser.name, printerSettings);
    for (let i = 0; i < copiesCount; i++) {
      const copyLabel = `\u0646\u0633\u062E\u0629 ${i + 1}`;
      printJobs.push({
        printerName: mainPrinter,
        content: masterText,
        copies: 1,
        log: {
          orderId: order.id,
          invoiceNumber: order.invoiceNumber,
          receiptType: "master",
          departmentName: copyLabel,
          printerName: mainPrinter || "\u0627\u0644\u0637\u0627\u0628\u0639\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629"
        }
      });
    }
    for (const { dept, items } of deptGroups) {
      if (!items.length) continue;
      if (!dept.printerName || !dept.printerName.trim()) {
        continue;
      }
      const deptText = generateDeptReceiptText(order, dept, items, generalSettings, printerSettings);
      printJobs.push({
        printerName: dept.printerName,
        content: deptText,
        copies: dept.copies || 1,
        log: {
          orderId: order.id,
          invoiceNumber: order.invoiceNumber,
          receiptType: "department",
          departmentName: dept.categoryName ?? "\u0642\u0633\u0645",
          printerName: dept.printerName
        }
      });
    }
    const results = [];
    let overallSuccess = true;
    for (const job of printJobs) {
      let printSuccess = false;
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = "";
      while (attempts < maxAttempts && !printSuccess) {
        attempts++;
        try {
          await printDirect(job.printerName, job.content, job.copies);
          printSuccess = true;
        } catch (err) {
          lastError = err?.message ?? "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641";
          console.error(`Attempt ${attempts} failed for printer ${job.printerName}:`, err);
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 200));
          }
        }
      }
      const status = printSuccess ? "success" : "failed";
      if (!printSuccess) {
        overallSuccess = false;
      }
      results.push({
        printerName: job.printerName,
        departmentName: job.log.departmentName,
        receiptType: job.log.receiptType,
        status,
        error: printSuccess ? null : lastError
      });
      try {
        db.prepare(`
          INSERT INTO print_log (order_id, invoice_number, receipt_type, department_name, printer_name, user_id, copies, status, reprint_reason, reprint_count)
          VALUES (?,?,?,?,?,?,?,?,?,?)
        `).run(
          job.log.orderId,
          job.log.invoiceNumber,
          job.log.receiptType,
          job.log.departmentName,
          job.log.printerName,
          authUser.id,
          job.copies,
          status,
          null,
          0
        );
      } catch (logErr) {
        console.error("Failed to insert print log into DB:", logErr);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    res.json({
      ok: overallSuccess,
      results
    });
  } catch (err) {
    console.error("Error during background silent printing:", err);
    res.status(500).json({
      ok: false,
      message: err?.message ?? "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u062E\u0644\u0641\u064A\u0629"
    });
  }
});
var printers_default = router13;

// artifacts/api-server/src/routes/printer-settings.ts
var import_express14 = require("express");
var router14 = (0, import_express14.Router)();
function getRow() {
  return db.prepare("SELECT * FROM printer_settings WHERE id = 1").get();
}
function toApi(row) {
  if (!row) return defaultSettings();
  return {
    paperWidth: row.paper_width,
    leftMargin: row.left_margin,
    rightMargin: row.right_margin,
    topMargin: row.top_margin,
    bottomMargin: row.bottom_margin,
    fontSize: row.font_size,
    lineSpacing: row.line_spacing,
    charactersPerLine: row.characters_per_line,
    mainPrinterName: row.main_printer_name ?? null
  };
}
function defaultSettings() {
  return { paperWidth: 80, leftMargin: 4, rightMargin: 4, topMargin: 2, bottomMargin: 2, fontSize: 10, lineSpacing: 2, charactersPerLine: 48, mainPrinterName: null };
}
router14.get("/printer-settings", (_req, res) => {
  const row = getRow();
  res.json(toApi(row));
});
router14.put("/printer-settings", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  let b = req.body;
  if (b && b.data && typeof b.data === "object") {
    b = b.data;
  }
  db.prepare(`
    INSERT INTO printer_settings (id, paper_width, left_margin, right_margin, top_margin, bottom_margin, font_size, line_spacing, characters_per_line, main_printer_name)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      paper_width = excluded.paper_width,
      left_margin = excluded.left_margin,
      right_margin = excluded.right_margin,
      top_margin = excluded.top_margin,
      bottom_margin = excluded.bottom_margin,
      font_size = excluded.font_size,
      line_spacing = excluded.line_spacing,
      characters_per_line = excluded.characters_per_line,
      main_printer_name = excluded.main_printer_name
  `).run(
    b.paperWidth ?? 80,
    b.leftMargin ?? 4,
    b.rightMargin ?? 4,
    b.topMargin ?? 2,
    b.bottomMargin ?? 2,
    b.fontSize ?? 10,
    b.lineSpacing ?? 2,
    b.charactersPerLine ?? 48,
    b.mainPrinterName ?? null
  );
  res.json(toApi(getRow()));
});
var printer_settings_default = router14;

// artifacts/api-server/src/routes/hr.ts
var import_express15 = require("express");
var router15 = (0, import_express15.Router)();
function requireAdmin(req, res) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return false;
  }
  return true;
}
router15.get("/hr/departments", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const rows = db.prepare("SELECT * FROM hr_departments ORDER BY name").all();
  res.json(rows);
});
router15.post("/hr/departments", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { name, budget } = req.body;
  if (!name) {
    res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0642\u0633\u0645 \u0645\u0637\u0644\u0648\u0628" });
    return;
  }
  const r = db.prepare("INSERT INTO hr_departments (name, budget) VALUES (?,?)").run(name, budget ?? 0);
  res.status(201).json(db.prepare("SELECT * FROM hr_departments WHERE id=?").get(r.lastInsertRowid));
});
router15.put("/hr/departments/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { name, budget } = req.body;
  db.prepare("UPDATE hr_departments SET name=?, budget=? WHERE id=?").run(name, budget ?? 0, req.params.id);
  res.json(db.prepare("SELECT * FROM hr_departments WHERE id=?").get(req.params.id));
});
router15.delete("/hr/departments/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  db.prepare("DELETE FROM hr_departments WHERE id=?").run(req.params.id);
  res.status(204).send();
});
router15.get("/hr/employees", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const rows = db.prepare(`
    SELECT e.*, d.name as department_name
    FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id = e.department_id
    ORDER BY e.name
  `).all();
  res.json(rows.map((r) => ({ ...r, active: Boolean(r.active) })));
});
router15.get("/hr/employees/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const row = db.prepare(`
    SELECT e.*, d.name as department_name
    FROM hr_employees e LEFT JOIN hr_departments d ON d.id=e.department_id
    WHERE e.id=?
  `).get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    return;
  }
  res.json({ ...row, active: Boolean(row.active) });
});
router15.post("/hr/employees", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_number, name, phone, position, department_id, basic_salary, hire_date, active } = req.body;
  if (!name || !employee_number) {
    res.status(400).json({ error: "\u0627\u0644\u0627\u0633\u0645 \u0648\u0631\u0642\u0645 \u0627\u0644\u0645\u0648\u0638\u0641 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
    return;
  }
  const r = db.prepare(`
    INSERT INTO hr_employees (employee_number, name, phone, position, department_id, basic_salary, hire_date, active)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(employee_number, name, phone ?? null, position ?? null, department_id ?? null, basic_salary ?? 0, hire_date ?? null, active !== false ? 1 : 0);
  const emp = db.prepare(`
    SELECT e.*, d.name as department_name FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id=e.department_id WHERE e.id=?
  `).get(r.lastInsertRowid);
  res.status(201).json({ ...emp, active: Boolean(emp.active) });
});
router15.put("/hr/employees/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_number, name, phone, position, department_id, basic_salary, hire_date, active } = req.body;
  db.prepare(`
    UPDATE hr_employees SET employee_number=?, name=?, phone=?, position=?, department_id=?, basic_salary=?, hire_date=?, active=?
    WHERE id=?
  `).run(employee_number, name, phone ?? null, position ?? null, department_id ?? null, basic_salary ?? 0, hire_date ?? null, active !== false ? 1 : 0, req.params.id);
  const emp = db.prepare(`
    SELECT e.*, d.name as department_name FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id=e.department_id WHERE e.id=?
  `).get(req.params.id);
  res.json({ ...emp, active: Boolean(emp.active) });
});
router15.delete("/hr/employees/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  db.prepare("DELETE FROM hr_employees WHERE id=?").run(req.params.id);
  res.status(204).send();
});
router15.get("/hr/salaries", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_id, month } = req.query;
  let sql = `
    SELECT s.*, e.name as employee_name, e.employee_number
    FROM hr_salaries s JOIN hr_employees e ON e.id=s.employee_id
    WHERE 1=1
  `;
  const params = [];
  if (employee_id) {
    sql += " AND s.employee_id=?";
    params.push(employee_id);
  }
  if (month) {
    sql += " AND s.month=?";
    params.push(month);
  }
  sql += " ORDER BY s.month DESC, e.name";
  res.json(db.prepare(sql).all(...params));
});
router15.post("/hr/salaries", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_id, month, basic_salary, bonuses, deductions, notes } = req.body;
  if (!employee_id || !month) {
    res.status(400).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u0648\u0627\u0644\u0634\u0647\u0631 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
    return;
  }
  const existing = db.prepare("SELECT id FROM hr_salaries WHERE employee_id=? AND month=?").get(employee_id, month);
  if (existing) {
    res.status(400).json({ error: "\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0631\u0627\u062A\u0628 \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631 \u0645\u0633\u0628\u0642\u0627\u064B" });
    return;
  }
  const net2 = (basic_salary ?? 0) + (bonuses ?? 0) - (deductions ?? 0);
  const r = db.prepare(`
    INSERT INTO hr_salaries (employee_id, month, basic_salary, bonuses, deductions, net_salary, status, notes)
    VALUES (?,?,?,?,?,?,'pending',?)
  `).run(employee_id, month, basic_salary ?? 0, bonuses ?? 0, deductions ?? 0, net2, notes ?? null);
  res.status(201).json(db.prepare(`
    SELECT s.*, e.name as employee_name, e.employee_number FROM hr_salaries s
    JOIN hr_employees e ON e.id=s.employee_id WHERE s.id=?
  `).get(r.lastInsertRowid));
});
router15.put("/hr/salaries/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { basic_salary, bonuses, deductions, status, payment_date, notes } = req.body;
  const net2 = (basic_salary ?? 0) + (bonuses ?? 0) - (deductions ?? 0);
  db.prepare(`
    UPDATE hr_salaries SET basic_salary=?, bonuses=?, deductions=?, net_salary=?, status=?, payment_date=?, notes=?
    WHERE id=?
  `).run(basic_salary ?? 0, bonuses ?? 0, deductions ?? 0, net2, status ?? "pending", payment_date ?? null, notes ?? null, req.params.id);
  res.json(db.prepare(`
    SELECT s.*, e.name as employee_name, e.employee_number FROM hr_salaries s
    JOIN hr_employees e ON e.id=s.employee_id WHERE s.id=?
  `).get(req.params.id));
});
router15.delete("/hr/salaries/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  db.prepare("DELETE FROM hr_salaries WHERE id=?").run(req.params.id);
  res.status(204).send();
});
router15.get("/hr/attendance", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_id, date, month } = req.query;
  let sql = `
    SELECT a.*, e.name as employee_name, e.employee_number
    FROM hr_attendance a JOIN hr_employees e ON e.id=a.employee_id
    WHERE 1=1
  `;
  const params = [];
  if (employee_id) {
    sql += " AND a.employee_id=?";
    params.push(employee_id);
  }
  if (date) {
    sql += " AND a.date=?";
    params.push(date);
  }
  if (month) {
    sql += " AND strftime('%Y-%m', a.date)=?";
    params.push(month);
  }
  sql += " ORDER BY a.date DESC, e.name";
  res.json(db.prepare(sql).all(...params));
});
router15.post("/hr/attendance", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_id, date, check_in, check_out, status, notes } = req.body;
  if (!employee_id || !date) {
    res.status(400).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
    return;
  }
  const existing = db.prepare("SELECT id FROM hr_attendance WHERE employee_id=? AND date=?").get(employee_id, date);
  if (existing) {
    db.prepare("UPDATE hr_attendance SET check_in=?, check_out=?, status=?, notes=? WHERE employee_id=? AND date=?").run(check_in ?? null, check_out ?? null, status ?? "present", notes ?? null, employee_id, date);
    res.json(db.prepare("SELECT a.*, e.name as employee_name FROM hr_attendance a JOIN hr_employees e ON e.id=a.employee_id WHERE a.employee_id=? AND a.date=?").get(employee_id, date));
    return;
  }
  const r = db.prepare(`
    INSERT INTO hr_attendance (employee_id, date, check_in, check_out, status, notes)
    VALUES (?,?,?,?,?,?)
  `).run(employee_id, date, check_in ?? null, check_out ?? null, status ?? "present", notes ?? null);
  res.status(201).json(db.prepare(`
    SELECT a.*, e.name as employee_name FROM hr_attendance a
    JOIN hr_employees e ON e.id=a.employee_id WHERE a.id=?
  `).get(r.lastInsertRowid));
});
router15.put("/hr/attendance/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { check_in, check_out, status, notes } = req.body;
  db.prepare("UPDATE hr_attendance SET check_in=?, check_out=?, status=?, notes=? WHERE id=?").run(check_in ?? null, check_out ?? null, status ?? "present", notes ?? null, req.params.id);
  res.json(db.prepare("SELECT a.*, e.name as employee_name FROM hr_attendance a JOIN hr_employees e ON e.id=a.employee_id WHERE a.id=?").get(req.params.id));
});
router15.delete("/hr/attendance/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  db.prepare("DELETE FROM hr_attendance WHERE id=?").run(req.params.id);
  res.status(204).send();
});
router15.get("/hr/meal-deductions", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_id, month } = req.query;
  let sql = `SELECT md.*, e.name as employee_name, e.employee_number FROM meal_deductions md
    JOIN hr_employees e ON e.id=md.employee_id WHERE 1=1`;
  const params = [];
  if (employee_id) {
    sql += " AND md.employee_id=?";
    params.push(employee_id);
  }
  if (month) {
    sql += " AND strftime('%Y-%m', md.created_at)=?";
    params.push(month);
  }
  sql += " ORDER BY md.created_at DESC";
  res.json(db.prepare(sql).all(...params));
});
router15.post("/hr/meal-deductions", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { employee_id, employee_name, employee_number, order_id, invoice_number, amount, notes } = req.body;
  if (!employee_id || !amount) {
    res.status(400).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u0648\u0627\u0644\u0645\u0628\u0644\u063A \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
    return;
  }
  const r = db.prepare(`
    INSERT INTO meal_deductions (employee_id, employee_name, employee_number, order_id, invoice_number, amount, cashier_id, cashier_name, notes)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(employee_id, employee_name ?? "", employee_number ?? "", order_id ?? null, invoice_number ?? null, amount, user.id, user.name, notes ?? null);
  res.status(201).json(db.prepare("SELECT * FROM meal_deductions WHERE id=?").get(r.lastInsertRowid));
});
router15.get("/hr/employees/by-number/:num", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const emp = db.prepare(`
    SELECT e.*, d.name as department_name,
      (SELECT COALESCE(SUM(md.amount),0) FROM meal_deductions md WHERE md.employee_id=e.id AND strftime('%Y-%m', md.created_at)=strftime('%Y-%m','now')) as meal_deductions_this_month
    FROM hr_employees e LEFT JOIN hr_departments d ON d.id=e.department_id
    WHERE e.employee_number=? AND e.active=1
  `).get(req.params.num);
  if (!emp) {
    res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u063A\u064A\u0631 \u0646\u0634\u0637" });
    return;
  }
  res.json({ ...emp, active: Boolean(emp.active) });
});
router15.get("/hr/salary-statement/:employee_id/:month", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_id, month } = req.params;
  const emp = db.prepare(`
    SELECT e.*, d.name as department_name FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id=e.department_id WHERE e.id=?
  `).get(employee_id);
  if (!emp) {
    res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    return;
  }
  const salary = db.prepare("SELECT * FROM hr_salaries WHERE employee_id=? AND month=?").get(employee_id, month);
  const mealDeductions = db.prepare(`
    SELECT * FROM meal_deductions WHERE employee_id=? AND strftime('%Y-%m', created_at)=?
    ORDER BY created_at ASC
  `).all(employee_id, month);
  const mealTotal = mealDeductions.reduce((s, m) => s + m.amount, 0);
  const attendance = db.prepare(`
    SELECT status, COUNT(*) as count FROM hr_attendance
    WHERE employee_id=? AND strftime('%Y-%m', date)=?
    GROUP BY status
  `).all(employee_id, month);
  const businessSettings = db.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  businessSettings.forEach((s) => {
    settings[s.key] = s.value;
  });
  res.json({
    employee: { ...emp, active: Boolean(emp.active) },
    salary: salary ?? null,
    mealDeductions,
    mealTotal,
    attendance,
    settings
  });
});
router15.get("/hr/summary", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const totalEmployees = db.prepare("SELECT COUNT(*) as c FROM hr_employees WHERE active=1").get().c;
  const totalDepts = db.prepare("SELECT COUNT(*) as c FROM hr_departments").get().c;
  const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  const salariesThisMonth = db.prepare(`
    SELECT COALESCE(SUM(net_salary),0) as total, COUNT(*) as count,
           SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid_count
    FROM hr_salaries WHERE month=?
  `).get(currentMonth);
  const todayAttendance = db.prepare(`
    SELECT COUNT(*) as present FROM hr_attendance
    WHERE date=? AND status='present'
  `).get((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  res.json({
    totalEmployees,
    totalDepts,
    currentMonthSalaries: salariesThisMonth.total,
    currentMonthSalaryCount: salariesThisMonth.count,
    paidSalaries: salariesThisMonth.paid_count,
    todayPresent: todayAttendance.present
  });
});
var hr_default = router15;

// artifacts/api-server/src/routes/returns.ts
var import_express16 = require("express");
var router16 = (0, import_express16.Router)();
function requireAuth(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return null;
  }
  return user;
}
function requireAdmin2(req, res) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u0641\u0642\u0637" });
    return false;
  }
  return true;
}
router16.get("/returns", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { startDate, endDate, search } = req.query;
  let sql = `
    SELECT r.*, u.name as cashier_name, c.name as customer_name, app.name as approver_name
    FROM returns r
    LEFT JOIN users u ON u.id=r.user_id
    LEFT JOIN customers c ON c.id=r.customer_id
    LEFT JOIN users app ON app.id=r.approved_by
    WHERE 1=1
  `;
  const params = [];
  if (startDate) {
    sql += " AND DATE(r.created_at)>=?";
    params.push(startDate);
  }
  if (endDate) {
    sql += " AND DATE(r.created_at)<=?";
    params.push(endDate);
  }
  if (search) {
    sql += " AND (r.return_number LIKE ? OR r.invoice_number LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY r.created_at DESC";
  try {
    const rows = db.prepare(sql).all(...params);
    const result = rows.map((r) => {
      const items = db.prepare("SELECT * FROM return_items WHERE return_id=?").all(r.id);
      return { ...r, items };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router16.get("/returns/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  try {
    const row = db.prepare(`
      SELECT r.*, u.name as cashier_name, c.name as customer_name, app.name as approver_name
      FROM returns r
      LEFT JOIN users u ON u.id=r.user_id
      LEFT JOIN customers c ON c.id=r.customer_id
      LEFT JOIN users app ON app.id=r.approved_by
      WHERE r.id=?
    `).get(req.params.id);
    if (!row) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0631\u062A\u062C\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    row.items = db.prepare("SELECT * FROM return_items WHERE return_id=?").all(row.id);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router16.post("/returns", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { invoice_number, order_id, reason, payment_method, customer_id, notes, items, requires_approval } = req.body;
  if (!invoice_number || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0648\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0645\u0631\u062A\u062C\u0639\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" });
    return;
  }
  try {
    const total_refund = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const isAdmin = user.role === "admin" || user.role === "developer";
    const status = requires_approval || !isAdmin && total_refund > 5e3 ? "pending_approval" : "approved";
    const countRow = db.prepare("SELECT COUNT(*) as c FROM returns").get();
    const returnNum = `RET-${String(countRow.c + 1).padStart(4, "0")}-${Date.now().toString().slice(-6)}`;
    const approved_by = status === "approved" ? user.id : null;
    const approved_at = status === "approved" ? (/* @__PURE__ */ new Date()).toISOString() : null;
    const r = db.prepare(`
      INSERT INTO returns (return_number, invoice_number, order_id, reason, total_refund, payment_method, customer_id, user_id, notes, status, approved_by, approved_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      returnNum,
      invoice_number,
      order_id ?? null,
      reason ?? null,
      total_refund,
      payment_method ?? "cash",
      customer_id ?? null,
      user.id,
      notes ?? null,
      status,
      approved_by,
      approved_at
    );
    const returnId = r.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO return_items (return_id, product_id, product_name, quantity, unit_price, total)
      VALUES (?,?,?,?,?,?)
    `);
    let totalCostOfReturnedItems = 0;
    for (const item of items) {
      insertItem.run(returnId, item.product_id ?? null, item.product_name, item.quantity, item.unit_price, item.unit_price * item.quantity);
      if (status === "approved" && item.product_id) {
        db.prepare("UPDATE products SET stock = COALESCE(stock, 0) + ? WHERE id=?").run(item.quantity, item.product_id);
        const prod = db.prepare("SELECT cost FROM products WHERE id=?").get(item.product_id);
        if (prod && prod.cost) {
          totalCostOfReturnedItems += Number(prod.cost) * Number(item.quantity);
        }
      }
    }
    if (status === "approved") {
      try {
        const tax_refund = Math.round(total_refund * 0.15 / 1.15);
        const subtotal_refund = total_refund - tax_refund;
        const creditAccountCode = payment_method === "credit" ? "11200" : "11100";
        createDoubleEntryJournal(
          (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          `\u0645\u0631\u062A\u062C\u0639 \u0645\u0628\u064A\u0639\u0627\u062A \u0631\u0642\u0645 ${returnNum} \u0644\u0641\u0627\u062A\u0648\u0631\u0629 ${invoice_number}`,
          "return",
          returnId,
          [
            { account_code: "41000", debit: subtotal_refund, credit: 0, description: `\u0625\u0644\u063A\u0627\u0621 \u062C\u0632\u0621 \u0645\u0646 \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0644\u0641\u0627\u062A\u0648\u0631\u0629 ${invoice_number}` },
            { account_code: "21000", debit: tax_refund, credit: 0, description: `\u0639\u0643\u0633 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u062D\u062A\u0633\u0628\u0629` },
            { account_code: creditAccountCode, debit: 0, credit: total_refund, description: `\u0625\u0631\u062C\u0627\u0639 \u0627\u0644\u0642\u064A\u0645\u0629 \u0644\u0644\u0639\u0645\u064A\u0644 \u0639\u0628\u0631 ${payment_method}` }
          ]
        );
        if (totalCostOfReturnedItems > 0) {
          createDoubleEntryJournal(
            (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
            `\u062A\u0633\u0648\u064A\u0629 \u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0627\u0644\u0645\u0628\u0627\u0639\u0629 \u0648\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0644\u0645\u0631\u062A\u062C\u0639 ${returnNum}`,
            "return",
            returnId,
            [
              { account_code: "11300", debit: totalCostOfReturnedItems, credit: 0, description: `\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0644\u0644\u0645\u062E\u0632\u0648\u0646 \u0648\u0627\u0644\u0633\u0644\u0639` },
              { account_code: "51000", debit: 0, credit: totalCostOfReturnedItems, description: `\u062A\u062E\u0641\u064A\u0636 \u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0644\u0644\u0641\u062A\u0631\u0629` }
            ]
          );
        }
        if (payment_method === "credit" && customer_id) {
          db.prepare("UPDATE suppliers SET balance = balance - ? WHERE id=?").run(total_refund, customer_id);
        }
      } catch (jeErr) {
        console.error("Accounting journal error during return creation:", jeErr.message);
      }
    }
    logAudit(user.id, user.name, "\u062A\u0633\u062C\u064A\u0644 \u0645\u0631\u062A\u062C\u0639", `\u062A\u0633\u062C\u064A\u0644 \u0645\u0631\u062A\u062C\u0639 \u0631\u0642\u0645 ${returnNum} \u0644\u0641\u0627\u062A\u0648\u0631\u0629 ${invoice_number} \u0628\u0642\u064A\u0645\u0629 ${total_refund} [\u062D\u0627\u0644\u0629: ${status}]`);
    const created = db.prepare(`
      SELECT r.*, u.name as cashier_name FROM returns r
      LEFT JOIN users u ON u.id=r.user_id WHERE r.id=?
    `).get(returnId);
    created.items = db.prepare("SELECT * FROM return_items WHERE return_id=?").all(returnId);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router16.post("/returns/:id/approve", (req, res) => {
  if (!requireAdmin2(req, res)) return;
  const user = getAuthUser(req);
  try {
    const returnRow = db.prepare("SELECT * FROM returns WHERE id=?").get(req.params.id);
    if (!returnRow) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0631\u062A\u062C\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (returnRow.status === "approved") {
      res.status(400).json({ error: "\u0627\u0644\u0645\u0631\u062A\u062C\u0639 \u0645\u0639\u062A\u0645\u062F \u0648\u0645\u0643\u062A\u0645\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
      return;
    }
    const items = db.prepare("SELECT * FROM return_items WHERE return_id=?").all(returnRow.id);
    let totalCostOfReturnedItems = 0;
    for (const item of items) {
      if (item.product_id) {
        db.prepare("UPDATE products SET stock = COALESCE(stock, 0) + ? WHERE id=?").run(item.quantity, item.product_id);
        const prod = db.prepare("SELECT cost FROM products WHERE id=?").get(item.product_id);
        if (prod && prod.cost) {
          totalCostOfReturnedItems += Number(prod.cost) * Number(item.quantity);
        }
      }
    }
    db.prepare("UPDATE returns SET status='approved', approved_by=?, approved_at=datetime('now') WHERE id=?").run(user.id, returnRow.id);
    try {
      const total_refund = returnRow.total_refund;
      const tax_refund = Math.round(total_refund * 0.15 / 1.15);
      const subtotal_refund = total_refund - tax_refund;
      const creditAccountCode = returnRow.payment_method === "credit" ? "11200" : "11100";
      createDoubleEntryJournal(
        (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        `\u0645\u0631\u062A\u062C\u0639 \u0645\u0628\u064A\u0639\u0627\u062A \u0631\u0642\u0645 ${returnRow.return_number} \u0644\u0641\u0627\u062A\u0648\u0631\u0629 ${returnRow.invoice_number}`,
        "return",
        returnRow.id,
        [
          { account_code: "41000", debit: subtotal_refund, credit: 0, description: `\u0625\u0644\u063A\u0627\u0621 \u062C\u0632\u0621 \u0645\u0646 \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0644\u0641\u0627\u062A\u0648\u0631\u0629 ${returnRow.invoice_number}` },
          { account_code: "21000", debit: tax_refund, credit: 0, description: `\u0639\u0643\u0633 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u062D\u062A\u0633\u0628\u0629` },
          { account_code: creditAccountCode, debit: 0, credit: total_refund, description: `\u0625\u0631\u062C\u0627\u0639 \u0627\u0644\u0642\u064A\u0645\u0629 \u0644\u0644\u0639\u0645\u064A\u0644 \u0639\u0628\u0631 ${returnRow.payment_method}` }
        ]
      );
      if (totalCostOfReturnedItems > 0) {
        createDoubleEntryJournal(
          (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          `\u062A\u0633\u0648\u064A\u0629 \u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0627\u0644\u0645\u0628\u0627\u0639\u0629 \u0648\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0644\u0645\u0631\u062A\u062C\u0639 ${returnRow.return_number}`,
          "return",
          returnRow.id,
          [
            { account_code: "11300", debit: totalCostOfReturnedItems, credit: 0, description: `\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0644\u0644\u0645\u062E\u0632\u0648\u0646 \u0648\u0627\u0644\u0633\u0644\u0639` },
            { account_code: "51000", debit: 0, credit: totalCostOfReturnedItems, description: `\u062A\u062E\u0641\u064A\u0636 \u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0644\u0644\u0641\u062A\u0631\u0629` }
          ]
        );
      }
    } catch (jeErr) {
      console.error("Accounting journal error during return approval:", jeErr.message);
    }
    logAudit(user.id, user.name, "\u0627\u0639\u062A\u0645\u0627\u062F \u0645\u0631\u062A\u062C\u0639", `\u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u0631\u062A\u062C\u0639 \u0631\u0642\u0645 ${returnRow.return_number} \u0628\u0642\u064A\u0645\u0629 ${returnRow.total_refund} \u0648\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0628\u0636\u0627\u0626\u0639 \u0644\u0644\u0645\u062E\u0627\u0632\u0646`);
    res.json({ success: true, status: "approved" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router16.delete("/returns/:id", (req, res) => {
  if (!requireAdmin2(req, res)) return;
  const user = getAuthUser(req);
  try {
    const row = db.prepare("SELECT * FROM returns WHERE id=?").get(req.params.id);
    if (!row) {
      res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const returnItems = db.prepare("SELECT * FROM return_items WHERE return_id=?").all(row.id);
    if (row.status === "approved") {
      for (const item of returnItems) {
        if (item.product_id) {
          db.prepare("UPDATE products SET stock = MAX(0, COALESCE(stock, 0) - ?) WHERE id=?").run(item.quantity, item.product_id);
        }
      }
    }
    db.prepare("DELETE FROM returns WHERE id=?").run(req.params.id);
    logAudit(user.id, user.name, "\u062D\u0630\u0641 \u0645\u0631\u062A\u062C\u0639", `\u062D\u0630\u0641 \u0645\u0631\u062A\u062C\u0639 \u0631\u0642\u0645 ${row.return_number}`);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router16.get("/returns-summary", (req, res) => {
  if (!requireAdmin2(req, res)) return;
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  try {
    const todayStats = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_refund),0) as total FROM returns WHERE DATE(created_at)=?").get(today);
    const monthStats = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_refund),0) as total FROM returns WHERE DATE(created_at)>=?").get(monthStart);
    const totalCount = db.prepare("SELECT COUNT(*) as c FROM returns").get().c;
    res.json({
      todayCount: todayStats.count,
      todayTotal: todayStats.total,
      monthCount: monthStats.count,
      monthTotal: monthStats.total,
      totalCount
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router16.get("/orders/lookup", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { q } = req.query;
  if (!q) {
    res.status(400).json({ error: "\u0645\u0637\u0644\u0648\u0628 \u0645\u0639\u064A\u0627\u0631 \u0627\u0644\u0628\u062D\u062B" });
    return;
  }
  const qStr = String(q).trim();
  const cleanQ = qStr.replace(/^(inv-?|INV-?)/i, "").replace(/^0+/, "") || "0";
  const likePattern = `%${cleanQ}%`;
  try {
    const orderRows = db.prepare(`
      SELECT o.*, u.name as user_name, c.name as customer_name
      FROM orders o
      LEFT JOIN users u ON u.id=o.user_id
      LEFT JOIN customers c ON c.id=o.customer_id
      WHERE o.invoice_number = ?
         OR o.invoice_number = ?
         OR CAST(o.id AS TEXT) = ?
         OR COALESCE(NULLIF(LTRIM(REPLACE(REPLACE(LOWER(o.invoice_number), 'inv-', ''), 'inv', ''), '0'), ''), '0') = ?
         OR (o.invoice_number LIKE ? AND ? <> '')
      ORDER BY o.created_at DESC
      LIMIT 50
    `).all(
      qStr,
      cleanQ,
      qStr,
      cleanQ,
      likePattern,
      cleanQ
    );
    const results = orderRows.map((orderRow) => {
      const items = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(orderRow.id);
      const existingReturns = db.prepare(`
        SELECT id, return_number, total_refund, created_at, status 
        FROM returns 
        WHERE order_id=? OR invoice_number=?
      `).all(orderRow.id, orderRow.invoice_number);
      const returnedQtyRows = db.prepare(`
        SELECT product_id, SUM(quantity) as returned_qty
        FROM return_items ri
        JOIN returns r ON r.id = ri.return_id
        WHERE r.order_id = ? OR r.invoice_number = ?
        GROUP BY product_id
      `).all(orderRow.id, orderRow.invoice_number);
      const returnedQtyMap = {};
      for (const row of returnedQtyRows) {
        if (row.product_id) {
          returnedQtyMap[row.product_id] = Number(row.returned_qty || 0);
        }
      }
      const itemsWithQty = items.map((i) => {
        const returnedQuantity = returnedQtyMap[i.product_id] || 0;
        const remainingQuantity = Math.max(0, i.quantity - returnedQuantity);
        return {
          id: i.id,
          productId: i.product_id,
          productName: i.product_name,
          quantity: i.quantity,
          returnedQuantity,
          remainingQuantity,
          unitPrice: i.unit_price,
          total: i.total,
          categoryId: i.category_id,
          categoryName: i.category_name
        };
      });
      const fullyReturned = itemsWithQty.length > 0 && itemsWithQty.every((item) => item.remainingQuantity <= 0);
      return {
        id: orderRow.id,
        invoiceNumber: orderRow.invoice_number,
        total: orderRow.total,
        subtotal: orderRow.subtotal,
        discount: orderRow.discount,
        tax: orderRow.tax,
        paymentMethod: orderRow.payment_method,
        orderType: orderRow.order_type,
        tableNumber: orderRow.table_number,
        note: orderRow.note,
        createdAt: orderRow.created_at,
        cashierName: orderRow.user_name,
        userId: orderRow.user_id,
        customerName: orderRow.customer_name,
        alreadyReturned: existingReturns.length > 0,
        existingReturns,
        fullyReturned,
        items: itemsWithQty
      };
    });
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router16.get("/cashier-boxes", (req, res) => {
  if (!requireAdmin2(req, res)) return;
  const { date } = req.query;
  const filterDate = date ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  try {
    let cashiers = db.prepare(`
      SELECT u.id, u.name, u.role,
        COALESCE(SUM(o.total),0) as orders_total,
        COUNT(o.id) as orders_count
      FROM users u
      LEFT JOIN orders o ON o.user_id=u.id AND DATE(o.created_at)=?
      WHERE u.active=1
      GROUP BY u.id, u.name, u.role
      ORDER BY u.name
    `).all(filterDate);
    const user = getAuthUser(req);
    if (user && user.role !== "developer") {
      cashiers = cashiers.filter((c) => c.role !== "developer");
    }
    const returns_ = db.prepare(`
      SELECT o.user_id,
        COALESCE(SUM(r.total_refund),0) as returns_total,
        COUNT(r.id) as returns_count
      FROM returns r
      LEFT JOIN orders o ON o.id=r.order_id
      WHERE DATE(r.created_at)=?
      GROUP BY o.user_id
    `).all(filterDate);
    const returnsMap = new Map(returns_.map((r) => [r.user_id, r]));
    const mainTotal = cashiers.reduce((s, c) => s + c.orders_total, 0);
    const mainReturns = returns_.reduce((s, r) => s + r.returns_total, 0);
    res.json({
      date: filterDate,
      mainBox: { total: mainTotal, returnsTotal: mainReturns, net: mainTotal - mainReturns },
      cashiers: cashiers.map((c) => {
        const ret = returnsMap.get(c.id);
        return {
          userId: c.id,
          name: c.name,
          ordersTotal: c.orders_total,
          ordersCount: c.orders_count,
          returnsTotal: ret?.returns_total ?? 0,
          returnsCount: ret?.returns_count ?? 0,
          net: c.orders_total - (ret?.returns_total ?? 0)
        };
      })
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router16.get("/returns/categories-analytics", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  try {
    const rows = db.prepare(`
      SELECT 
        c.id, 
        c.name, 
        c.color,
        COALESCE(c.cost, 0) as cost, 
        COALESCE(c.revenue, 0) as revenue,
        COALESCE(SUM(ri.total), 0) as total_returned_amount,
        COALESCE(SUM(ri.quantity), 0) as total_returned_qty
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      LEFT JOIN return_items ri ON ri.product_id = p.id
      LEFT JOIN returns r ON r.id = ri.return_id AND r.status = 'approved'
      GROUP BY c.id
      ORDER BY c.name
    `).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
var returns_default = router16;

// artifacts/api-server/src/routes/accounting.ts
var import_express17 = require("express");
var router17 = (0, import_express17.Router)();
function requireAdmin3(req, res) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return false;
  }
  return true;
}
router17.get("/accounting/vouchers", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  const { type, party_type, party_id, search } = req.query;
  let sql = "SELECT * FROM vouchers WHERE 1=1";
  const params = [];
  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }
  if (party_type) {
    sql += " AND party_type = ?";
    params.push(party_type);
  }
  if (party_id) {
    sql += " AND party_id = ?";
    params.push(party_id);
  }
  if (search) {
    sql += " AND (voucher_number LIKE ? OR party_name LIKE ? OR received_from LIKE ? OR payment_against LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY id DESC";
  try {
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router17.get("/accounting/vouchers/:id", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  try {
    const row = db.prepare("SELECT * FROM vouchers WHERE id = ?").get(req.params.id);
    if (!row) {
      res.status(404).json({ error: "\u0627\u0644\u0633\u0646\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router17.post("/accounting/vouchers", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  const {
    type,
    party_type,
    party_id,
    party_name,
    amount,
    currency,
    received_from,
    payment_against,
    payment_method,
    amount_text,
    notes,
    header_title,
    header_subtitle,
    logo_url,
    accent_color,
    bottom_text,
    safe_id
  } = req.body;
  let finalPartyName = party_name;
  if (!finalPartyName && party_id) {
    if (party_type === "employee") {
      const emp = db.prepare("SELECT name FROM hr_employees WHERE id = ?").get(party_id);
      if (emp) finalPartyName = emp.name;
    } else if (party_type === "customer") {
      const cust = db.prepare("SELECT name FROM customers WHERE id = ?").get(party_id);
      if (cust) finalPartyName = cust.name;
    }
  }
  if (!type || !party_type || !party_id || !finalPartyName || amount === void 0) {
    res.status(400).json({ error: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0645\u0637\u0644\u0648\u0628\u0629 (\u0627\u0644\u0646\u0648\u0639\u060C \u0627\u0644\u0641\u0626\u0629\u060C \u0627\u0644\u0637\u0631\u0641\u060C \u0627\u0644\u0645\u0628\u0644\u063A)" });
    return;
  }
  try {
    const countRow = db.prepare("SELECT COUNT(*) as c FROM vouchers").get();
    const nextNum = String(countRow.c + 1);
    let finalSafeId = safe_id;
    if (!finalSafeId) {
      const defaultSafe = db.prepare("SELECT id FROM safes WHERE name = '\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A' LIMIT 1").get();
      if (defaultSafe) finalSafeId = defaultSafe.id;
    }
    const r = db.prepare(`
      INSERT INTO vouchers (
        voucher_number, type, party_type, party_id, party_name, amount, currency,
        received_from, payment_against, payment_method, amount_text, notes,
        header_title, header_subtitle, logo_url, accent_color, bottom_text, safe_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nextNum,
      type,
      party_type,
      party_id,
      finalPartyName,
      amount,
      currency ?? "\u062F\u064A\u0646\u0627\u0631",
      received_from ?? "",
      payment_against ?? "",
      payment_method ?? "cash",
      amount_text ?? "",
      notes ?? "",
      header_title ?? "\u0645\u062E\u0627\u0628\u0632 \u0627\u0644\u0634\u0627\u0645 \u0644\u0644\u062E\u0628\u0632 \u0627\u0644\u0639\u0631\u0628\u064A",
      header_subtitle ?? "Maamil Al Sham",
      logo_url ?? "/omnisystem-logo.png",
      accent_color ?? "#ef4444",
      bottom_text ?? "\u062C\u0648\u062F\u0629 \u0627\u0644\u062E\u0628\u0632 ... \u0633\u0631 \u062B\u0642\u0629 \u0639\u0645\u0644\u0627\u0626\u0646\u0627",
      finalSafeId ?? null
    );
    const voucherId = r.lastInsertRowid;
    if (finalSafeId) {
      if (type === "receipt") {
        db.prepare("UPDATE safes SET balance = balance + ? WHERE id = ?").run(amount, finalSafeId);
      } else if (type === "payment") {
        db.prepare("UPDATE safes SET balance = balance - ? WHERE id = ?").run(amount, finalSafeId);
      }
    }
    try {
      const safeRecord = finalSafeId ? db.prepare("SELECT name FROM safes WHERE id = ?").get(finalSafeId) : null;
      const safeName = safeRecord ? safeRecord.name : "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A";
      const safeAccountCode = "11100";
      const partyAccountCode = party_type === "customer" ? "11200" : "21200";
      const lines = [];
      if (type === "receipt") {
        lines.push({ account_code: safeAccountCode, debit: amount, credit: 0, description: `\u0627\u0633\u062A\u0644\u0627\u0645 \u062F\u0641\u0639\u0629 \u0645\u0646 ${finalPartyName} \u0639\u0628\u0631 ${payment_method}` });
        lines.push({ account_code: partyAccountCode, debit: 0, credit: amount, description: `\u0633\u062F\u0627\u062F \u062D\u0633\u0627\u0628 \u0645\u0646 ${finalPartyName}` });
      } else {
        lines.push({ account_code: partyAccountCode, debit: amount, credit: 0, description: `\u062F\u0641\u0639\u0629 \u0625\u0644\u0649 ${finalPartyName}` });
        lines.push({ account_code: safeAccountCode, debit: 0, credit: amount, description: `\u0635\u0631\u0641 \u0646\u0642\u062F\u064A \u0645\u0646 ${safeName} \u0625\u0644\u0649 ${finalPartyName}` });
      }
      createDoubleEntryJournal(
        (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        `\u0633\u0646\u062F ${type === "receipt" ? "\u0642\u0628\u0636" : "\u0635\u0631\u0641"} \u0631\u0642\u0645 ${nextNum} - \u0627\u0644\u0637\u0631\u0641: ${finalPartyName}`,
        "voucher",
        voucherId,
        lines
      );
    } catch (journalErr) {
      console.error("Failed to generate double entry for voucher:", journalErr.message);
    }
    const created = db.prepare("SELECT * FROM vouchers WHERE id = ?").get(voucherId);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router17.put("/accounting/vouchers/:id", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  const {
    voucher_number,
    type,
    party_type,
    party_id,
    party_name,
    amount,
    currency,
    received_from,
    payment_against,
    payment_method,
    amount_text,
    notes,
    header_title,
    header_subtitle,
    logo_url,
    accent_color,
    bottom_text,
    created_at
  } = req.body;
  try {
    db.prepare(`
      UPDATE vouchers
      SET voucher_number = ?, type = ?, party_type = ?, party_id = ?, party_name = ?, amount = ?, currency = ?,
          received_from = ?, payment_against = ?, payment_method = ?, amount_text = ?, notes = ?,
          header_title = ?, header_subtitle = ?, logo_url = ?, accent_color = ?, bottom_text = ?, created_at = ?
      WHERE id = ?
    `).run(
      voucher_number,
      type,
      party_type,
      party_id,
      party_name,
      amount,
      currency ?? "\u062F\u064A\u0646\u0627\u0631",
      received_from ?? "",
      payment_against ?? "",
      payment_method ?? "cash",
      amount_text ?? "",
      notes ?? "",
      header_title ?? "\u0645\u062E\u0627\u0628\u0632 \u0627\u0644\u0634\u0627\u0645 \u0644\u0644\u062E\u0628\u0632 \u0627\u0644\u0639\u0631\u0628\u064A",
      header_subtitle ?? "Maamil Al Sham",
      logo_url ?? "/omnisystem-logo.png",
      accent_color ?? "#ef4444",
      bottom_text ?? "\u062C\u0648\u062F\u0629 \u0627\u0644\u062E\u0628\u0632 ... \u0633\u0631 \u062B\u0642\u0629 \u0639\u0645\u0644\u0627\u0626\u0646\u0627",
      created_at ?? (/* @__PURE__ */ new Date()).toISOString(),
      req.params.id
    );
    const updated = db.prepare("SELECT * FROM vouchers WHERE id = ?").get(req.params.id);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router17.delete("/accounting/vouchers/:id", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  try {
    const voucher = db.prepare("SELECT type, amount, safe_id FROM vouchers WHERE id = ?").get(req.params.id);
    if (voucher && voucher.safe_id) {
      if (voucher.type === "receipt") {
        db.prepare("UPDATE safes SET balance = balance - ? WHERE id = ?").run(voucher.amount, voucher.safe_id);
      } else if (voucher.type === "payment") {
        db.prepare("UPDATE safes SET balance = balance + ? WHERE id = ?").run(voucher.amount, voucher.safe_id);
      }
    }
    db.prepare("DELETE FROM vouchers WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router17.get("/accounting/accounts", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  try {
    const accounts = db.prepare("SELECT * FROM accounts ORDER BY code ASC").all();
    res.json(accounts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router17.post("/accounting/accounts", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  const { code, name, type, parent_code } = req.body;
  if (!code || !name || !type) {
    res.status(400).json({ error: "\u0627\u0644\u0631\u0645\u0632 \u0648\u0627\u0644\u0627\u0633\u0645 \u0648\u0646\u0648\u0639 \u0627\u0644\u062D\u0633\u0627\u0628 \u062D\u0642\u0648\u0644 \u0625\u062C\u0628\u0627\u0631\u064A\u0629" });
    return;
  }
  try {
    const existing = db.prepare("SELECT id FROM accounts WHERE code = ?").get(code);
    if (existing) {
      res.status(400).json({ error: "\u0631\u0645\u0632 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B! \u0627\u0644\u0631\u062C\u0627\u0621 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0631\u0645\u0632 \u0641\u0631\u064A\u062F." });
      return;
    }
    const r = db.prepare(`
      INSERT INTO accounts (code, name, type, parent_code, balance, active)
      VALUES (?, ?, ?, ?, 0.0, 1)
    `).run(code, name, type, parent_code ?? null);
    res.status(201).json({
      id: r.lastInsertRowid,
      code,
      name,
      type,
      parent_code,
      balance: 0,
      active: 1
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router17.get("/accounting/journal-entries", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  try {
    const entries = db.prepare("SELECT * FROM journal_entries ORDER BY id DESC").all();
    for (const entry of entries) {
      entry.lines = db.prepare(`
        SELECT l.*, a.code as account_code, a.name as account_name, a.type as account_type
        FROM journal_entry_lines l
        JOIN accounts a ON a.id = l.account_id
        WHERE l.journal_entry_id = ?
      `).all(entry.id);
    }
    res.json(entries);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router17.get("/accounting/trial-balance", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  try {
    const accounts = db.prepare("SELECT * FROM accounts ORDER BY code ASC").all();
    let totalDebit = 0;
    let totalCredit = 0;
    const balanceSheet = accounts.map((acc) => {
      const isDebitNormal = ["asset", "expense", "cogs", "wastage"].includes(acc.type);
      let debit = 0;
      let credit = 0;
      if (acc.balance >= 0) {
        if (isDebitNormal) {
          debit = acc.balance;
        } else {
          credit = acc.balance;
        }
      } else {
        if (isDebitNormal) {
          credit = Math.abs(acc.balance);
        } else {
          debit = Math.abs(acc.balance);
        }
      }
      totalDebit += debit;
      totalCredit += credit;
      return {
        ...acc,
        debit,
        credit
      };
    });
    res.json({
      accounts: balanceSheet,
      totalDebit,
      totalCredit
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router17.post("/accounting/manual-entries", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  const { party_type, party_id, entry_date, description, debit, credit, notes } = req.body;
  if (!party_type || !party_id || !entry_date || !description) {
    res.status(400).json({ error: "\u062C\u0645\u064A\u0639 \u062D\u0642\u0648\u0644 \u0627\u0644\u0642\u064A\u062F \u0627\u0644\u064A\u062F\u0648\u064A \u0645\u0637\u0644\u0648\u0628\u0629 (\u0627\u0644\u0637\u0631\u0641\u060C \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u060C \u0627\u0644\u0628\u064A\u0627\u0646)" });
    return;
  }
  try {
    const r = db.prepare(`
      INSERT INTO manual_ledger_entries (party_type, party_id, entry_date, description, debit, credit, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      party_type,
      party_id,
      entry_date,
      description,
      debit ?? 0,
      credit ?? 0,
      notes ?? ""
    );
    const created = db.prepare("SELECT * FROM manual_ledger_entries WHERE id = ?").get(r.lastInsertRowid);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router17.delete("/accounting/manual-entries/:id", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  try {
    db.prepare("DELETE FROM manual_ledger_entries WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router17.get("/accounting/statement/:party_type/:party_id", (req, res) => {
  if (!requireAdmin3(req, res)) return;
  const { party_type, party_id } = req.params;
  const { start_date, end_date } = req.query;
  try {
    let partyInfo = null;
    if (party_type === "employee") {
      partyInfo = db.prepare(`
        SELECT e.*, d.name as department_name 
        FROM hr_employees e 
        LEFT JOIN hr_departments d ON d.id = e.department_id 
        WHERE e.id = ?
      `).get(party_id);
    } else {
      partyInfo = db.prepare("SELECT * FROM customers WHERE id = ?").get(party_id);
    }
    if (!partyInfo) {
      res.status(404).json({ error: "\u0627\u0644\u0637\u0631\u0641 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const transactions = [];
    if (party_type === "customer") {
      const orders = db.prepare(`
        SELECT id, invoice_number, total, created_at, note
        FROM orders
        WHERE customer_id = ?
      `).all(party_id);
      orders.forEach((o) => {
        const cleanInvNum = o.invoice_number.replace(/^INV-0*/, "") || "0";
        transactions.push({
          date: o.created_at.slice(0, 10),
          datetime: o.created_at,
          description: `\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A \u0631\u0642\u0645 ${cleanInvNum}`,
          debit: o.total,
          // Client owes us
          credit: 0,
          source: "order",
          source_id: o.id,
          notes: o.note ?? ""
        });
      });
      const returns = db.prepare(`
        SELECT id, return_number, total_refund, created_at, notes
        FROM returns
        WHERE customer_id = ?
      `).all(party_id);
      returns.forEach((r) => {
        const cleanRetNum = r.return_number;
        transactions.push({
          date: r.created_at.slice(0, 10),
          datetime: r.created_at,
          description: `\u0645\u0631\u062A\u062C\u0639 \u0645\u0628\u064A\u0639\u0627\u062A \u0631\u0642\u0645 ${cleanRetNum}`,
          debit: 0,
          credit: r.total_refund,
          // Reduces what client owes
          source: "return",
          source_id: r.id,
          notes: r.notes ?? ""
        });
      });
    } else if (party_type === "employee") {
      const salaries = db.prepare(`
        SELECT id, month, basic_salary, bonuses, deductions, net_salary, notes, created_at
        FROM hr_salaries
        WHERE employee_id = ?
      `).all(party_id);
      salaries.forEach((s) => {
        transactions.push({
          date: s.created_at ? s.created_at.slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          datetime: s.created_at ?? (/* @__PURE__ */ new Date()).toISOString(),
          description: `\u0631\u0627\u062A\u0628 \u0634\u0647\u0631 ${s.month} (\u0645\u0633\u062A\u062D\u0642)`,
          debit: 0,
          credit: s.basic_salary + s.bonuses,
          // Business owes employee
          source: "salary_earned",
          source_id: s.id,
          notes: s.notes ?? ""
        });
        if (s.deductions > 0) {
          transactions.push({
            date: s.created_at ? s.created_at.slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
            datetime: s.created_at ?? (/* @__PURE__ */ new Date()).toISOString(),
            description: `\u0627\u0633\u062A\u0642\u0637\u0627\u0639\u0627\u062A \u0645\u0646 \u0631\u0627\u062A\u0628 \u0634\u0647\u0631 ${s.month}`,
            debit: s.deductions,
            // Reduces what business owes
            credit: 0,
            source: "salary_deduction",
            source_id: s.id,
            notes: s.notes ?? ""
          });
        }
      });
      const mealDeductions = db.prepare(`
        SELECT id, amount, notes, created_at, invoice_number
        FROM meal_deductions
        WHERE employee_id = ?
      `).all(party_id);
      mealDeductions.forEach((m) => {
        const cleanInv = m.invoice_number ? m.invoice_number.replace(/^INV-0*/, "") : "";
        transactions.push({
          date: m.created_at.slice(0, 10),
          datetime: m.created_at,
          description: `\u062E\u0635\u0645 \u0648\u062C\u0628\u0627\u062A \u0643\u0627\u0634\u064A\u0631 \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 ${cleanInv}`,
          debit: m.amount,
          // Deducted from employee
          credit: 0,
          source: "meal_deduction",
          source_id: m.id,
          notes: m.notes ?? ""
        });
      });
    }
    const vouchers = db.prepare(`
      SELECT id, voucher_number, type, amount, created_at, payment_against, notes, currency
      FROM vouchers
      WHERE party_type = ? AND party_id = ?
    `).all(party_type, party_id);
    vouchers.forEach((v) => {
      let debit = 0;
      let credit = 0;
      let desc = "";
      if (v.type === "receipt") {
        credit = v.amount;
        desc = `\u0633\u0646\u062F \u0642\u0628\u0636 \u0631\u0642\u0645 ${v.voucher_number}${v.payment_against ? ` - ${v.payment_against}` : ""}`;
      } else {
        debit = v.amount;
        desc = `\u0633\u0646\u062F \u0635\u0631\u0641 \u0631\u0642\u0645 ${v.voucher_number}${v.payment_against ? ` - ${v.payment_against}` : ""}`;
      }
      transactions.push({
        date: v.created_at.slice(0, 10),
        datetime: v.created_at,
        description: desc,
        debit,
        credit,
        source: "voucher",
        source_id: v.id,
        notes: v.notes ?? ""
      });
    });
    const manualEntries = db.prepare(`
      SELECT id, entry_date, description, debit, credit, notes, created_at
      FROM manual_ledger_entries
      WHERE party_type = ? AND party_id = ?
    `).all(party_type, party_id);
    manualEntries.forEach((me) => {
      transactions.push({
        date: me.entry_date,
        datetime: me.created_at,
        description: me.description,
        debit: me.debit,
        credit: me.credit,
        source: "manual",
        source_id: me.id,
        notes: me.notes ?? ""
      });
    });
    transactions.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.datetime.localeCompare(b.datetime);
    });
    let previousBalance = 0;
    let runningBalance = 0;
    const filteredTransactions = [];
    let totalDebitInPeriod = 0;
    let totalCreditInPeriod = 0;
    transactions.forEach((t) => {
      const change = party_type === "customer" ? t.debit - t.credit : t.credit - t.debit;
      if (start_date && t.date < start_date) {
        previousBalance += change;
      } else if (end_date && t.date > end_date) {
        runningBalance += change;
      } else {
        if (filteredTransactions.length === 0) {
          runningBalance = previousBalance + change;
        } else {
          runningBalance += change;
        }
        totalDebitInPeriod += t.debit;
        totalCreditInPeriod += t.credit;
        filteredTransactions.push({
          ...t,
          running_balance: runningBalance
        });
      }
    });
    if (filteredTransactions.length === 0) {
      runningBalance = previousBalance;
    }
    res.json({
      party: partyInfo,
      previousBalance,
      currentBalance: runningBalance,
      totalDebit: totalDebitInPeriod,
      totalCredit: totalCreditInPeriod,
      netChange: party_type === "customer" ? totalDebitInPeriod - totalCreditInPeriod : totalCreditInPeriod - totalDebitInPeriod,
      transactions: filteredTransactions
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
var accounting_default = router17;

// artifacts/api-server/src/routes/branches.ts
var import_express18 = require("express");
var router18 = (0, import_express18.Router)();
function requireAdmin4(req, res) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return false;
  }
  return true;
}
router18.get("/branches", (req, res) => {
  const branches = db.prepare("SELECT * FROM branches ORDER BY name").all();
  res.json(branches);
});
router18.post("/branches", (req, res) => {
  if (!requireAdmin4(req, res)) return;
  const user = getAuthUser(req);
  const { name, address, phone } = req.body;
  if (!name) {
    res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u0639 \u0645\u0637\u0644\u0648\u0628" });
    return;
  }
  const r = db.prepare("INSERT INTO branches (name, address, phone) VALUES (?,?,?)").run(name, address ?? null, phone ?? null);
  logAudit(user.id, user.name, "\u0625\u0636\u0627\u0641\u0629 \u0641\u0631\u0639", `\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0641\u0631\u0639: ${name}`);
  res.status(201).json({ id: r.lastInsertRowid, name, address, phone, active: 1 });
});
router18.delete("/branches/:id", (req, res) => {
  if (!requireAdmin4(req, res)) return;
  const user = getAuthUser(req);
  db.prepare("DELETE FROM branches WHERE id=?").run(req.params.id);
  logAudit(user.id, user.name, "\u062D\u0630\u0641 \u0641\u0631\u0639", `\u0631\u0642\u0645 \u0627\u0644\u0641\u0631\u0639: ${req.params.id}`);
  res.status(204).send();
});
router18.get("/warehouses", (req, res) => {
  const warehouses = db.prepare(`
    SELECT w.*, b.name as branch_name 
    FROM warehouses w 
    LEFT JOIN branches b ON b.id = w.branch_id 
    ORDER BY w.name
  `).all();
  res.json(warehouses);
});
router18.post("/warehouses", (req, res) => {
  if (!requireAdmin4(req, res)) return;
  const user = getAuthUser(req);
  const { branch_id, name, location } = req.body;
  if (!name) {
    res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u0648\u062F\u0639 \u0645\u0637\u0644\u0648\u0628" });
    return;
  }
  const r = db.prepare("INSERT INTO warehouses (branch_id, name, location) VALUES (?,?,?)").run(branch_id ?? null, name, location ?? null);
  logAudit(user.id, user.name, "\u0625\u0636\u0627\u0641\u0629 \u0645\u0633\u062A\u0648\u062F\u0639", `\u0645\u0633\u062A\u0648\u062F\u0639: ${name}`);
  res.status(201).json({ id: r.lastInsertRowid, branch_id, name, location, active: 1 });
});
router18.delete("/warehouses/:id", (req, res) => {
  if (!requireAdmin4(req, res)) return;
  const user = getAuthUser(req);
  db.prepare("DELETE FROM warehouses WHERE id=?").run(req.params.id);
  logAudit(user.id, user.name, "\u062D\u0630\u0641 \u0645\u0633\u062A\u0648\u062F\u0639", `\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062A\u0648\u062F\u0639: ${req.params.id}`);
  res.status(204).send();
});
var branches_default = router18;

// artifacts/api-server/src/routes/suppliers.ts
var import_express19 = require("express");
var router19 = (0, import_express19.Router)();
function requireAdmin5(req, res) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return false;
  }
  return true;
}
router19.get("/suppliers", (req, res) => {
  const suppliers = db.prepare("SELECT * FROM suppliers ORDER BY name").all();
  res.json(suppliers);
});
router19.post("/suppliers", (req, res) => {
  if (!requireAdmin5(req, res)) return;
  const user = getAuthUser(req);
  const { name, phone, email, address, rating } = req.body;
  if (!name) {
    res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0631\u062F \u0645\u0637\u0644\u0648\u0628" });
    return;
  }
  const r = db.prepare("INSERT INTO suppliers (name, phone, email, address, rating) VALUES (?,?,?,?,?)").run(name, phone ?? null, email ?? null, address ?? null, rating ?? 5);
  logAudit(user.id, user.name, "\u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0631\u062F", `\u0645\u0648\u0631\u062F: ${name}`);
  res.status(201).json({ id: r.lastInsertRowid, name, phone, email, address, rating: rating ?? 5, balance: 0 });
});
router19.put("/suppliers/:id", (req, res) => {
  if (!requireAdmin5(req, res)) return;
  const user = getAuthUser(req);
  const { name, phone, email, address, rating } = req.body;
  db.prepare("UPDATE suppliers SET name=?, phone=?, email=?, address=?, rating=? WHERE id=?").run(name, phone, email, address, rating, req.params.id);
  logAudit(user.id, user.name, "\u062A\u0639\u062F\u064A\u0644 \u0645\u0648\u0631\u062F", `\u0631\u0642\u0645 \u0627\u0644\u0645\u0648\u0631\u062F: ${req.params.id}`);
  res.json({ success: true });
});
router19.delete("/suppliers/:id", (req, res) => {
  if (!requireAdmin5(req, res)) return;
  const user = getAuthUser(req);
  db.prepare("DELETE FROM suppliers WHERE id=?").run(req.params.id);
  logAudit(user.id, user.name, "\u062D\u0630\u0641 \u0645\u0648\u0631\u062F", `\u0631\u0642\u0645 \u0627\u0644\u0645\u0648\u0631\u062F: ${req.params.id}`);
  res.status(204).send();
});
var suppliers_default = router19;

// artifacts/api-server/src/routes/purchases.ts
var import_express20 = require("express");
var router20 = (0, import_express20.Router)();
function requireAuth2(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return null;
  }
  return user;
}
router20.get("/purchases", (req, res) => {
  const user = requireAuth2(req, res);
  if (!user) return;
  const purchases = db.prepare(`
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    ORDER BY po.created_at DESC
  `).all();
  const result = purchases.map((p) => ({
    ...p,
    items: db.prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id=?").all(p.id)
  }));
  res.json(result);
});
router20.post("/purchases", (req, res) => {
  const user = requireAuth2(req, res);
  if (!user) return;
  const { supplier_id, items, notes } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "\u0639\u0646\u0627\u0635\u0631 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u0645\u0637\u0644\u0648\u0628\u0629" });
    return;
  }
  const total = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
  const countRow = db.prepare("SELECT COUNT(*) as c FROM purchase_orders").get();
  const poNum = `PO-${String(countRow.c + 1).padStart(4, "0")}`;
  const r = db.prepare("INSERT INTO purchase_orders (po_number, supplier_id, status, total, notes) VALUES (?,?,?,?,?)").run(poNum, supplier_id ?? null, "received", total, notes ?? null);
  const poId = r.lastInsertRowid;
  const insertItem = db.prepare("INSERT INTO purchase_order_items (purchase_order_id, product_id, product_name, quantity, unit_price, total) VALUES (?,?,?,?,?,?)");
  for (const it of items) {
    insertItem.run(poId, it.product_id ?? null, it.product_name, it.quantity, it.unit_price, it.unit_price * it.quantity);
    if (it.product_id) {
      db.prepare("UPDATE products SET stock = COALESCE(stock, 0) + ?, cost = ? WHERE id=?").run(it.quantity, it.unit_price, it.product_id);
    }
  }
  if (supplier_id) {
    db.prepare("UPDATE suppliers SET balance = balance + ? WHERE id=?").run(total, supplier_id);
  }
  try {
    const isSupplier = !!supplier_id;
    let creditAccount = "11100";
    let descriptionDetail = `\u0634\u0631\u0627\u0621 \u0646\u0642\u062F\u064A`;
    if (isSupplier) {
      creditAccount = "21100";
      const supplier = db.prepare("SELECT name FROM suppliers WHERE id=?").get(supplier_id);
      descriptionDetail = `\u0634\u0631\u0627\u0621 \u0622\u062C\u0644 \u0645\u0646 \u0627\u0644\u0645\u0648\u0631\u062F ${supplier?.name ?? "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}`;
    }
    createDoubleEntryJournal(
      (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      `\u0641\u0627\u062A\u0648\u0631\u0629 \u0634\u0631\u0627\u0621 \u0631\u0642\u0645 ${poNum} - ${descriptionDetail}`,
      "purchase",
      poId,
      [
        { account_code: "11300", debit: total, credit: 0, description: `\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C\u0627\u062A \u0648\u0645\u0648\u0627\u062F \u062E\u0627\u0645 \u0625\u0644\u0649 \u0627\u0644\u0645\u062E\u0632\u0648\u0646` },
        { account_code: creditAccount, debit: 0, credit: total, description: `\u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u0642\u064A\u0645\u0629 \u0627\u0644\u0634\u0631\u0627\u0621 \u0631\u0642\u0645 ${poNum}` }
      ]
    );
  } catch (journalErr) {
    console.error("Failed to generate double entry for purchase:", journalErr.message);
  }
  logAudit(user.id, user.name, "\u0623\u0645\u0631 \u0634\u0631\u0627\u0621", `\u0625\u0646\u0634\u0627\u0621 \u0623\u0645\u0631 \u0634\u0631\u0627\u0621 \u0631\u0642\u0645 ${poNum} \u0628\u0645\u0628\u0644\u063A ${total}`);
  res.status(201).json({ id: poId, po_number: poNum, total, status: "received" });
});
var purchases_default = router20;

// artifacts/api-server/src/routes/shifts.ts
var import_express21 = require("express");
var router21 = (0, import_express21.Router)();
function requireAuth3(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return null;
  }
  return user;
}
router21.get("/shifts/active", (req, res) => {
  const user = requireAuth3(req, res);
  if (!user) return;
  const shift = db.prepare("SELECT * FROM cash_shifts WHERE user_id=? AND status='open' ORDER BY id DESC LIMIT 1").get(user.id);
  res.json(shift ?? null);
});
router21.post("/shifts/open", (req, res) => {
  const user = requireAuth3(req, res);
  if (!user) return;
  const { starting_cash } = req.body;
  const activeShift = db.prepare("SELECT id FROM cash_shifts WHERE user_id=? AND status='open'").get(user.id);
  if (activeShift) {
    res.status(400).json({ error: "\u0644\u062F\u064A\u0643 \u0648\u0631\u062F\u064A\u0629 \u0645\u0641\u062A\u0648\u062D\u0629 \u0628\u0627\u0644\u0641\u0639\u0644" });
    return;
  }
  const r = db.prepare("INSERT INTO cash_shifts (user_id, user_name, starting_cash, status) VALUES (?,?,?, 'open')").run(user.id, user.name, starting_cash ?? 0);
  logAudit(user.id, user.name, "\u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629", `\u0628\u062F\u0621 \u0648\u0631\u062F\u064A\u0629 \u0628\u0645\u0628\u0644\u063A \u0623\u0633\u0627\u0633\u064A ${starting_cash ?? 0}`);
  res.status(201).json({ id: r.lastInsertRowid, starting_cash: starting_cash ?? 0, status: "open" });
});
router21.post("/shifts/close", (req, res) => {
  const user = requireAuth3(req, res);
  if (!user) return;
  const { shift_id, actual_cash, withdrawals, deposits } = req.body;
  const shift = db.prepare("SELECT * FROM cash_shifts WHERE id=? AND user_id=? AND status='open'").get(shift_id, user.id);
  if (!shift) {
    res.status(404).json({ error: "\u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0623\u0648 \u0645\u063A\u0644\u0642\u0629 \u0645\u0633\u0628\u0642\u0627\u064B" });
    return;
  }
  const sales = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN payment_method='cash' THEN total ELSE 0 END), 0) as cash_sales,
      COALESCE(SUM(CASE WHEN payment_method!='cash' THEN total ELSE 0 END), 0) as card_sales
    FROM orders 
    WHERE user_id=? AND created_at >= ?
  `).get(user.id, shift.start_time);
  const cashSales = sales.cash_sales;
  const cardSales = sales.card_sales;
  const withAmt = withdrawals ?? 0;
  const depAmt = deposits ?? 0;
  const expectedCash = shift.starting_cash + cashSales + depAmt - withAmt;
  const actCash = actual_cash ?? expectedCash;
  const difference = actCash - expectedCash;
  db.prepare(`
    UPDATE cash_shifts 
    SET end_time = datetime('now'), cash_sales = ?, card_sales = ?, withdrawals = ?, deposits = ?, actual_cash = ?, difference = ?, status = 'closed'
    WHERE id = ?
  `).run(cashSales, cardSales, withAmt, depAmt, actCash, difference, shift.id);
  logAudit(user.id, user.name, "\u0625\u063A\u0644\u0627\u0642 \u0648\u0631\u062F\u064A\u0629", `\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0631\u0642\u0645 ${shift.id} - \u0627\u0644\u0639\u062C\u0632/\u0627\u0644\u0632\u064A\u0627\u062F\u0629: ${difference}`);
  res.json({ success: true, expectedCash, actualCash: actCash, difference, cashSales, cardSales });
});
var shifts_default = router21;

// artifacts/api-server/src/routes/tables.ts
var import_express22 = require("express");
var router22 = (0, import_express22.Router)();
function requireAuth4(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return null;
  }
  return user;
}
router22.get("/tables", (req, res) => {
  const tables = db.prepare("SELECT * FROM restaurant_tables ORDER BY table_number").all();
  res.json(tables);
});
router22.post("/tables", (req, res) => {
  const user = requireAuth4(req, res);
  if (!user) return;
  const { table_number, capacity, section } = req.body;
  if (!table_number) {
    res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0627\u0648\u0644\u0629 \u0645\u0637\u0644\u0648\u0628" });
    return;
  }
  try {
    const r = db.prepare("INSERT INTO restaurant_tables (table_number, capacity, section, status) VALUES (?,?,?, 'available')").run(table_number, capacity ?? 4, section ?? "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629");
    logAudit(user.id, user.name, "\u0625\u0636\u0627\u0641\u0629 \u0637\u0627\u0648\u0644\u0629", `\u0637\u0627\u0648\u0644\u0629 \u0631\u0642\u0645 ${table_number}`);
    res.status(201).json({ id: r.lastInsertRowid, table_number, capacity: capacity ?? 4, section: section ?? "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629", status: "available" });
  } catch (e) {
    res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0627\u0648\u0644\u0629 \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B" });
  }
});
router22.post("/tables/transfer", (req, res) => {
  const user = requireAuth4(req, res);
  if (!user) return;
  const { from_table, to_table } = req.body;
  const t1 = db.prepare("SELECT * FROM restaurant_tables WHERE table_number=?").get(from_table);
  const t2 = db.prepare("SELECT * FROM restaurant_tables WHERE table_number=?").get(to_table);
  if (!t1 || !t2) {
    res.status(404).json({ error: "\u0625\u062D\u062F\u0649 \u0627\u0644\u0637\u0627\u0648\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
    return;
  }
  db.prepare("UPDATE restaurant_tables SET status=?, current_order_id=? WHERE id=?").run("available", null, t1.id);
  db.prepare("UPDATE restaurant_tables SET status=?, current_order_id=? WHERE id=?").run("occupied", t1.current_order_id, t2.id);
  if (t1.current_order_id) {
    db.prepare("UPDATE orders SET table_number=? WHERE id=?").run(to_table, t1.current_order_id);
  }
  logAudit(user.id, user.name, "\u0646\u0642\u0644 \u0637\u0627\u0648\u0644\u0629", `\u0645\u0646 ${from_table} \u0625\u0644\u0649 ${to_table}`);
  res.json({ success: true });
});
router22.delete("/tables/:id", (req, res) => {
  const user = requireAuth4(req, res);
  if (!user) return;
  db.prepare("DELETE FROM restaurant_tables WHERE id=?").run(req.params.id);
  res.status(204).send();
});
var tables_default = router22;

// artifacts/api-server/src/routes/kds.ts
var import_express23 = require("express");
var router23 = (0, import_express23.Router)();
function requireAuth5(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return null;
  }
  return user;
}
router23.get("/kds/orders", (req, res) => {
  const user = requireAuth5(req, res);
  if (!user) return;
  const orders = db.prepare(`
    SELECT o.*, u.name as cashier_name
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    WHERE datetime(o.created_at) >= datetime('now', '-1 day')
    ORDER BY o.created_at DESC
  `).all();
  const result = orders.map((ord) => ({
    ...ord,
    items: db.prepare("SELECT * FROM order_items WHERE order_id=?").all(ord.id)
  }));
  res.json(result);
});
var kds_default = router23;

// artifacts/api-server/src/routes/recipes.ts
var import_express24 = require("express");
var router24 = (0, import_express24.Router)();
function requireAuth6(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return null;
  }
  return user;
}
router24.get("/recipes/:productId", (req, res) => {
  const recipes = db.prepare("SELECT * FROM product_recipes WHERE product_id=?").all(req.params.productId);
  const modifiers = db.prepare("SELECT * FROM product_modifiers WHERE product_id=?").all(req.params.productId);
  res.json({ recipes, modifiers });
});
router24.post("/recipes", (req, res) => {
  const user = requireAuth6(req, res);
  if (!user) return;
  const { product_id, ingredient_name, quantity, unit } = req.body;
  const r = db.prepare("INSERT INTO product_recipes (product_id, ingredient_name, quantity, unit) VALUES (?,?,?,?)").run(product_id, ingredient_name, quantity ?? 1, unit ?? "\u062C\u0645");
  res.status(201).json({ id: r.lastInsertRowid, product_id, ingredient_name, quantity, unit });
});
router24.delete("/recipes/:id", (req, res) => {
  const user = requireAuth6(req, res);
  if (!user) return;
  db.prepare("DELETE FROM product_recipes WHERE id=?").run(req.params.id);
  res.status(204).send();
});
router24.post("/modifiers", (req, res) => {
  const user = requireAuth6(req, res);
  if (!user) return;
  const { product_id, name, price } = req.body;
  const r = db.prepare("INSERT INTO product_modifiers (product_id, name, price) VALUES (?,?,?)").run(product_id, name, price ?? 0);
  res.status(201).json({ id: r.lastInsertRowid, product_id, name, price: price ?? 0 });
});
router24.delete("/modifiers/:id", (req, res) => {
  const user = requireAuth6(req, res);
  if (!user) return;
  db.prepare("DELETE FROM product_modifiers WHERE id=?").run(req.params.id);
  res.status(204).send();
});
var recipes_default = router24;

// artifacts/api-server/src/routes/expenses.ts
var import_express25 = require("express");
var router25 = (0, import_express25.Router)();
function requireAuth7(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return null;
  }
  return user;
}
router25.get("/expenses", (req, res) => {
  const user = requireAuth7(req, res);
  if (!user) return;
  const expenses = db.prepare(`
    SELECT e.*, u.name as user_name, s.name as safe_name
    FROM expenses e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN safes s ON s.id = e.safe_id
    ORDER BY e.expense_date DESC, e.id DESC
  `).all();
  res.json(expenses);
});
router25.post("/expenses", (req, res) => {
  const user = requireAuth7(req, res);
  if (!user) return;
  const { category, amount, expense_date, notes, safe_id } = req.body;
  if (!category || !amount) {
    res.status(400).json({ category, amount, error: "\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0648\u0627\u0644\u0645\u0628\u0644\u063A \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
    return;
  }
  let finalSafeId = safe_id;
  if (!finalSafeId) {
    const defaultSafe = db.prepare("SELECT id FROM safes WHERE name = '\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A' LIMIT 1").get();
    if (defaultSafe) finalSafeId = defaultSafe.id;
  }
  const cleanDate = expense_date ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const r = db.prepare("INSERT INTO expenses (category, amount, expense_date, notes, user_id, safe_id) VALUES (?,?,?,?,?,?)").run(category, amount, cleanDate, notes ?? null, user.id, finalSafeId ?? null);
  const expenseId = r.lastInsertRowid;
  if (finalSafeId) {
    db.prepare("UPDATE safes SET balance = balance - ? WHERE id = ?").run(amount, finalSafeId);
  }
  try {
    const expenseAccountCode = category === "\u0645\u0631\u062A\u0628\u0627\u062A" || category === "\u0631\u0648\u0627\u062A\u0628" ? "63000" : "61000";
    const safeAccountCode = "11100";
    createDoubleEntryJournal(
      cleanDate,
      `\u062A\u0633\u062C\u064A\u0644 \u0645\u0635\u0631\u0648\u0641 - \u062A\u0635\u0646\u064A\u0641: ${category} - \u0627\u0644\u0628\u064A\u0627\u0646: ${notes ?? "\u0645\u0635\u0627\u0631\u064A\u0641 \u062A\u0634\u063A\u064A\u0644\u064A\u0629"}`,
      "expense",
      expenseId,
      [
        { account_code: expenseAccountCode, debit: amount, credit: 0, description: `\u0625\u062B\u0628\u0627\u062A \u0645\u0635\u0631\u0648\u0641 \u062A\u0634\u063A\u064A\u0644\u064A - ${category}` },
        { account_code: safeAccountCode, debit: 0, credit: amount, description: `\u062F\u0641\u0639 \u0646\u0642\u062F\u064A \u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641` }
      ]
    );
  } catch (journalErr) {
    console.error("Failed to generate double entry for expense:", journalErr.message);
  }
  logAudit(user.id, user.name, "\u0625\u0636\u0627\u0641\u0629 \u0645\u0635\u0631\u0648\u0641", `\u0645\u0635\u0631\u0648\u0641 ${category} \u0628\u0645\u0628\u0644\u063A ${amount} \u0645\u0646 \u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0631\u0642\u0645 ${finalSafeId}`);
  res.status(201).json({ id: expenseId, category, amount, expense_date: cleanDate, notes, user_id: user.id, safe_id: finalSafeId });
});
router25.delete("/expenses/:id", (req, res) => {
  const user = requireAuth7(req, res);
  if (!user) return;
  const expense = db.prepare("SELECT amount, safe_id FROM expenses WHERE id = ?").get(req.params.id);
  if (expense) {
    if (expense.safe_id) {
      db.prepare("UPDATE safes SET balance = balance + ? WHERE id = ?").run(expense.amount, expense.safe_id);
    }
  }
  db.prepare("DELETE FROM expenses WHERE id=?").run(req.params.id);
  logAudit(user.id, user.name, "\u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641", `\u0631\u0642\u0645 \u0627\u0644\u0645\u0635\u0631\u0648\u0641: ${req.params.id}`);
  res.status(204).send();
});
var expenses_default = router25;

// artifacts/api-server/src/routes/licenses.ts
var import_express26 = require("express");
var router26 = (0, import_express26.Router)();
function requireDeveloper(req, res) {
  const user = getAuthUser(req);
  if (!user || user.role !== "developer") {
    res.status(403).json({ error: "\u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0645\u062E\u0635\u0635\u0629 \u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0637\u0648\u0631 \u0641\u0642\u0637" });
    return false;
  }
  return true;
}
router26.get("/licenses/active", (req, res) => {
  const lic = db.prepare("SELECT * FROM licenses WHERE active=1 ORDER BY id DESC LIMIT 1").get();
  if (!lic) {
    res.json({ active: false, client_name: "\u063A\u064A\u0631 \u0645\u0631\u062E\u0635", expires_at: "", devices_limit: 0 });
    return;
  }
  const devices = db.prepare("SELECT * FROM license_devices WHERE license_id=?").all(lic.id);
  res.json({ ...lic, devices });
});
router26.get("/licenses", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const licenses = db.prepare("SELECT * FROM licenses ORDER BY id DESC").all();
  const result = licenses.map((lic) => {
    const devices = db.prepare("SELECT * FROM license_devices WHERE license_id=?").all(lic.id);
    return { ...lic, devices, active_devices_count: devices.length };
  });
  res.json(result);
});
router26.post("/licenses", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req);
  const { client_name, devices_limit, expires_at } = req.body;
  const licenseKey = `OMNI-PRO-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const r = db.prepare("INSERT INTO licenses (license_key, client_name, devices_limit, expires_at, active) VALUES (?,?,?,?,1)").run(licenseKey, client_name ?? "\u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F", devices_limit ?? 1, expires_at ?? "2027-12-31");
  logAudit(user.id, user.name, "\u0625\u0635\u062F\u0627\u0631 \u062A\u0631\u062E\u064A\u0635", `\u062A\u0631\u062E\u064A\u0635 \u0644\u0640 ${client_name ?? "\u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F"} \u0628\u0631\u0642\u0645 ${licenseKey} (\u0639\u062F\u062F \u0627\u0644\u0623\u062C\u0647\u0632\u0629: ${devices_limit ?? 1})`);
  res.status(201).json({ id: r.lastInsertRowid, license_key: licenseKey, client_name, devices_limit: devices_limit ?? 1, expires_at, active: 1 });
});
router26.post("/licenses/verify", (req, res) => {
  const { license_key, device_id, device_name } = req.body;
  const devId = device_id || "web-browser-device-" + Math.random().toString(36).substring(2, 9);
  const devName = device_name || "\u0645\u062A\u0635\u0641\u062D \u0648\u064A\u0628 / \u062C\u0647\u0627\u0632 \u0631\u0626\u064A\u0633\u064A";
  const lic = db.prepare("SELECT * FROM licenses WHERE license_key=? AND active=1").get(license_key);
  if (!lic) {
    res.status(400).json({ valid: false, error: "\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u062A\u0631\u062E\u064A\u0635 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0639\u0637\u0644" });
    return;
  }
  if (new Date(lic.expires_at) < /* @__PURE__ */ new Date()) {
    res.status(400).json({ valid: false, error: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u062A\u0631\u062E\u064A\u0635" });
    return;
  }
  const existingDevice = db.prepare("SELECT * FROM license_devices WHERE license_id=? AND device_id=?").get(lic.id, devId);
  if (!existingDevice) {
    const devicesCount = db.prepare("SELECT COUNT(*) as cnt FROM license_devices WHERE license_id=?").get(lic.id).cnt;
    if (devicesCount >= lic.devices_limit) {
      res.status(400).json({
        valid: false,
        error: `\u062A\u0645 \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0645\u0646 \u0627\u0644\u0623\u062C\u0647\u0632\u0629 \u0627\u0644\u0645\u0631\u062E\u0635\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0641\u062A\u0627\u062D (${devicesCount}/${lic.devices_limit} \u0623\u062C\u0647\u0632\u0629). \u064A\u0631\u062C\u0649 \u0625\u0644\u063A\u0627\u0621 \u062A\u0641\u0639\u064A\u0644 \u062C\u0647\u0627\u0632 \u0642\u062F\u064A\u0645 \u0623\u0648 \u0632\u064A\u0627\u062F\u0629 \u0639\u062F\u062F \u0627\u0644\u0623\u062C\u0647\u0632\u0629.`
      });
      return;
    }
    db.prepare("INSERT INTO license_devices (license_id, device_id, device_name, last_active) VALUES (?,?,?,datetime('now'))").run(lic.id, devId, devName);
  } else {
    db.prepare("UPDATE license_devices SET last_active=datetime('now'), device_name=? WHERE id=?").run(devName, existingDevice.id);
  }
  const allDevices = db.prepare("SELECT * FROM license_devices WHERE license_id=?").all(lic.id);
  res.json({
    valid: true,
    clientName: lic.client_name,
    expiresAt: lic.expires_at,
    devicesLimit: lic.devices_limit,
    deviceId: devId,
    registeredDevices: allDevices
  });
});
router26.delete("/licenses/devices/:id", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req);
  db.prepare("DELETE FROM license_devices WHERE id=?").run(req.params.id);
  logAudit(user.id, user.name, "\u0625\u0644\u063A\u0627\u0621 \u0631\u0628\u0637 \u062C\u0647\u0627\u0632", `\u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u062C\u0647\u0627\u0632 \u0627\u0644\u0645\u0631\u062A\u0628\u0637 \u0628\u0631\u0642\u0645 \u062A\u0639\u0631\u064A\u0641 ${req.params.id}`);
  res.status(204).send();
});
router26.delete("/licenses/:id", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req);
  db.prepare("DELETE FROM license_devices WHERE license_id=?").run(req.params.id);
  db.prepare("DELETE FROM licenses WHERE id=?").run(req.params.id);
  logAudit(user.id, user.name, "\u062D\u0630\u0641 \u062A\u0631\u062E\u064A\u0635", `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u0631\u062E\u064A\u0635 \u0631\u0642\u0645 ${req.params.id}`);
  res.status(204).send();
});
var licenses_default = router26;

// artifacts/api-server/src/routes/audit.ts
var import_express27 = require("express");
var router27 = (0, import_express27.Router)();
function requireAdmin6(req, res) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return false;
  }
  return true;
}
router27.get("/audit-logs", (req, res) => {
  if (!requireAdmin6(req, res)) return;
  const logs = db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200").all();
  res.json(logs);
});
var audit_default = router27;

// artifacts/api-server/src/routes/system.ts
var import_express28 = require("express");
var router28 = (0, import_express28.Router)();
function requireAdmin7(req, res) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return false;
  }
  return true;
}
router28.get("/system/backup", (req, res) => {
  if (!requireAdmin7(req, res)) return;
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    products,
    categories,
    orders,
    orderItems,
    customers,
    expenses,
    suppliers
  };
  logAudit(user.id, user.name, "\u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A", "\u062A\u0635\u062F\u064A\u0631 \u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0645\u0646 \u0627\u0644\u0646\u0638\u0627\u0645");
  res.setHeader("Content-Disposition", `attachment; filename=omni-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(backupData, null, 2));
});
router28.get("/currencies", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM currencies ORDER BY id").all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router28.post("/currencies", (req, res) => {
  if (!requireAdmin7(req, res)) return;
  const user = getAuthUser(req);
  const { name, symbol, fraction, type, exchange_rate, active } = req.body;
  if (!name || !symbol || !type) {
    res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629" });
    return;
  }
  try {
    const stmt = db.prepare(`
      INSERT INTO currencies (name, symbol, fraction, type, exchange_rate, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, symbol, fraction || null, type, exchange_rate || 1, active !== false ? 1 : 0);
    const row = db.prepare("SELECT * FROM currencies WHERE id = ?").get(result.lastInsertRowid);
    logAudit(user.id, user.name, "\u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u0644\u0629", `\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u0644\u0629 \u062C\u062F\u064A\u062F\u0629: ${name} (${symbol})`);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router28.put("/currencies/:id", (req, res) => {
  if (!requireAdmin7(req, res)) return;
  const user = getAuthUser(req);
  const { name, symbol, fraction, type, exchange_rate, active } = req.body;
  try {
    const existing = db.prepare("SELECT * FROM currencies WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "\u0627\u0644\u0639\u0645\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    db.prepare(`
      UPDATE currencies
      SET name = ?, symbol = ?, fraction = ?, type = ?, exchange_rate = ?, active = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      symbol ?? existing.symbol,
      fraction !== void 0 ? fraction : existing.fraction,
      type ?? existing.type,
      exchange_rate ?? existing.exchange_rate,
      active !== void 0 ? active ? 1 : 0 : existing.active,
      req.params.id
    );
    const updated = db.prepare("SELECT * FROM currencies WHERE id = ?").get(req.params.id);
    logAudit(user.id, user.name, "\u062A\u0639\u062F\u064A\u0644 \u0639\u0645\u0644\u0629", `\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0639\u0645\u0644\u0629: ${name || existing.name}`);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router28.delete("/currencies/:id", (req, res) => {
  if (!requireAdmin7(req, res)) return;
  const user = getAuthUser(req);
  try {
    const existing = db.prepare("SELECT * FROM currencies WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "\u0627\u0644\u0639\u0645\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    db.prepare("DELETE FROM currencies WHERE id = ?").run(req.params.id);
    logAudit(user.id, user.name, "\u062D\u0630\u0641 \u0639\u0645\u0644\u0629", `\u062A\u0645 \u062D\u0630\u0641 \u0639\u0645\u0644\u0629: ${existing.name}`);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router28.get("/system/sessions", (req, res) => {
  if (!requireAdmin7(req, res)) return;
  try {
    const rows = db.prepare("SELECT * FROM erp_sessions ORDER BY login_time DESC").all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router28.post("/system/sessions/terminate/:id", (req, res) => {
  if (!requireAdmin7(req, res)) return;
  const user = getAuthUser(req);
  try {
    const existing = db.prepare("SELECT * FROM erp_sessions WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "\u0627\u0644\u062C\u0644\u0633\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    db.prepare(`
      UPDATE erp_sessions
      SET status = '\u062E\u0631\u0648\u062C \u0642\u0633\u0631\u064A', logout_time = datetime('now', 'localtime')
      WHERE id = ?
    `).run(req.params.id);
    logAudit(user.id, user.name, "\u0625\u0646\u0647\u0627\u0621 \u062C\u0644\u0633\u0629", `\u062A\u0645 \u0625\u0646\u0647\u0627\u0621 \u062C\u0644\u0633\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0642\u0633\u0631\u0627\u064B: ${existing.username}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router28.get("/role-permissions", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM role_permissions").all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router28.put("/role-permissions/:role", (req, res) => {
  if (!requireAdmin7(req, res)) return;
  const user = getAuthUser(req);
  const { role } = req.params;
  const {
    can_void_bills,
    can_view_cost,
    can_change_currencies,
    can_approve_returns,
    can_open_close_safe,
    can_transfer_funds,
    can_edit_products,
    can_delete_orders
  } = req.body;
  try {
    db.prepare(`
      UPDATE role_permissions
      SET can_void_bills = ?,
          can_view_cost = ?,
          can_change_currencies = ?,
          can_approve_returns = ?,
          can_open_close_safe = ?,
          can_transfer_funds = ?,
          can_edit_products = ?,
          can_delete_orders = ?
      WHERE role = ?
    `).run(
      can_void_bills !== void 0 ? can_void_bills ? 1 : 0 : 0,
      can_view_cost !== void 0 ? can_view_cost ? 1 : 0 : 0,
      can_change_currencies !== void 0 ? can_change_currencies ? 1 : 0 : 0,
      can_approve_returns !== void 0 ? can_approve_returns ? 1 : 0 : 0,
      can_open_close_safe !== void 0 ? can_open_close_safe ? 1 : 0 : 0,
      can_transfer_funds !== void 0 ? can_transfer_funds ? 1 : 0 : 0,
      can_edit_products !== void 0 ? can_edit_products ? 1 : 0 : 0,
      can_delete_orders !== void 0 ? can_delete_orders ? 1 : 0 : 0,
      role
    );
    const updated = db.prepare("SELECT * FROM role_permissions WHERE role = ?").get(role);
    logAudit(user.id, user.name, "\u062A\u0639\u062F\u064A\u0644 \u0635\u0644\u0627\u062D\u064A\u0627\u062A", `\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u062F\u0648\u0631: ${role}`);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
var system_default = router28;

// artifacts/api-server/src/routes/document-print-settings.ts
var import_express29 = require("express");
var router29 = (0, import_express29.Router)();
router29.get("/document-print-settings", (_req, res) => {
  let row = db.prepare("SELECT * FROM document_print_settings WHERE id = 1").get();
  if (!row) {
    db.prepare(`
      INSERT OR IGNORE INTO document_print_settings (
        id, company_name, company_subtitle, logo_url,
        customer_header_text, customer_footer_text,
        employee_header_text, employee_footer_text,
        voucher_receipt_title, voucher_payment_title, voucher_footer_text,
        report_header_text, report_footer_text, accent_color
      ) VALUES (1, 'OmniSystem Pro', '\u0646\u0638\u0627\u0645 \u0646\u0642\u0627\u0637 \u0627\u0644\u0628\u064A\u0639 \u0648\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0631\u062F', '/omnisystem-logo.png', '\u0643\u0634\u0641 \u062D\u0633\u0627\u0628 \u0639\u0645\u064A\u0644 \u0645\u0639\u062A\u0645\u062F', '\u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0639\u0627\u0645\u0644\u0643\u0645 \u0645\u0639\u0646\u0627 - \u064A\u064F\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u062E\u0644\u0627\u0644 15 \u064A\u0648\u0645\u0627\u064B', '\u0643\u0634\u0641 \u062D\u0633\u0627\u0628 \u0648\u0645\u0633\u064A\u0631 \u0631\u0648\u0627\u062A\u0628 \u0645\u0648\u0638\u0641', '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629 - \u0627\u0644\u062A\u0648\u0642\u064A\u0639 \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F', '\u0633\u0646\u062F \u0642\u0628\u0636', '\u0633\u0646\u062F \u0635\u0631\u0641', '\u0627\u0644\u0645\u062D\u0627\u0633\u0628 _______ \u0627\u0644\u0645\u062F\u064A\u0631 _______ \u0627\u0644\u0645\u0633\u062A\u0644\u0645 _______', '\u062A\u0642\u0631\u064A\u0631 \u0639\u0627\u0645 \u0634\u0627\u0645\u0644', '\u0637\u0628\u0639 \u0628\u0648\u0627\u0633\u0637\u0629 \u0646\u0638\u0627\u0645 OmniSystem Pro', '#2563eb')
    `).run();
    row = db.prepare("SELECT * FROM document_print_settings WHERE id = 1").get();
  }
  res.json({
    companyName: row.company_name,
    companySubtitle: row.company_subtitle,
    logoUrl: row.logo_url,
    customerHeaderText: row.customer_header_text,
    customerFooterText: row.customer_footer_text,
    employeeHeaderText: row.employee_header_text,
    employeeFooterText: row.employee_footer_text,
    voucherReceiptTitle: row.voucher_receipt_title,
    voucherPaymentTitle: row.voucher_payment_title,
    voucherFooterText: row.voucher_footer_text,
    reportHeaderText: row.report_header_text,
    reportFooterText: row.report_footer_text,
    accentColor: row.accent_color
  });
});
router29.put("/document-print-settings", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const {
    companyName,
    companySubtitle,
    logoUrl,
    customerHeaderText,
    customerFooterText,
    employeeHeaderText,
    employeeFooterText,
    voucherReceiptTitle,
    voucherPaymentTitle,
    voucherFooterText,
    reportHeaderText,
    reportFooterText,
    accentColor
  } = req.body;
  db.prepare(`
    UPDATE document_print_settings SET
      company_name = ?,
      company_subtitle = ?,
      logo_url = ?,
      customer_header_text = ?,
      customer_footer_text = ?,
      employee_header_text = ?,
      employee_footer_text = ?,
      voucher_receipt_title = ?,
      voucher_payment_title = ?,
      voucher_footer_text = ?,
      report_header_text = ?,
      report_footer_text = ?,
      accent_color = ?
    WHERE id = 1
  `).run(
    companyName,
    companySubtitle,
    logoUrl,
    customerHeaderText,
    customerFooterText,
    employeeHeaderText,
    employeeFooterText,
    voucherReceiptTitle,
    voucherPaymentTitle,
    voucherFooterText,
    reportHeaderText,
    reportFooterText,
    accentColor
  );
  const row = db.prepare("SELECT * FROM document_print_settings WHERE id = 1").get();
  res.json({
    companyName: row.company_name,
    companySubtitle: row.company_subtitle,
    logoUrl: row.logo_url,
    customerHeaderText: row.customer_header_text,
    customerFooterText: row.customer_footer_text,
    employeeHeaderText: row.employee_header_text,
    employeeFooterText: row.employee_footer_text,
    voucherReceiptTitle: row.voucher_receipt_title,
    voucherPaymentTitle: row.voucher_payment_title,
    voucherFooterText: row.voucher_footer_text,
    reportHeaderText: row.report_header_text,
    reportFooterText: row.report_footer_text,
    accentColor: row.accent_color
  });
});
var document_print_settings_default = router29;

// artifacts/api-server/src/routes/inventory.ts
var import_express30 = require("express");
var router30 = (0, import_express30.Router)();
router30.get("/inventory/summary", (_req, res) => {
  const products = db.prepare(`
    SELECT p.id, p.number, p.name, p.price, p.cost, p.stock, c.name as categoryName
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.number
  `).all();
  const totalItems = products.length;
  let totalStockCount = 0;
  let totalStockCost = 0;
  let totalStockValue = 0;
  const lowStockItems = [];
  for (const p of products) {
    const stock = p.stock ?? 0;
    const cost = p.cost ?? 0;
    const price = p.price ?? 0;
    totalStockCount += stock;
    totalStockCost += stock * cost;
    totalStockValue += stock * price;
    if (stock <= 10) {
      lowStockItems.push(p);
    }
  }
  res.json({
    totalItems,
    totalStockCount,
    totalStockCost,
    totalStockValue,
    lowStockCount: lowStockItems.length,
    lowStockItems,
    products
  });
});
router30.get("/inventory/movements", (req, res) => {
  const { productId } = req.query;
  let sql = `
    SELECT m.*, p.name as productName, p.number as productNumber
    FROM stock_movements m
    JOIN products p ON p.id = m.product_id
    WHERE 1=1
  `;
  const params = [];
  if (productId) {
    sql += " AND m.product_id = ?";
    params.push(productId);
  }
  sql += " ORDER BY m.id DESC LIMIT 100";
  const movements = db.prepare(sql).all(...params);
  res.json(movements);
});
router30.post("/inventory/movement", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const { productId, type, quantity, reason, referenceId } = req.body;
  if (!productId || !type || quantity === void 0) {
    res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629" });
    return;
  }
  const product = db.prepare("SELECT * FROM products WHERE id=?").get(productId);
  if (!product) {
    res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    return;
  }
  const prevStock = product.stock ?? 0;
  let newStock = prevStock;
  const qty = Number(quantity);
  if (type === "in") {
    newStock = prevStock + qty;
  } else if (type === "out") {
    newStock = Math.max(0, prevStock - qty);
  } else if (type === "adjustment") {
    newStock = qty;
  }
  const diff = newStock - prevStock;
  db.transaction(() => {
    db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(newStock, productId);
    db.prepare(`
      INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, reference_id, user_id, user_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(productId, type, Math.abs(diff), prevStock, newStock, reason || "\u062A\u0633\u0648\u064A\u0629 \u0645\u062E\u0632\u0646\u064A\u0629 \u064A\u062F\u0648\u064A\u0651\u0629", referenceId || null, user.id, user.name);
  })();
  res.json({ success: true, previousStock: prevStock, newStock });
});
var inventory_default = router30;

// artifacts/api-server/src/routes/safes.ts
var import_express31 = require("express");
var router31 = (0, import_express31.Router)();
function requireAuth8(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return null;
  }
  return user;
}
function requireAdmin8(req, res) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u0641\u0642\u0637" });
    return false;
  }
  return true;
}
router31.get("/safes", (req, res) => {
  const user = requireAuth8(req, res);
  if (!user) return;
  try {
    const safes = db.prepare("SELECT * FROM safes ORDER BY id DESC").all();
    res.json(safes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router31.post("/safes", (req, res) => {
  const user = requireAuth8(req, res);
  if (!user) return;
  const { name, balance, currency, notes, branch_id, cashier_id } = req.body;
  if (!name) {
    res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0645\u0637\u0644\u0648\u0628" });
    return;
  }
  try {
    const r = db.prepare(`
      INSERT INTO safes (name, balance, currency, notes, active, opening_balance, status, branch_id, cashier_id)
      VALUES (?, ?, ?, ?, 1, ?, 'open', ?, ?)
    `).run(
      name,
      Number(balance ?? 0),
      currency ?? "\u0631\u064A\u0627\u0644",
      notes ?? null,
      Number(balance ?? 0),
      branch_id ? Number(branch_id) : null,
      cashier_id ? Number(cashier_id) : null
    );
    const safeId = r.lastInsertRowid;
    if (Number(balance ?? 0) > 0) {
      try {
        createDoubleEntryJournal(
          (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          `\u0625\u062B\u0628\u0627\u062A \u0631\u0635\u064A\u062F \u0627\u0641\u062A\u062A\u0627\u062D\u064A \u0644\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u062C\u062F\u064A\u062F: ${name}`,
          "voucher",
          safeId,
          [
            { account_code: "11100", debit: Number(balance), credit: 0, description: `\u0631\u0635\u064A\u062F \u0627\u0641\u062A\u062A\u0627\u062D\u064A - \u0635\u0646\u062F\u0648\u0642 ${name}` },
            { account_code: "31000", debit: 0, credit: Number(balance), description: `\u062A\u0645\u0648\u064A\u0644 \u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644 \u0627\u0644\u062A\u0623\u0633\u064A\u0633\u064A` }
          ]
        );
      } catch (err) {
        console.error("Initial safe balance journal failed:", err.message);
      }
    }
    logAudit(user.id, user.name, "\u0625\u0636\u0627\u0641\u0629 \u0635\u0646\u062F\u0648\u0642", `\u0625\u0636\u0627\u0641\u0629 \u0635\u0646\u062F\u0648\u0642 \u062C\u062F\u064A\u062F: ${name} \u0628\u0631\u0635\u064A\u062F \u0627\u0641\u062A\u062A\u0627\u062D\u064A ${balance}`);
    res.status(201).json({
      id: safeId,
      name,
      balance: Number(balance ?? 0),
      currency: currency ?? "\u0631\u064A\u0627\u0644",
      notes: notes ?? null,
      active: 1,
      status: "open",
      opening_balance: Number(balance ?? 0),
      branch_id,
      cashier_id
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router31.put("/safes/:id", (req, res) => {
  const user = requireAuth8(req, res);
  if (!user) return;
  const { name, balance, currency, notes, active, branch_id, cashier_id } = req.body;
  if (!name) {
    res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0645\u0637\u0644\u0648\u0628" });
    return;
  }
  try {
    db.prepare(`
      UPDATE safes
      SET name = ?, balance = ?, currency = ?, notes = ?, active = ?, branch_id = ?, cashier_id = ?
      WHERE id = ?
    `).run(
      name,
      Number(balance ?? 0),
      currency ?? "\u0631\u064A\u0627\u0644",
      notes ?? null,
      active ? 1 : 0,
      branch_id ? Number(branch_id) : null,
      cashier_id ? Number(cashier_id) : null,
      req.params.id
    );
    logAudit(user.id, user.name, "\u062A\u0639\u062F\u064A\u0644 \u0635\u0646\u062F\u0648\u0642", `\u062A\u0639\u062F\u064A\u0644 \u0635\u0646\u062F\u0648\u0642: ${name} \u0628\u0631\u0635\u064A\u062F ${balance}`);
    res.json({
      id: Number(req.params.id),
      name,
      balance: Number(balance ?? 0),
      currency: currency ?? "\u0631\u064A\u0627\u0644",
      notes: notes ?? null,
      active: active ? 1 : 0,
      branch_id,
      cashier_id
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router31.delete("/safes/:id", (req, res) => {
  const user = requireAuth8(req, res);
  if (!user) return;
  try {
    const safe = db.prepare("SELECT * FROM safes WHERE id = ?").get(req.params.id);
    if (!safe) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (safe.name === "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A") {
      res.status(400).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0644\u0644\u0646\u0638\u0627\u0645" });
      return;
    }
    db.prepare("DELETE FROM safes WHERE id = ?").run(req.params.id);
    logAudit(user.id, user.name, "\u062D\u0630\u0641 \u0635\u0646\u062F\u0648\u0642", `\u062D\u0630\u0641 \u0635\u0646\u062F\u0648\u0642: ${safe.name}`);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router31.post("/safes/transfer", (req, res) => {
  const user = requireAuth8(req, res);
  if (!user) return;
  const { source_safe_id, destination_safe_id, amount, notes } = req.body;
  if (!source_safe_id || !destination_safe_id || !amount || Number(amount) <= 0) {
    res.status(400).json({ error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u062A\u0648\u0641\u064A\u0631 \u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0645\u0635\u062F\u0631 \u0648\u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641 \u0648\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0631\u0627\u062F \u062A\u062D\u0648\u064A\u0644\u0647" });
    return;
  }
  try {
    const src = db.prepare("SELECT * FROM safes WHERE id = ?").get(source_safe_id);
    const dst = db.prepare("SELECT * FROM safes WHERE id = ?").get(destination_safe_id);
    if (!src || !dst) {
      res.status(404).json({ error: "\u0623\u062D\u062F \u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (src.balance < Number(amount)) {
      res.status(400).json({ error: `\u0631\u0635\u064A\u062F \u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0645\u0635\u062F\u0631 (${src.name}) \u0644\u0627 \u064A\u0643\u0641\u064A \u0644\u0644\u062A\u062D\u0648\u064A\u0644! \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062D\u0627\u0644\u064A: ${src.balance}` });
      return;
    }
    db.prepare("UPDATE safes SET balance = balance - ? WHERE id = ?").run(amount, source_safe_id);
    db.prepare("UPDATE safes SET balance = balance + ? WHERE id = ?").run(amount, destination_safe_id);
    try {
      createDoubleEntryJournal(
        (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        `\u062A\u062D\u0648\u064A\u0644 \u0646\u0642\u062F\u064A\u0629 \u062F\u0627\u062E\u0644\u064A \u0645\u0646 \u0635\u0646\u062F\u0648\u0642 [${src.name}] \u0625\u0644\u0649 \u0635\u0646\u062F\u0648\u0642 [${dst.name}]`,
        "voucher",
        source_safe_id,
        [
          { account_code: "11100", debit: Number(amount), credit: 0, description: `\u0627\u0633\u062A\u0644\u0627\u0645 \u0646\u0642\u062F\u064A\u0629 \u0645\u062D\u0648\u0644\u0629 \u0625\u0644\u0649 ${dst.name}` },
          { account_code: "11100", debit: 0, credit: Number(amount), description: `\u062A\u062D\u0648\u064A\u0644 \u0646\u0642\u062F\u064A\u0629 \u0635\u0627\u062F\u0631\u0629 \u0645\u0646 ${src.name}` }
        ]
      );
    } catch (journalErr) {
      console.error("Safe transfer journal failed:", journalErr.message);
    }
    logAudit(user.id, user.name, "\u062A\u062D\u0648\u064A\u0644 \u0646\u0642\u062F\u064A\u0629", `\u062A\u0645 \u062A\u062D\u0648\u064A\u0644 \u0645\u0628\u0644\u063A ${amount} \u0645\u0646 \u0635\u0646\u062F\u0648\u0642 ${src.name} \u0625\u0644\u0649 \u0635\u0646\u062F\u0648\u0642 ${dst.name}`);
    res.json({ success: true, amount, source: src.name, destination: dst.name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router31.post("/safes/:id/deposit", (req, res) => {
  const user = requireAuth8(req, res);
  if (!user) return;
  const { amount, notes } = req.body;
  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ error: "\u0627\u0644\u0645\u0628\u0644\u063A \u0645\u0637\u0644\u0648\u0628 \u0648\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0635\u0641\u0631" });
    return;
  }
  try {
    const safe = db.prepare("SELECT * FROM safes WHERE id = ?").get(req.params.id);
    if (!safe) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    db.prepare("UPDATE safes SET balance = balance + ? WHERE id = ?").run(amount, safe.id);
    try {
      createDoubleEntryJournal(
        (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        `\u0625\u064A\u062F\u0627\u0639 \u0646\u0642\u062F\u064A \u0645\u0628\u0627\u0634\u0631 \u0644\u0635\u0646\u062F\u0648\u0642 [${safe.name}] \u2014 \u0627\u0644\u0628\u064A\u0627\u0646: ${notes ?? "\u062A\u063A\u0630\u064A\u0629 \u0635\u0646\u062F\u0648\u0642 \u0628\u0637\u0644\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629"}`,
        "voucher",
        safe.id,
        [
          { account_code: "11100", debit: Number(amount), credit: 0, description: `\u0625\u064A\u062F\u0627\u0639 \u0646\u0642\u062F\u064A \u0644\u0635\u0646\u062F\u0648\u0642 ${safe.name}` },
          { account_code: "31000", debit: 0, credit: Number(amount), description: `\u062A\u0645\u0648\u064A\u0644 \u0646\u0642\u062F\u064A\u0629 \u0625\u0636\u0627\u0641\u064A\u0629 - \u0631\u0623\u0633 \u0645\u0627\u0644` }
        ]
      );
    } catch (jeErr) {
      console.error("Deposit journal failed:", jeErr.message);
    }
    logAudit(user.id, user.name, "\u0625\u064A\u062F\u0627\u0639 \u0635\u0646\u062F\u0648\u0642", `\u0625\u064A\u062F\u0627\u0639 \u0645\u0628\u0644\u063A ${amount} \u0644\u0635\u0646\u062F\u0648\u0642 ${safe.name}`);
    res.json({ success: true, new_balance: safe.balance + Number(amount) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router31.post("/safes/:id/withdraw", (req, res) => {
  const user = requireAuth8(req, res);
  if (!user) return;
  const { amount, notes } = req.body;
  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ error: "\u0627\u0644\u0645\u0628\u0644\u063A \u0645\u0637\u0644\u0648\u0628 \u0648\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0635\u0641\u0631" });
    return;
  }
  try {
    const safe = db.prepare("SELECT * FROM safes WHERE id = ?").get(req.params.id);
    if (!safe) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (safe.balance < Number(amount)) {
      res.status(400).json({ error: "\u0631\u0635\u064A\u062F \u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u062D\u0627\u0644\u064A \u0644\u0627 \u064A\u0643\u0641\u064A \u0644\u0625\u062A\u0645\u0627\u0645 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0633\u062D\u0628" });
      return;
    }
    db.prepare("UPDATE safes SET balance = balance - ? WHERE id = ?").run(amount, safe.id);
    try {
      createDoubleEntryJournal(
        (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        `\u0633\u062D\u0628 \u0646\u0642\u062F\u064A \u0645\u0628\u0627\u0634\u0631 \u0645\u0646 \u0635\u0646\u062F\u0648\u0642 [${safe.name}] \u2014 \u0627\u0644\u0628\u064A\u0627\u0646: ${notes ?? "\u0645\u0633\u062D\u0648\u0628\u0627\u062A \u0646\u0642\u062F\u064A\u0629 \u0625\u062F\u0627\u0631\u064A\u0629"}`,
        "voucher",
        safe.id,
        [
          { account_code: "61000", debit: Number(amount), credit: 0, description: `\u0645\u0633\u062D\u0648\u0628\u0627\u062A \u0648\u0645\u0635\u0627\u0631\u064A\u0641 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0646 \u0635\u0646\u062F\u0648\u0642 ${safe.name}` },
          { account_code: "11100", debit: 0, credit: Number(amount), description: `\u062A\u062E\u0641\u064A\u0636 \u0646\u0642\u062F\u064A\u0629 \u0635\u0646\u062F\u0648\u0642 ${safe.name}` }
        ]
      );
    } catch (jeErr) {
      console.error("Withdrawal journal failed:", jeErr.message);
    }
    logAudit(user.id, user.name, "\u0633\u062D\u0628 \u0635\u0646\u062F\u0648\u0642", `\u0633\u062D\u0628 \u0645\u0628\u0644\u063A ${amount} \u0645\u0646 \u0635\u0646\u062F\u0648\u0642 ${safe.name}`);
    res.json({ success: true, new_balance: safe.balance - Number(amount) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router31.post("/safes/:id/open", (req, res) => {
  const user = requireAuth8(req, res);
  if (!user) return;
  const { opening_balance } = req.body;
  try {
    const safe = db.prepare("SELECT * FROM safes WHERE id = ?").get(req.params.id);
    if (!safe) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    db.prepare(`
      UPDATE safes
      SET status = 'open', opening_balance = ?, balance = ?, actual_balance = 0, difference = 0, reconciliation_reason = NULL
      WHERE id = ?
    `).run(Number(opening_balance ?? 0), Number(opening_balance ?? 0), safe.id);
    logAudit(user.id, user.name, "\u0641\u062A\u062D \u0635\u0646\u062F\u0648\u0642", `\u062A\u0645 \u0641\u062A\u062D \u0635\u0646\u062F\u0648\u0642 ${safe.name} \u0628\u0631\u0635\u064A\u062F \u0627\u0641\u062A\u062A\u0627\u062D\u064A ${opening_balance ?? 0}`);
    res.json({ success: true, status: "open", opening_balance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router31.post("/safes/:id/reconcile", (req, res) => {
  const user = requireAuth8(req, res);
  if (!user) return;
  const { actual_balance, reconciliation_reason } = req.body;
  if (actual_balance === void 0) {
    res.status(400).json({ error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0641\u0639\u0644\u064A \u0627\u0644\u0645\u0648\u062C\u0648\u062F \u0628\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0644\u0644\u0645\u0637\u0627\u0628\u0642\u0629" });
    return;
  }
  try {
    const safe = db.prepare("SELECT * FROM safes WHERE id = ?").get(req.params.id);
    if (!safe) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const expected = safe.balance;
    const diff = Number(actual_balance) - expected;
    if (Math.abs(diff) > 0.01 && !reconciliation_reason) {
      res.status(400).json({ error: "\u064A\u0648\u062C\u062F \u0639\u062C\u0632 \u0623\u0648 \u0632\u064A\u0627\u062F\u0629 \u0641\u064A \u0627\u0644\u0635\u0646\u062F\u0648\u0642! \u0644\u0627 \u064A\u0633\u0645\u062D \u0628\u0627\u0644\u0625\u063A\u0644\u0627\u0642 \u0625\u0644\u0627 \u0628\u0639\u062F \u0643\u062A\u0627\u0628\u0629 \u0633\u0628\u0628 \u0627\u0644\u0639\u062C\u0632/\u0627\u0644\u0632\u064A\u0627\u062F\u0629 \u0628\u0627\u0644\u062A\u0641\u0635\u064A\u0644 \u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A." });
      return;
    }
    db.prepare(`
      UPDATE safes
      SET status = 'pending_approval', actual_balance = ?, difference = ?, reconciliation_reason = ?
      WHERE id = ?
    `).run(Number(actual_balance), diff, reconciliation_reason ?? null, safe.id);
    logAudit(user.id, user.name, "\u0637\u0644\u0628 \u0625\u063A\u0644\u0627\u0642 \u0648\u062A\u0633\u0648\u064A\u0629 \u0635\u0646\u062F\u0648\u0642", `\u062A\u0642\u062F\u064A\u0645 \u0637\u0644\u0628 \u062A\u0633\u0648\u064A\u0629 \u0635\u0646\u062F\u0648\u0642 ${safe.name}: \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0641\u0639\u0644\u064A ${actual_balance}\u060C \u0627\u0644\u0645\u062A\u0648\u0642\u0639 ${expected}\u060C \u0627\u0644\u0641\u0627\u0631\u0642 ${diff}`);
    res.json({ success: true, status: "pending_approval", expected, actual: Number(actual_balance), difference: diff });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router31.post("/safes/:id/approve-closing", (req, res) => {
  if (!requireAdmin8(req, res)) return;
  const user = getAuthUser(req);
  try {
    const safe = db.prepare("SELECT * FROM safes WHERE id = ?").get(req.params.id);
    if (!safe) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (safe.status !== "pending_approval") {
      res.status(400).json({ error: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0644\u064A\u0633 \u0641\u064A \u062D\u0627\u0644\u0629 \u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F" });
      return;
    }
    const diff = safe.difference || 0;
    if (Math.abs(diff) > 0.01) {
      try {
        if (diff > 0) {
          createDoubleEntryJournal(
            (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
            `\u0627\u0639\u062A\u0645\u0627\u062F \u0632\u064A\u0627\u062F\u0629 \u0635\u0646\u062F\u0648\u0642 [${safe.name}] \u0639\u0646\u062F \u0627\u0644\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0645\u0627\u0644\u064A`,
            "shift_difference",
            safe.id,
            [
              { account_code: "11100", debit: Math.abs(diff), credit: 0, description: `\u0632\u064A\u0627\u062F\u0629 \u0646\u0642\u062F\u064A\u0629 \u0645\u0639\u062A\u0645\u062F\u0629 \u0628\u0635\u0646\u062F\u0648\u0642 ${safe.name}` },
              { account_code: "41000", debit: 0, credit: Math.abs(diff), description: `\u0623\u0631\u0628\u0627\u062D \u0648\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0641\u0631\u0648\u0642\u0627\u062A \u062C\u0631\u062F \u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0643\u0627\u0634\u064A\u0631` }
            ]
          );
        } else {
          createDoubleEntryJournal(
            (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
            `\u0627\u0639\u062A\u0645\u0627\u062F \u0639\u062C\u0632 \u0635\u0646\u062F\u0648\u0642 [${safe.name}] \u0639\u0646\u062F \u0627\u0644\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0645\u0627\u0644\u064A`,
            "shift_difference",
            safe.id,
            [
              { account_code: "62000", debit: Math.abs(diff), credit: 0, description: `\u062E\u0633\u0627\u0626\u0631 \u0648\u0639\u062C\u0632 \u0646\u0642\u062F\u064A\u0629 \u0645\u0639\u062A\u0645\u062F \u0628\u0635\u0646\u062F\u0648\u0642 ${safe.name}` },
              { account_code: "11100", debit: 0, credit: Math.abs(diff), description: `\u062A\u062E\u0641\u064A\u0636 \u0631\u0635\u064A\u062F \u0635\u0646\u062F\u0648\u0642 ${safe.name} \u0628\u0642\u064A\u0645\u0629 \u0627\u0644\u0639\u062C\u0632` }
            ]
          );
        }
      } catch (journalErr) {
        console.error("Shift reconciliation journal failed:", journalErr.message);
      }
    }
    db.prepare(`
      UPDATE safes
      SET status = 'closed', balance = actual_balance, last_closing_date = datetime('now')
      WHERE id = ?
    `).run(safe.id);
    logAudit(user.id, user.name, "\u0627\u0639\u062A\u0645\u0627\u062F \u0625\u063A\u0644\u0627\u0642 \u0635\u0646\u062F\u0648\u0642", `\u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0646\u0647\u0627\u0626\u064A \u0648\u062A\u0635\u0641\u064A\u0629 \u0641\u0631\u0648\u0642\u0627\u062A \u0635\u0646\u062F\u0648\u0642 ${safe.name}`);
    res.json({ success: true, status: "closed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router31.post("/safes/:id/reject-closing", (req, res) => {
  if (!requireAdmin8(req, res)) return;
  const user = getAuthUser(req);
  try {
    const safe = db.prepare("SELECT * FROM safes WHERE id = ?").get(req.params.id);
    if (!safe) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (safe.status !== "pending_approval") {
      res.status(400).json({ error: "\u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0644\u064A\u0633 \u0641\u064A \u062D\u0627\u0644\u0629 \u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F" });
      return;
    }
    db.prepare(`
      UPDATE safes
      SET status = 'open', actual_balance = 0, difference = 0, reconciliation_reason = NULL
      WHERE id = ?
    `).run(safe.id);
    logAudit(user.id, user.name, "\u0631\u0641\u0636 \u0625\u063A\u0644\u0627\u0642 \u0635\u0646\u062F\u0648\u0642", `\u062A\u0645 \u0631\u0641\u0636 \u0625\u063A\u0644\u0627\u0642 \u0635\u0646\u062F\u0648\u0642 ${safe.name} \u0648\u0625\u0639\u0627\u062F\u062A\u0647 \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0641\u0648\u0631\u064A\u0629`);
    res.json({ success: true, status: "open" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
var safes_default = router31;

// artifacts/api-server/src/routes/onyx.ts
var import_express32 = require("express");
var router32 = (0, import_express32.Router)();
function requireAdmin9(req, res) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "developer") {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return false;
  }
  return true;
}
router32.get("/onyx/currencies", (req, res) => {
  try {
    const data = db.prepare("SELECT * FROM currencies ORDER BY id").all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router32.post("/onyx/currencies", (req, res) => {
  if (!requireAdmin9(req, res)) return;
  const user = getAuthUser(req);
  const { name, symbol, fraction, type, exchange_rate } = req.body;
  if (!name || !symbol) {
    res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u0644\u0629 \u0648\u0631\u0645\u0632\u0647\u0627 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
    return;
  }
  try {
    const r = db.prepare(
      "INSERT INTO currencies (name, symbol, fraction, type, exchange_rate) VALUES (?,?,?,?,?)"
    ).run(name, symbol, fraction ?? null, type ?? "foreign", Number(exchange_rate || 1));
    logAudit(user.id, user.name, "\u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u0644\u0629", `\u0639\u0645\u0644\u0629: ${name} (${symbol})`);
    res.status(201).json({ id: r.lastInsertRowid, name, symbol, fraction, type, exchange_rate, active: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router32.put("/onyx/currencies/:id", (req, res) => {
  if (!requireAdmin9(req, res)) return;
  const user = getAuthUser(req);
  const { name, symbol, fraction, type, exchange_rate, active } = req.body;
  try {
    db.prepare(
      "UPDATE currencies SET name=?, symbol=?, fraction=?, type=?, exchange_rate=?, active=? WHERE id=?"
    ).run(name, symbol, fraction ?? null, type ?? "foreign", Number(exchange_rate || 1), active ?? 1, req.params.id);
    logAudit(user.id, user.name, "\u062A\u0639\u062F\u064A\u0644 \u0639\u0645\u0644\u0629", `\u062A\u0639\u062F\u064A\u0644 \u0639\u0645\u0644\u0629 \u0631\u0642\u0645: ${req.params.id} \u0625\u0644\u0649 ${name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router32.delete("/onyx/currencies/:id", (req, res) => {
  if (!requireAdmin9(req, res)) return;
  const user = getAuthUser(req);
  try {
    db.prepare("DELETE FROM currencies WHERE id=?").run(req.params.id);
    logAudit(user.id, user.name, "\u062D\u0630\u0641 \u0639\u0645\u0644\u0629", `\u062D\u0630\u0641 \u0639\u0645\u0644\u0629 \u0631\u0642\u0645: ${req.params.id}`);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router32.get("/onyx/sessions", (req, res) => {
  try {
    const active = db.prepare("SELECT * FROM erp_sessions WHERE status='\u0646\u0634\u0637' OR logout_time IS NULL ORDER BY login_time DESC").all();
    const history = db.prepare("SELECT * FROM erp_sessions ORDER BY login_time DESC LIMIT 100").all();
    res.json({ active, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router32.post("/onyx/sessions/disconnect/:id", (req, res) => {
  if (!requireAdmin9(req, res)) return;
  const user = getAuthUser(req);
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
    db.prepare("UPDATE erp_sessions SET status='\u0642\u0637\u0639 \u0627\u062A\u0635\u0627\u0644', logout_time=? WHERE id=?").run(now, req.params.id);
    logAudit(user.id, user.name, "\u0642\u0637\u0639 \u0627\u062A\u0635\u0627\u0644 \u0645\u0633\u062A\u062E\u062F\u0645", `\u0642\u0637\u0639 \u062C\u0644\u0633\u0629 \u0631\u0642\u0645: ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router32.get("/onyx/branches", (req, res) => {
  try {
    const data = db.prepare("SELECT * FROM branches ORDER BY id").all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router32.put("/onyx/branches/:id", (req, res) => {
  if (!requireAdmin9(req, res)) return;
  const user = getAuthUser(req);
  const {
    name,
    address,
    phone,
    active,
    company_id,
    company_name,
    foreign_name,
    branch_foreign_name,
    group_id,
    header_1,
    header_2,
    header_3,
    header_1_foreign,
    header_2_foreign,
    header_3_foreign,
    tax_id,
    tax_rate,
    commercial_reg,
    lat,
    long,
    city,
    street,
    building
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
      name,
      address ?? null,
      phone ?? null,
      active ?? 1,
      company_id ?? 1,
      company_name ?? null,
      foreign_name ?? null,
      branch_foreign_name ?? null,
      group_id ?? 1,
      header_1 ?? null,
      header_2 ?? null,
      header_3 ?? null,
      header_1_foreign ?? null,
      header_2_foreign ?? null,
      header_3_foreign ?? null,
      tax_id ?? null,
      tax_rate ?? 15,
      commercial_reg ?? null,
      lat ?? null,
      long ?? null,
      city ?? null,
      street ?? null,
      building ?? null,
      req.params.id
    );
    logAudit(user.id, user.name, "\u062A\u062D\u062F\u064A\u062B \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0641\u0631\u0639", `\u0641\u0631\u0639 \u0631\u0642\u0645: ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var onyx_default = router32;

// artifacts/api-server/src/routes/index.ts
var router33 = (0, import_express33.Router)();
router33.use(health_default);
router33.use(auth_default);
router33.use(categories_default);
router33.use(products_default);
router33.use(orders_default);
router33.use(customers_default);
router33.use(users_default);
router33.use(dashboard_default);
router33.use(settings_default);
router33.use(reports_default);
router33.use(print_config_default);
router33.use(print_log_default);
router33.use(printers_default);
router33.use(printer_settings_default);
router33.use(hr_default);
router33.use(returns_default);
router33.use(accounting_default);
router33.use(branches_default);
router33.use(suppliers_default);
router33.use(purchases_default);
router33.use(shifts_default);
router33.use(tables_default);
router33.use(kds_default);
router33.use(recipes_default);
router33.use(expenses_default);
router33.use(licenses_default);
router33.use(audit_default);
router33.use(system_default);
router33.use(document_print_settings_default);
router33.use(inventory_default);
router33.use(safes_default);
router33.use(onyx_default);
var routes_default = router33;

// artifacts/api-server/src/lib/logger.ts
var import_pino = __toESM(require("pino"), 1);
var logger = (0, import_pino.default)({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']"
  ]
});

// artifacts/api-server/src/app.ts
var app = (0, import_express34.default)();
app.use(
  (0, import_pino_http.default)({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0]
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode
        };
      }
    }
  })
);
app.use((0, import_cors.default)());
app.use(import_express34.default.json({ limit: "6mb" }));
app.use(import_express34.default.urlencoded({ extended: true, limit: "6mb" }));
app.use("/api", routes_default);
app.use((req, res, next) => {
  const frontendDist = process.env["FRONTEND_DIST"];
  if (frontendDist) {
    const distPath = import_node_path3.default.resolve(frontendDist);
    import_express34.default.static(distPath)(req, res, next);
  } else {
    next();
  }
});
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.sendStatus(404);
    return;
  }
  const frontendDist = process.env["FRONTEND_DIST"];
  if (frontendDist) {
    const distPath = import_node_path3.default.resolve(frontendDist);
    res.sendFile(import_node_path3.default.join(distPath, "index.html"), (err) => {
      if (err) {
        next();
      }
    });
  } else {
    next();
  }
});
var app_default = app;

// electron-main.ts
import_electron.ipcMain.handle("print-silent", async (event, printerName) => {
  const webContents = event.sender;
  return new Promise((resolve) => {
    webContents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: printerName ? printerName.trim() : ""
      },
      (success, failureReason) => {
        if (!success) {
          console.error("Silent printing failed in main process:", failureReason);
        }
        resolve({ success, failureReason });
      }
    );
  });
});
var userDataPath = import_electron.app.getPath("userData");
var dbPath2 = import_node_path4.default.join(userDataPath, "pos.db");
process.env.DB_PATH = dbPath2;
var isDev = process.env.NODE_ENV === "development";
var frontendDistPath = isDev ? import_node_path4.default.resolve(process.cwd(), "artifacts/pos-system/dist/public") : import_node_path4.default.join(import_electron.app.getAppPath(), "artifacts/pos-system/dist/public");
process.env.FRONTEND_DIST = frontendDistPath;
var mainWindow = null;
var server = null;
function startServer(port) {
  return new Promise((resolve, reject) => {
    server = app_default.listen(port, "127.0.0.1", () => {
      console.log(`Server started internally on port ${port}`);
      resolve();
    });
    server.on("error", (err) => {
      reject(err);
    });
  });
}
async function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1280,
    height: 800,
    title: "\u0646\u0638\u0627\u0645 \u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639 \u0648\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0637\u0627\u0639\u0645 - Restaurant POS System",
    autoHideMenuBar: true,
    // Hide menu bar for a clean desktop feel
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: import_node_path4.default.join(__dirname, "preload.cjs")
    }
  });
  mainWindow.loadURL("http://localhost:3000");
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron.app.whenReady().then(async () => {
  const port = 3e3;
  try {
    await startServer(port);
  } catch (err) {
    console.error("Failed to start server:", err);
  }
  createWindow();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron.app.on("window-all-closed", () => {
  if (server) {
    server.close();
  }
  import_electron.app.quit();
});
