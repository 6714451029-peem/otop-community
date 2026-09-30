// ============================================
// app.js — OTOP Backend Server
// ============================================

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  loadProducts,
  getProductById,
  addProduct,
  deleteProduct,
  updateProduct
} = require("./storage");

const app = express();


app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ============================================
// 🖼 Multer Setup & Helper
// ============================================
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัด 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);

    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error("ไฟล์รูปภาพต้องเป็น jpg, jpeg, png หรือ webp เท่านั้น"));
    }
  }
});

// Helper สำหรับลบไฟล์รูปภาพในดิสก์อย่างปลอดภัย
function removeFile(relativePath) {
  if (!relativePath) return;
  const fullPath = path.join(__dirname, "public", relativePath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`🗑️ ลบไฟล์สำเร็จ: ${relativePath}`);
    } catch (err) {
      console.error(`❌ ไม่สามารถลบไฟล์ ${relativePath}:`, err.message);
    }
  }
}

// ============================================
// API Routes
// ============================================

// GET รายการทั้งหมด
app.get("/api/products", (req, res) => {
  try {
    const products = loadProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลผลิตภัณฑ์ได้" });
  }
});

// GET รายการเดียวตาม ID
app.get("/api/products/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID ไม่ถูกต้อง" });

  const product = getProductById(id);
  if (!product) return res.status(404).json({ error: "ไม่พบผลิตภัณฑ์" });
  res.json(product);
});

// POST เพิ่มสินค้าใหม่
app.post("/api/products", upload.single("image"), (req, res) => {
  try {
    const { name, producer, price, category, contact } = req.body;

    // ตรวจสอบข้อมูลบังคับ
    if (!name || !producer || !price || !category) {
      // หากข้อมูลไม่ครบ ให้ลบไฟล์รูปภาพที่เพิ่งอัปโหลดขึ้นมาทันที
      if (req.file) removeFile(`/uploads/${req.file.filename}`);
      return res.status(400).json({
        error: "กรุณาระบุข้อมูลให้ครบถ้วน (ชื่อ, ผู้ผลิต, ราคา, หมวดหมู่)"
      });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const newProduct = addProduct({
      name: name.trim(),
      producer: producer.trim(),
      price: Number(price),
      category: category.trim(),
      contact: contact ? contact.trim() : null,
      image_path: imagePath
    });

    res.status(201).json(newProduct);

  } catch (error) {
    if (req.file) removeFile(`/uploads/${req.file.filename}`);
    res.status(500).json({ error: error.message });
  }
});

// PUT แก้ไขข้อมูลสินค้าตาม ID
app.put("/api/products/:id", upload.single("image"), (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      if (req.file) removeFile(`/uploads/${req.file.filename}`);
      return res.status(400).json({ error: "ID ไม่ถูกต้อง" });
    }

    const existingProduct = getProductById(id);
    if (!existingProduct) {
      if (req.file) removeFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({ error: "ไม่พบผลิตภัณฑ์" });
    }

    const { name, producer, price, category, contact } = req.body;

    if (!name || !producer || !price || !category) {
      if (req.file) removeFile(`/uploads/${req.file.filename}`);
      return res.status(400).json({ error: "กรุณาระบุข้อมูลให้ครบถ้วน" });
    }

    let imagePath = existingProduct.image_path;

    // กรณีอัปโหลดรูปใหม่ ให้ลบรูปเก่าออกจากโฟลเดอร์ uploads
    if (req.file) {
      if (existingProduct.image_path) {
        removeFile(existingProduct.image_path);
      }
      imagePath = `/uploads/${req.file.filename}`;
    }

    const updated = updateProduct(id, {
      name: name.trim(),
      producer: producer.trim(),
      price: Number(price),
      category: category.trim(),
      contact: contact ? contact.trim() : null,
      image_path: imagePath
    });

    res.json(updated);

  } catch (error) {
    if (req.file) removeFile(`/uploads/${req.file.filename}`);
    res.status(500).json({ error: error.message });
  }
});

// DELETE ลบสินค้าตาม ID
app.delete("/api/products/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "ID ไม่ถูกต้อง" });

    const deletedProduct = deleteProduct(id);
    if (!deletedProduct) {
      return res.status(404).json({ error: "ไม่พบผลิตภัณฑ์ที่ต้องการลบ" });
    }

    // ลบไฟล์รูปภาพจริงในอาร์ดดิสก์
    if (deletedProduct.image_path) {
      removeFile(deletedProduct.image_path);
    }

    res.json({ message: "ลบสำเร็จ", deleted: deletedProduct });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Error Handling Middleware
// ============================================
app.use((err, req, res, next) => {
  // หากเกิด Error ระหว่างกระบวนการอัปโหลด ให้ลบไฟล์รูปภาพค้างส่ง (ถ้ามี)
  if (req.file) removeFile(`/uploads/${req.file.filename}`);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "ขนาดไฟล์รูปภาพเกินกำหนด (สูงสุด 5MB)" });
    }
    return res.status(400).json({ error: `อัปโหลดไฟล์ไม่สำเร็จ: ${err.message}` });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  next();
});

// Start Server

// app.listen(3000, () => {
//   console.log("🚀 http://localhost:3000");
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});