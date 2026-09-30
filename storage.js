// ============================================
// storage.js — OTOP Products SQLite
// ============================================

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// ตรวจสอบและสร้างโฟลเดอร์ data/
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, "products.db");
const db = new Database(DB_PATH);

// เปิดใช้งาน WAL Mode ช่วยเพิ่มความเร็วในการอ่าน-เขียนข้อมูลแบบ Concurrency
db.pragma("journal_mode = WAL");

// สร้างตารางใหม่ (ถ้ายังไม่มี)
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    producer TEXT NOT NULL,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    contact TEXT,
    image_path TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migrate ข้อมูลเริ่มต้น (ถ้าตารางว่าง)
const count = db.prepare("SELECT COUNT(*) as n FROM products").get();

if (count.n === 0) {
  const insert = db.prepare(`
    INSERT INTO products (name, producer, price, category, contact)
    VALUES (?, ?, ?, ?, ?)
  `);

  // ใช้ Transaction เพื่อให้การบันทึกข้อมูลเริ่มต้นทำงานอย่างสมบูรณ์แบบ Atomic
  const seedTransaction = db.transaction((items) => {
    for (const item of items) {
      insert.run(item.name, item.producer, item.price, item.category, item.contact);
    }
  });

  seedTransaction([
    {
      name: "น้ำผึ้งป่าดอกลำไย",
      producer: "กลุ่มเลี้ยงผึ้งบ้านหนองบัว",
      price: 250,
      category: "อาหาร/เครื่องดื่ม",
      contact: "081-234-5678"
    },
    {
      name: "ผ้าไหมมัดหมี่",
      producer: "กลุ่มทอผ้าบ้านหนองแวง",
      price: 850,
      category: "ผ้า/เครื่องแต่งกาย",
      contact: "089-876-5432"
    },
    {
      name: "สบู่สมุนไพรใบเตย",
      producer: "วิสาหกิจชุมชนใบเตยหอม",
      price: 80,
      category: "สมุนไพร/สุขภาพ",
      contact: "092-111-2222"
    }
  ]);

  console.log("📦 เพิ่มข้อมูลเริ่มต้น 3 รายการสำเร็จ");
}

// ============================================
// CRUD Functions
// ============================================

// ดึงรายการสินค้าทั้งหมด
function loadProducts() {
  return db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
}

// ดึงข้อมูลสินค้า 1 รายการตาม ID
function getProductById(id) {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(id);
}

// เพิ่มสินค้าใหม่
function addProduct(product) {
  const stmt = db.prepare(`
    INSERT INTO products (name, producer, price, category, contact, image_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    product.name,
    product.producer,
    Number(product.price) || 0,
    product.category,
    product.contact || null,
    product.image_path || null
  );

  return getProductById(result.lastInsertRowid);
}

// แก้ไขข้อมูลสินค้า
function updateProduct(id, data) {
  const existing = getProductById(id);
  if (!existing) return null;

  // หากไม่มีการส่งภาพใหม่เข้ามา (undefined) ให้คงใช้ภาพเดิมในฐานข้อมูล
  const imagePath = data.image_path !== undefined ? data.image_path : existing.image_path;

  const stmt = db.prepare(`
    UPDATE products 
    SET name = ?, producer = ?, price = ?, category = ?, contact = ?, image_path = ?
    WHERE id = ?
  `);

  const result = stmt.run(
    data.name,
    data.producer,
    Number(productPrice(data.price)),
    data.category,
    data.contact || null,
    imagePath,
    id
  );

  if (result.changes === 0) return null;
  return getProductById(id);
}

// ลบสินค้า (คืนค่า object สินค้าเดิม เพื่อให้นำ image_path ไปลบไฟล์ในอาร์ดิสก์ต่อได้)
function deleteProduct(id) {
  const existing = getProductById(id);
  if (!existing) return null;

  const stmt = db.prepare("DELETE FROM products WHERE id = ?");
  const result = stmt.run(id);

  return result.changes > 0 ? existing : null;
}

// Helper แปลงราคาเป็นตัวเลข
function productPrice(price) {
  const parsed = Number(price);
  return isNaN(parsed) ? 0 : parsed;
}

module.exports = {
  loadProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct
};