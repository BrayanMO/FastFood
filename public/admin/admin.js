/**
 * Lógica del Panel de Control de Rest FastFood
 * Con estandarización uniforme de imágenes, multiselección y ordenamiento Drag & Drop
 */

let authToken = localStorage.getItem('fastfood_admin_token') || '';
let allProducts = [];
let allCategories = [];
let currentProductImages = [];
let draggedImageIndex = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNavigation();
  initProductCrud();
  initSettings();
  setupDropzoneEvents();
});

// Toast Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---------------- AUTENTICACIÓN ----------------
function initAuth() {
  const overlay = document.getElementById('login-overlay');
  const layout = document.getElementById('admin-layout');
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('btn-logout');

  if (authToken) {
    verifyToken(authToken);
  } else {
    showLogin();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('login-password').value;
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          authToken = data.token;
          localStorage.setItem('fastfood_admin_token', authToken);
          hideLogin();
          loadDashboardData();
        } else {
          alert('Contraseña incorrecta');
        }
      } catch (err) {
        alert('Error al conectar con el servidor');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('fastfood_admin_token');
      authToken = '';
      showLogin();
    });
  }
}

async function verifyToken(token) {
  try {
    const res = await fetch('/api/admin/verify', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      hideLogin();
      loadDashboardData();
    } else {
      showLogin();
    }
  } catch (e) {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-overlay').style.display = 'flex';
  document.getElementById('admin-layout').style.display = 'none';
}

function hideLogin() {
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('admin-layout').style.display = 'flex';
}

// ---------------- NAVEGACIÓN TABS ----------------
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.admin-tab-content');
  const pageTitle = document.getElementById('page-title');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));

      item.classList.add('active');
      const tabId = item.dataset.tab;
      const targetContent = document.getElementById(tabId);
      if (targetContent) targetContent.classList.add('active');

      if (tabId === 'tab-products') pageTitle.textContent = 'Gestión de Platos & Menú';
      else if (tabId === 'tab-categories') pageTitle.textContent = 'Gestión de Categorías';
      else if (tabId === 'tab-extras') pageTitle.textContent = 'Gestión de Extras, Cremas & Guarniciones';
      else if (tabId === 'tab-settings') pageTitle.textContent = 'Ajustes del Restaurante';
    });
  });

  // Quick toggle local abierto/cerrado
  const quickToggleBtn = document.getElementById('btn-quick-toggle-store');
  if (quickToggleBtn) {
    quickToggleBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/settings/toggle-open', {
          method: 'PATCH',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const data = await res.json();
        updateQuickStoreUI(data.isOpen);
        showToast(data.isOpen ? 'Local marcado como ABIERTO' : 'Local marcado como CERRADO', 'info');
      } catch (err) {
        console.error(err);
      }
    });
  }
}

function updateQuickStoreUI(isOpen) {
  const dot = document.getElementById('quick-store-dot');
  const text = document.getElementById('quick-store-text');
  if (dot && text) {
    if (isOpen) {
      dot.classList.remove('closed');
      text.textContent = 'Local Abierto';
    } else {
      dot.classList.add('closed');
      text.textContent = 'Local Cerrado';
    }
  }
}

// ---------------- CARGA DE DATOS ----------------
async function loadDashboardData() {
  await Promise.all([
    loadCategories(),
    loadProducts(),
    loadSettings(),
    loadExtrasAndSauces()
  ]);
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    allCategories = await res.json();
    renderCategoriesTable();
    populateCategoryDropdowns();
  } catch (err) {
    console.error(err);
  }
}

function renderCategoriesTable() {
  const tbody = document.getElementById('admin-categories-tbody');
  if (!tbody) return;
  tbody.innerHTML = allCategories.map(cat => `
    <tr>
      <td style="font-size: 1.5rem;">${cat.icon || '🍔'}</td>
      <td><strong>${cat.name}</strong></td>
      <td>
        <button type="button" class="btn-action-delete" onclick="deleteCategory('${cat.name}')" title="Eliminar categoría">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function populateCategoryDropdowns() {
  const filterCat = document.getElementById('filter-category');
  const crudCat = document.getElementById('crud-category');

  if (filterCat) {
    filterCat.innerHTML = '<option value="Todos">Todas las categorías</option>' + 
      allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }

  if (crudCat) {
    crudCat.innerHTML = allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }
}

window.deleteCategory = async function(catName) {
  if (!confirm('¿Eliminar la categoría "' + catName + '"?')) return;
  try {
    const res = await fetch('/api/categories/' + encodeURIComponent(catName), {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (res.ok) {
      showToast('Categoría eliminada', 'info');
      loadCategories();
    }
  } catch (err) {
    alert('Error al eliminar categoría');
  }
};

const formCat = document.getElementById('form-create-category');
if (formCat) {
  formCat.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-cat-name').value.trim();
    const icon = document.getElementById('new-cat-icon').value.trim() || '🍽️';
    if (!name) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({ name, icon })
      });
      if (res.ok) {
        showToast('Categoría creada con éxito', 'success');
        formCat.reset();
        loadCategories();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al crear');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  });
}

// ---------------- GESTIÓN DE PLATOS (CARDS UNIFORMES) ----------------
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    allProducts = await res.json();
    renderProductsList();
  } catch (err) {
    console.error(err);
  }
}

function escapeHtml(t) {
  return String(t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderProductsList() {
  const container = document.getElementById('admin-products-list');
  if (!container) return;

  const searchVal = (document.getElementById('search-product')?.value || '').toLowerCase();
  const filterCat = document.getElementById('filter-category')?.value || 'Todos';

  let list = allProducts;
  if (filterCat !== 'Todos') {
    list = list.filter(p => p.category === filterCat);
  }
  if (searchVal) {
    list = list.filter(p => p.name.toLowerCase().includes(searchVal) || (p.description && p.description.toLowerCase().includes(searchVal)));
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: #94a3b8;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🍽️</div>
        <h4 style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem;">No se encontraron platos</h4>
        <p style="font-size: 0.85rem;">Prueba con otra búsqueda o añade un plato nuevo con el botón superior.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(prod => {
    const isSoldOut = prod.available === false;
    const coverPhoto = (prod.images && prod.images[0]) || prod.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80';

    return `
      <article class="admin-prod-card ${isSoldOut ? 'sold-out-card' : ''}" data-id="${prod.id}">
        <!-- Foto y Badges Flotantes -->
        <div class="admin-prod-media">
          <img src="${coverPhoto}" alt="${escapeHtml(prod.name)}" loading="lazy" />
          
          <!-- Badge de Disponibilidad (Interactivo, elegante estilo Apple) -->
          <button type="button" class="admin-avail-pill ${isSoldOut ? 'is-out' : 'is-ok'}" onclick="toggleSoldOut('${prod.id}')" title="Haz clic para alternar disponibilidad">
            <span class="status-dot"></span>
            <span>${isSoldOut ? 'Agotado' : 'Disponible'}</span>
          </button>

          <!-- Badge Destacado -->
          ${prod.badge ? `<span class="admin-promo-badge">${escapeHtml(prod.badge)}</span>` : ''}

          <!-- Overlay si está agotado -->
          ${isSoldOut ? '<div class="admin-soldout-overlay"><span>AGOTADO HOY</span></div>' : ''}
        </div>

        <!-- Contenido Minimalista -->
        <div class="admin-prod-content">
          <div class="admin-card-header-row">
            <span class="admin-prod-cat">${escapeHtml(prod.category)}</span>
            <span class="admin-prod-price">S/ ${parseFloat(prod.price).toFixed(2)}</span>
          </div>

          <h4 class="admin-prod-title" title="${escapeHtml(prod.name)}">${escapeHtml(prod.name)}</h4>

          <!-- Botonera Minimalista -->
          <div class="admin-prod-actions">
            <button type="button" class="btn-action-edit" onclick="editProduct('${prod.id}')" title="Editar plato">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              <span>Editar</span>
            </button>
            <button type="button" class="btn-action-delete" onclick="deleteProduct('${prod.id}')" title="Eliminar plato">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

document.getElementById('search-product')?.addEventListener('input', renderProductsList);
document.getElementById('filter-category')?.addEventListener('change', renderProductsList);

window.toggleSoldOut = async function(id) {
  try {
    const res = await fetch('/api/products/' + id + '/toggle', {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (res.ok) {
      loadProducts();
    }
  } catch (err) {
    alert('Error al cambiar disponibilidad');
  }
};

window.deleteProduct = async function(id) {
  if (!confirm('¿Seguro que deseas eliminar este plato?')) return;
  try {
    const res = await fetch('/api/products/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (res.ok) {
      showToast('Plato eliminado', 'info');
      loadProducts();
    }
  } catch (err) {
    alert('Error al eliminar');
  }
};

// ==========================================================================
// ESTANDARIZACIÓN AUTOMÁTICA DE IMÁGENES CON CANVAS (800x600 px - Proporción 4:3)
// ==========================================================================
function normalizeImageFile(file, targetWidth = 800, targetHeight = 600, quality = 0.88) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        // Cálculo de recorte cover centrado
        const targetRatio = targetWidth / targetHeight;
        const sourceRatio = img.width / img.height;
        let sourceX = 0;
        let sourceY = 0;
        let sourceW = img.width;
        let sourceH = img.height;

        if (sourceRatio > targetRatio) {
          sourceW = img.height * targetRatio;
          sourceX = (img.width - sourceW) / 2;
        } else {
          sourceH = img.width / targetRatio;
          sourceY = (img.height - sourceH) / 2;
        }

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, targetWidth, targetHeight);

        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          const standardizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "-fastfood.jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(standardizedFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// Subida individual con estandarización
async function uploadSingleFile(file) {
  if (!file) return null;
  try {
    const processedFile = await normalizeImageFile(file, 800, 600, 0.88);
    const formData = new FormData();
    formData.append('image', processedFile);

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + authToken },
      body: formData
    });

    const data = await res.json();
    return data.url || data.secure_url || null;
  } catch (error) {
    console.error('Error al subir imagen:', error);
    return null;
  }
}

// ==========================================================================
// DROPZONE, MULTISELECCIÓN Y ARRASTRE DE FOTOS (DRAG & DROP)
// ==========================================================================
function setupDropzoneEvents() {
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('file-upload-input');
  const btnAddUrl = document.getElementById('btn-add-image-url');
  const inputUrl = document.getElementById('input-image-url');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await handleFilesSelection(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files.length > 0) {
        await handleFilesSelection(fileInput.files);
        fileInput.value = '';
      }
    });
  }

  if (btnAddUrl && inputUrl) {
    btnAddUrl.addEventListener('click', () => {
      const url = inputUrl.value.trim();
      if (url) {
        currentProductImages.push(url);
        renderImagePreviews();
        inputUrl.value = '';
        showToast('Enlace de imagen agregado', 'success');
      }
    });
  }
}

async function handleFilesSelection(filesList) {
  const files = Array.from(filesList);
  showToast(`Procesando y estandarizando ${files.length} foto(s)...`, 'info');

  for (const file of files) {
    const uploadedUrl = await uploadSingleFile(file);
    if (uploadedUrl) {
      currentProductImages.push(uploadedUrl);
      renderImagePreviews();
    }
  }
  showToast('Fotos cargadas con éxito', 'success');
}

function renderImagePreviews() {
  const container = document.getElementById('images-preview-list');
  if (!container) return;

  if (currentProductImages.length === 0) {
    container.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem 0;">No hay fotos cargadas aún.</span>';
    return;
  }

  container.innerHTML = currentProductImages.map((url, index) => `
    <div class="image-preview-item ${index === 0 ? 'is-cover' : ''}" draggable="true" data-index="${index}" title="Arrastra para reordenar la foto">
      <span class="preview-order-badge ${index === 0 ? 'badge-cover' : ''}">
        ${index === 0 ? '★ Portada' : '#' + (index + 1)}
      </span>
      <img src="${url}" alt="Foto ${index + 1}" draggable="false" />

      <div class="image-preview-actions">
        ${index > 0 ? `<button type="button" class="img-move-btn" onclick="event.stopPropagation(); moveImage(${index}, -1)" title="Mover a la izquierda">◀</button>` : '<span></span>'}
        ${index < currentProductImages.length - 1 ? `<button type="button" class="img-move-btn" onclick="event.stopPropagation(); moveImage(${index}, 1)" title="Mover a la derecha">▶</button>` : '<span></span>'}
      </div>

      <button type="button" class="image-remove-btn" onclick="event.stopPropagation(); removeImage(${index})" title="Quitar foto">&times;</button>
    </div>
  `).join('');

  // Eventos de Drag & Drop para ordenar
  const items = container.querySelectorAll('.image-preview-item');
  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedImageIndex = parseInt(item.dataset.index, 10);
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedImageIndex);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      items.forEach(i => i.classList.remove('drag-over'));
      draggedImageIndex = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const targetIndex = parseInt(item.dataset.index, 10);
      if (draggedImageIndex !== null && draggedImageIndex !== targetIndex) {
        const [movedUrl] = currentProductImages.splice(draggedImageIndex, 1);
        currentProductImages.splice(targetIndex, 0, movedUrl);
        renderImagePreviews();
      }
    });
  });
}

window.moveImage = (index, delta) => {
  const newIndex = index + delta;
  if (newIndex >= 0 && newIndex < currentProductImages.length) {
    const [moved] = currentProductImages.splice(index, 1);
    currentProductImages.splice(newIndex, 0, moved);
    renderImagePreviews();
  }
};

window.removeImage = (index) => {
  currentProductImages.splice(index, 1);
  renderImagePreviews();
};

// ---------------- MODAL CRUD PLATO ----------------
function initProductCrud() {
  const btnAdd = document.getElementById('btn-add-product');
  const btnClose = document.getElementById('btn-close-crud');
  const btnCancel = document.getElementById('btn-cancel-crud');
  const backdrop = document.getElementById('product-crud-backdrop');
  const form = document.getElementById('form-product-crud');

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openProductCrudModal(null);
    });
  }

  if (btnClose) btnClose.addEventListener('click', closeProductCrudModal);
  if (btnCancel) btnCancel.addEventListener('click', closeProductCrudModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('crud-prod-id').value;
      const name = document.getElementById('crud-name').value.trim();
      const category = document.getElementById('crud-category').value;
      const price = parseFloat(document.getElementById('crud-price').value) || 0;
      const description = document.getElementById('crud-desc').value.trim();
      const badge = document.getElementById('crud-badge').value.trim();
      const allowSides = document.getElementById('crud-allow-sides').checked;
      const allowSauces = document.getElementById('crud-allow-sauces').checked;
      const allowExtras = document.getElementById('crud-allow-extras') ? document.getElementById('crud-allow-extras').checked : true;

      const coverImage = currentProductImages[0] || '';

      const payload = {
        name,
        category,
        price,
        description,
        imageUrl: coverImage,
        images: currentProductImages,
        badge,
        allowSides,
        allowSauces,
        allowExtras
      };

      try {
        let res;
        if (id) {
          res = await fetch('/api/products/' + id, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify(payload)
          });
        } else {
          res = await fetch('/api/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify(payload)
          });
        }

        if (res.ok) {
          showToast('Plato guardado con éxito', 'success');
          closeProductCrudModal();
          loadProducts();
        } else {
          alert('Error al guardar plato');
        }
      } catch (err) {
        alert('Error de conexión');
      }
    });
  }
}

function openProductCrudModal(product) {
  const backdrop = document.getElementById('product-crud-backdrop');
  const title = document.getElementById('crud-modal-title');
  const form = document.getElementById('form-product-crud');
  form.reset();
  currentProductImages = [];

  if (product) {
    title.textContent = 'Editar Plato: ' + product.name;
    document.getElementById('crud-prod-id').value = product.id;
    document.getElementById('crud-name').value = product.name;
    document.getElementById('crud-category').value = product.category;
    document.getElementById('crud-price').value = product.price;
    document.getElementById('crud-desc').value = product.description || '';
    document.getElementById('crud-badge').value = product.badge || '';
    document.getElementById('crud-allow-sides').checked = !!product.allowSides;
    document.getElementById('crud-allow-sauces').checked = product.allowSauces !== false;
    const extrasEl = document.getElementById('crud-allow-extras');
    if (extrasEl) extrasEl.checked = product.allowExtras !== false;

    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      currentProductImages = [...product.images];
    } else if (product.imageUrl) {
      currentProductImages = [product.imageUrl];
    }
  } else {
    title.textContent = 'Nuevo Plato de Comida';
    document.getElementById('crud-prod-id').value = '';
    document.getElementById('crud-allow-sides').checked = true;
    document.getElementById('crud-allow-sauces').checked = true;
    const extrasEl = document.getElementById('crud-allow-extras');
    if (extrasEl) extrasEl.checked = true;
  }

  renderImagePreviews();
  backdrop.classList.add('active');
}

function closeProductCrudModal() {
  document.getElementById('product-crud-backdrop').classList.remove('active');
  currentProductImages = [];
}

window.editProduct = function(id) {
  const prod = allProducts.find(p => p.id === id);
  if (prod) openProductCrudModal(prod);
};

// ---------------- AJUSTES DE TIENDA ----------------
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const s = await res.json();
    if (!s) return;

    updateQuickStoreUI(s.isOpen);

    document.getElementById('setting-store-name').value = s.storeName || '';
    document.getElementById('setting-whatsapp').value = s.whatsappNumber || '';
    document.getElementById('setting-hours').value = s.openingHours || '';
    document.getElementById('setting-estimated-time').value = s.estimatedTime || '';

    if (s.banner) {
      document.getElementById('setting-banner-text').value = s.banner.text || '';
    }

    if (s.hero) {
      document.getElementById('setting-hero-image').value = s.hero.imageUrl || '';
      document.getElementById('setting-hero-title').value = s.hero.title || '';
      document.getElementById('setting-hero-desc').value = s.hero.description || '';
    }

    if (s.paymentMethods) {
      document.getElementById('setting-yape-number').value = s.paymentMethods.yape?.number || '';
      document.getElementById('setting-yape-holder').value = s.paymentMethods.yape?.holder || '';
      document.getElementById('setting-plin-number').value = s.paymentMethods.plin?.number || '';
      document.getElementById('setting-plin-holder').value = s.paymentMethods.plin?.holder || '';
    }
  } catch (err) {
    console.error(err);
  }
}

function initSettings() {
  const btnSave = document.getElementById('btn-save-settings');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      btnSave.disabled = true;
      btnSave.textContent = 'Guardando...';

      const payload = {
        storeName: document.getElementById('setting-store-name').value.trim(),
        whatsappNumber: document.getElementById('setting-whatsapp').value.trim(),
        openingHours: document.getElementById('setting-hours').value.trim(),
        estimatedTime: document.getElementById('setting-estimated-time').value.trim(),
        banner: {
          text: document.getElementById('setting-banner-text').value.trim()
        },
        hero: {
          imageUrl: document.getElementById('setting-hero-image').value.trim(),
          title: document.getElementById('setting-hero-title').value.trim(),
          description: document.getElementById('setting-hero-desc').value.trim()
        },
        paymentMethods: {
          yape: {
            enabled: true,
            number: document.getElementById('setting-yape-number').value.trim(),
            holder: document.getElementById('setting-yape-holder').value.trim()
          },
          plin: {
            enabled: true,
            number: document.getElementById('setting-plin-number').value.trim(),
            holder: document.getElementById('setting-plin-holder').value.trim()
          }
        }
      };

      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast('¡Ajustes guardados con éxito!', 'success');
        } else {
          alert('Error al guardar ajustes');
        }
      } catch (err) {
        alert('Error de conexión');
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = '💾 Guardar Todos los Ajustes';
      }
    });
  }
}

// ==========================================================================
// GESTIÓN DE EXTRAS, SALSAS Y GUARNICIONES
// ==========================================================================
let currentExtras = [];
let currentSauces = [];
let currentSides = [];

async function loadExtrasAndSauces() {
  try {
    const res = await fetch('/api/extras');
    const data = await res.json();
    currentExtras = data.extras || [];
    currentSauces = data.sauces || [];
    currentSides = data.sides || [];

    renderExtrasTable();
    renderSaucesList();
    renderSidesList();
  } catch (err) {
    console.error('Error al cargar extras:', err);
  }
}

function renderExtrasTable() {
  const tbody = document.getElementById('extras-table-body');
  if (!tbody) return;

  if (currentExtras.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No hay adicionales creados aún.</td></tr>';
    return;
  }

  tbody.innerHTML = currentExtras.map(ext => `
    <tr>
      <td><strong>${ext.name}</strong></td>
      <td style="font-weight: 800; color: var(--text-primary);">+ S/ ${parseFloat(ext.price).toFixed(2)}</td>
      <td style="text-align: center;">
        <button type="button" class="btn-toggle-sold ${!ext.active ? 'is-sold-out' : ''}" onclick="toggleExtra('${ext.id}')">
          ${ext.active ? '🟢 Activo' : '🔴 Inactivo'}
        </button>
      </td>
      <td style="text-align: right;">
        <button type="button" class="btn-action-delete" onclick="deleteExtra('${ext.id}')" title="Eliminar adicional">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function renderSaucesList() {
  const container = document.getElementById('sauces-chips-list');
  if (!container) return;

  if (currentSauces.length === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">No hay cremas registradas.</span>';
    return;
  }

  container.innerHTML = currentSauces.map(sauce => `
    <span style="display: inline-flex; align-items: center; gap: 0.4rem; background: var(--bg-muted); border: 1px solid var(--border-light); padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
      🥫 ${sauce}
      <button type="button" onclick="deleteSauce('${sauce}')" style="background: none; border: none; color: var(--danger); font-size: 1rem; cursor: pointer; line-height: 1; padding: 0 2px;">&times;</button>
    </span>
  `).join('');
}

function renderSidesList() {
  const container = document.getElementById('sides-chips-list');
  if (!container) return;

  if (currentSides.length === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">No hay guarniciones registradas.</span>';
    return;
  }

  container.innerHTML = currentSides.map(side => `
    <span style="display: inline-flex; align-items: center; gap: 0.4rem; background: var(--bg-muted); border: 1px solid var(--border-light); padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
      🍟 ${side}
      <button type="button" onclick="deleteSide('${side}')" style="background: none; border: none; color: var(--danger); font-size: 1rem; cursor: pointer; line-height: 1; padding: 0 2px;">&times;</button>
    </span>
  `).join('');
}

// Eventos de creación
document.getElementById('form-create-extra')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('new-extra-name').value.trim();
  const price = parseFloat(document.getElementById('new-extra-price').value) || 0;
  if (!name) return;

  try {
    const res = await fetch('/api/extras', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: JSON.stringify({ name, price })
    });
    if (res.ok) {
      showToast('Adicional creado con éxito', 'success');
      document.getElementById('form-create-extra').reset();
      loadExtrasAndSauces();
    }
  } catch (err) {
    showToast('Error al crear adicional', 'error');
  }
});

document.getElementById('form-create-sauce')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('new-sauce-name').value.trim();
  if (!name) return;

  try {
    const res = await fetch('/api/sauces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      showToast('Salsa agregada con éxito', 'success');
      document.getElementById('form-create-sauce').reset();
      loadExtrasAndSauces();
    }
  } catch (err) {
    showToast('Error al agregar salsa', 'error');
  }
});

document.getElementById('form-create-side')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('new-side-name').value.trim();
  if (!name) return;

  if (!currentSides.includes(name)) {
    currentSides.push(name);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({ globalSides: currentSides })
      });
      showToast('Guarnición agregada con éxito', 'success');
      document.getElementById('form-create-side').reset();
      loadExtrasAndSauces();
    } catch (err) {
      showToast('Error al agregar guarnición', 'error');
    }
  }
});

window.toggleExtra = async function(id) {
  try {
    const res = await fetch('/api/extras/' + id + '/toggle', {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (res.ok) loadExtrasAndSauces();
  } catch (err) {
    showToast('Error al cambiar estado', 'error');
  }
};

window.deleteExtra = async function(id) {
  if (!confirm('¿Eliminar este adicional?')) return;
  try {
    const res = await fetch('/api/extras/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (res.ok) {
      showToast('Adicional eliminado', 'info');
      loadExtrasAndSauces();
    }
  } catch (err) {
    showToast('Error al eliminar', 'error');
  }
};

window.deleteSauce = async function(name) {
  if (!confirm('¿Eliminar la salsa "' + name + '"?')) return;
  try {
    const res = await fetch('/api/sauces/' + encodeURIComponent(name), {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (res.ok) {
      showToast('Salsa eliminada', 'info');
      loadExtrasAndSauces();
    }
  } catch (err) {
    showToast('Error al eliminar salsa', 'error');
  }
};

window.deleteSide = async function(name) {
  if (!confirm('¿Eliminar la guarnición "' + name + '"?')) return;
  currentSides = currentSides.filter(s => s !== name);
  try {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: JSON.stringify({ globalSides: currentSides })
    });
    showToast('Guarnición eliminada', 'info');
    loadExtrasAndSauces();
  } catch (err) {
    showToast('Error al eliminar guarnición', 'error');
  }
};
