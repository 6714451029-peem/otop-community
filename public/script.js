// ============================================
// Helper Functions
// ============================================

// ฟังก์ชันป้องกัน XSS Injection ก่อนนำข้อความไปแสดงใน HTML
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================
// Load & Render Products
// ============================================

async function loadProducts() {
  const container = document.getElementById("products-container");
  if (!container) return;

  container.innerHTML = "<p style='text-align:center;'>กำลังโหลด...</p>";

  try {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูลสินค้าได้");

    const products = await response.json();

    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML = "<p style='text-align:center;'>ยังไม่มีผลิตภัณฑ์</p>";
      return;
    }

    container.innerHTML = "";

    products.forEach(product => {
      const card = document.createElement("article");
      card.className = "card";

      const formattedPrice = Number(product.price || 0).toLocaleString();
      const safeName = escapeHtml(product.name);
      const safeCategory = escapeHtml(product.category);
      const safeProducer = escapeHtml(product.producer);
      const safeContact = escapeHtml(product.contact);
      const safeImagePath = escapeHtml(product.image_path);

      card.innerHTML = `
        ${safeImagePath ? `
          <div class="card-image">
            <img src="${safeImagePath}" alt="${safeName}">
          </div>` : `
          <div class="card-image no-image">
            <span>📷 ไม่มีรูปภาพ</span>
          </div>`
        }
        <div class="card-content">
          <div class="card-header">
            <h3>${safeName}</h3>
            <span class="category-badge">${safeCategory}</span>
          </div>
          <p class="producer">👥 ${safeProducer}</p>
          ${safeContact ? `<p class="contact">📞 ${safeContact}</p>` : ""}
          <div class="card-footer">
            <span class="price">฿ ${formattedPrice}</span>
            <div class="card-actions">
              <button class="edit-btn" data-id="${product.id}">✏️ แก้</button>
              <button class="delete-btn" data-id="${product.id}">🗑️ ลบ</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (error) {
    container.innerHTML = `<p style="color:red; text-align:center;">Error: ${error.message}</p>`;
  }
}

// ============================================
// Event Delegation for Card Actions (Edit / Delete)
// ============================================

function setupProductActions() {
  const container = document.getElementById("products-container");
  if (!container) return;

  container.addEventListener("click", async (event) => {
    const deleteBtn = event.target.closest(".delete-btn");
    const editBtn = event.target.closest(".edit-btn");

    // Action: ลบสินค้า
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const card = deleteBtn.closest(".card");
      const productName = card?.querySelector("h3")?.textContent || "รายการนี้";

      if (!confirm(`ยืนยันลบ "${productName}"?`)) return;

      try {
        const response = await fetch(`/api/products/${id}`, {
          method: "DELETE"
        });

        if (!response.ok) throw new Error("ลบไม่สำเร็จ");

        loadProducts();
      } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
      }
    }

    // Action: แก้ไขสินค้า
    if (editBtn) {
      const id = editBtn.dataset.id;
      try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) throw new Error("ดึงข้อมูลสินค้าไม่สำเร็จ");

        const product = await response.json();
        openEditModal(product);
      } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
      }
    }
  });
}

// ============================================
// Add Product Form
// ============================================

const addForm = document.getElementById("add-product-form");

if (addForm) {
  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("name", document.getElementById("product-name")?.value || "");
    formData.append("producer", document.getElementById("product-producer")?.value || "");
    formData.append("price", document.getElementById("product-price")?.value || "");
    formData.append("category", document.getElementById("product-category")?.value || "");
    formData.append("contact", document.getElementById("product-contact")?.value || "");

    const fileInput = document.getElementById("product-image");
    if (fileInput && fileInput.files[0]) {
      formData.append("image", fileInput.files[0]);
    }

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "เพิ่มไม่สำเร็จ");
      }

      addForm.reset();
      loadProducts();
      alert("✅ เพิ่มผลิตภัณฑ์สำเร็จ");

    } catch (error) {
      alert("❌ เกิดข้อผิดพลาด: " + error.message);
    }
  });
}

// ============================================
// Edit Modal Controls
// ============================================

const modal = document.getElementById("edit-modal");
const closeBtn = document.getElementById("modal-close");
const cancelBtn = document.getElementById("cancel-btn");
const editForm = document.getElementById("edit-form");

function openEditModal(product) {
  if (!modal) return;

  const setInputValue = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setInputValue("edit-id", product.id);
  setInputValue("edit-name", product.name);
  setInputValue("edit-producer", product.producer);
  setInputValue("edit-price", product.price);
  setInputValue("edit-category", product.category);
  setInputValue("edit-contact", product.contact);

  const imageInput = document.getElementById("edit-image");
  if (imageInput) imageInput.value = ""; // ล้างไฟล์รูปภาพเดิมที่ค้างใน input

  modal.classList.remove("hidden");
}

function closeEditModal() {
  if (!modal) return;
  modal.classList.add("hidden");
  if (editForm) editForm.reset();
}

if (closeBtn) closeBtn.addEventListener("click", closeEditModal);
if (cancelBtn) cancelBtn.addEventListener("click", closeEditModal);

if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeEditModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal && !modal.classList.contains("hidden")) {
    closeEditModal();
  }
});

// Submit Edit Form
if (editForm) {
  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = document.getElementById("edit-id")?.value;
    if (!id) {
      alert("❌ ไม่พบรหัสผลิตภัณฑ์ที่ต้องการแก้ไข");
      return;
    }

    const formData = new FormData();
    formData.append("name", document.getElementById("edit-name")?.value || "");
    formData.append("producer", document.getElementById("edit-producer")?.value || "");
    formData.append("price", document.getElementById("edit-price")?.value || "");
    formData.append("category", document.getElementById("edit-category")?.value || "");
    formData.append("contact", document.getElementById("edit-contact")?.value || "");

    const imageInput = document.getElementById("edit-image");
    if (imageInput && imageInput.files[0]) {
      formData.append("image", imageInput.files[0]);
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "แก้ไขไม่สำเร็จ");
      }

      closeEditModal();
      loadProducts();
      alert("✅ บันทึกสำเร็จ");

    } catch (error) {
      alert("❌ " + error.message);
    }
  });
}

// ============================================
// Initialize App
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  setupProductActions();
});