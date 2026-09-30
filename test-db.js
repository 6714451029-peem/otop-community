// =================================================
// test-db.js - ทดสอบ SQLite
// =================================================

const Database = require("better-sqlite3");

// เปิด/สร้างไฟล์ database
const db = new Database("data/products.db");
console.log("✅ เปิด database สำเร็จ");

// =================================================
// 1. สร้างตาราง (ทำครั้งเดียว)
// =================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL
    )
`);

console.log("✅ สร้างตาราง products");

// =================================================
// 2. INSERT ข้อมูลเริ่มต้น (ถ้ายังว่าง)
// =================================================
const count = db.prepare("SELECT COUNT(*) as n FROM products").get();
console.log(`📦 มีสินค้าในฐานข้อมูล: ${count.n} ตัว`);

if (count.n === 0) {
    const insert = db.prepare(
        "INSERT INTO products (name, price) VALUES (?, ?)"
    );

    insert.run("ทุเรียนหมอนทอง", 280);
    insert.run("มังคุด", 120);
    insert.run("เงาะโรงเรียน", 80);
    console.log("✅ เพิ่มข้อมูลเริ่มต้น 3 ตัว");
}

// ==============================================
// 3. SELECT
// ==============================================

const allProducts = db.prepare("SELECT * FROM products").all();
console.log("\n📦 สินค้าทั้งหมด:");
console.log(allProducts);

// ==============================================
// 4. SELECT WHERE
// ==============================================

const cheapProducts = db.prepare("SELECT * FROM products WHERE price < ?").all(200);
console.log("\n💰 สินค้าราคาต่ำกว่า 200:");
console.log(cheapProducts);

// ปิด db
db.close();
console.log("\n✅ ปิด database");