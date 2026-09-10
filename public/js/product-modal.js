/**
 * Modal Interactivo Minimalista de Personalización de Plato
 * Inspirado en el diseño limpio, fluido y de alta gama de Tienda de Ropa
 */

import { addToCart } from './cart.js';
import { openCartDrawer } from './ui.js';

let currentProduct = null;
let currentQuantity = 1;
let storeSettings = null;
let currentImgIndex = 0;
let productImages = [];

export function initProductModal(settings) {
  storeSettings = settings;

  const backdrop = document.getElementById('product-modal-backdrop');
  if (!backdrop) return;

  // Cerrar al hacer click fuera
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeProductModal(true);
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('active')) {
      closeProductModal(true);
    }
  });
}

export function openProductModal(product, pushHistory = true) {
  if (!product || product.available === false) return;
  currentProduct = product;
  currentQuantity = 1;
  currentImgIndex = 0;

  if (pushHistory && product.id) {
    history.pushState({ modal: 'product', id: product.id }, '', `#plato-${product.id}`);
  }

  // Determinar imágenes del producto
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    productImages = product.images;
  } else if (product.imageUrl) {
    productImages = [product.imageUrl];
  } else {
    productImages = ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'];
  }

  const backdrop = document.getElementById('product-modal-backdrop');
  if (!backdrop) return;

  // Guarniciones disponibles
  const sidesList = (product.sides && product.sides.length > 0) 
    ? product.sides 
    : ((storeSettings && storeSettings.globalSides) || ['Papas Nativas Crujientes', 'Papas Clásicas Fritas', 'Ensalada Fresca']);

  // Cremas y salsas disponibles
  const saucesList = (product.sauces && product.sauces.length > 0)
    ? product.sauces
    : ((storeSettings && storeSettings.globalSauces) || [
        'Mayonesa Artesanal', 'Tártara de la Casa', 'Ají Pollero Parrillero', 'Salsa Golf', 'Mostaza', 'Kétchup', 'Salsa BBQ'
      ]);

  // Extras disponibles (Upselling)
  let extrasList = [];
  if (product.extras && Array.isArray(product.extras) && product.extras.length > 0) {
    extrasList = product.extras;
  } else if (product.allowExtras !== false && storeSettings && storeSettings.globalExtras) {
    extrasList = storeSettings.globalExtras.filter(e => e.active !== false);
  }

  // Estructura HTML Minimalista estilo Tienda de Ropa
  backdrop.innerHTML = `
    <div class="product-modal-card">
      <!-- Barra de arrastre para cerrar en móvil -->
      <div class="modal-drag-bar" id="modal-drag-bar" aria-label="Desliza para cerrar">
        <div class="modal-drag-pill"></div>
      </div>

      <!-- Botón X circular flotante -->
      <button type="button" class="modal-close-btn" id="modal-close-btn" aria-label="Cerrar modal">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div class="modal-product-grid">
        <!-- COLUMNA IZQUIERDA: Galería / Imagen -->
        <div class="modal-gallery-col">
          <div class="modal-media-wrap" id="modal-media-wrap">
            <img id="modal-main-img" src="${productImages[0]}" alt="${escapeHtml(product.name)}" />
            ${product.badge ? `<span class="modal-media-badge">${escapeHtml(product.badge)}</span>` : ''}
            
            ${productImages.length > 1 ? `
              <button type="button" class="gallery-nav-arrow arrow-prev" id="modal-gallery-prev" aria-label="Anterior">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button type="button" class="gallery-nav-arrow arrow-next" id="modal-gallery-next" aria-label="Siguiente">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            ` : ''}
          </div>

          ${productImages.length > 1 ? `
            <div class="modal-thumbnails-strip">
              ${productImages.map((img, idx) => `
                <button type="button" class="modal-thumb-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}">
                  <img src="${img}" alt="Miniatura ${idx + 1}" />
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- COLUMNA DERECHA: Información y Personalización -->
        <div class="modal-content-col">
          <!-- Encabezado del Producto -->
          <div class="modal-product-header">
            <span class="modal-cat-tag">${escapeHtml(product.category || 'Especialidad')}</span>
            <h2 class="modal-product-title">${escapeHtml(product.name)}</h2>
            <div class="modal-product-price" id="modal-base-price-display">S/ ${parseFloat(product.price).toFixed(2)}</div>
            ${product.description ? `<p class="modal-product-desc">${escapeHtml(product.description)}</p>` : ''}
          </div>

          <!-- Opciones de Configuración -->
          <div class="modal-options-scroll">
            <!-- 1. Guarnición (si aplica) -->
            ${product.allowSides !== false && sidesList.length > 0 ? `
              <div class="modal-option-section">
                <div class="option-section-header">
                  <span class="option-section-title">🍟 Elige tu Guarnición</span>
                  <span class="option-section-badge">Incluido</span>
                </div>
                <div class="sides-pills-grid" id="modal-sides-container">
                  ${sidesList.map((side, i) => `
                    <label class="side-pill-option ${i === 0 ? 'selected' : ''}">
                      <input type="radio" name="modal-side-choice" value="${escapeHtml(side)}" ${i === 0 ? 'checked' : ''} />
                      <span class="side-pill-label">${escapeHtml(side)}</span>
                      <span class="side-pill-check">✓</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- 2. Cremas y Salsas (si aplica) -->
            ${product.allowSauces !== false && saucesList.length > 0 ? `
              <div class="modal-option-section">
                <div class="option-section-header">
                  <span class="option-section-title">🥫 Cremas & Salsas de la Casa</span>
                  <span class="option-section-hint">Elige las que gustes (Sin costo)</span>
                </div>
                <div class="sauces-chips-grid" id="modal-sauces-container">
                  ${saucesList.map((sauce, i) => `
                    <label class="sauce-chip-pill ${i < 3 ? 'active' : ''}">
                      <input type="checkbox" name="modal-sauce-choice" value="${escapeHtml(sauce)}" ${i < 3 ? 'checked' : ''} />
                      <span class="sauce-chip-name">${escapeHtml(sauce)}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- 3. Adicionales de Pago (Upselling) -->
            ${extrasList.length > 0 ? `
              <div class="modal-option-section">
                <div class="option-section-header">
                  <span class="option-section-title">🥓 ¿Deseas Adicionales Extra?</span>
                  <span class="option-section-hint">Potencia tu plato</span>
                </div>
                <div class="extras-cards-list" id="modal-extras-container">
                  ${extrasList.map(extra => `
                    <label class="extra-card-item">
                      <div class="extra-card-left">
                        <input type="checkbox" class="extra-checkbox" data-extra-name="${escapeHtml(extra.name)}" data-extra-price="${parseFloat(extra.price)}" />
                        <span class="extra-name">+ ${escapeHtml(extra.name)}</span>
                      </div>
                      <span class="extra-price-tag">+ S/ ${parseFloat(extra.price).toFixed(2)}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- 4. Instrucciones Especiales -->
            <div class="modal-option-section" style="border-bottom: none; margin-bottom: 0.5rem;">
              <div class="option-section-header">
                <span class="option-section-title">📝 Instrucciones o Notas Especiales</span>
              </div>
              <textarea class="modal-notes-input" id="modal-notes-input" placeholder="Ej: Sin cebolla, salsas en pote aparte, bien dorado..."></textarea>
            </div>
          </div>

          <!-- BARRA INFERIOR / STICKY CTA -->
          <div class="modal-sticky-footer">
            <div class="modal-stepper-wrap">
              <button type="button" class="stepper-btn" id="modal-qty-minus" aria-label="Disminuir cantidad">−</button>
              <span class="stepper-val" id="modal-qty-val">1</span>
              <button type="button" class="stepper-btn" id="modal-qty-plus" aria-label="Aumentar cantidad">+</button>
            </div>

            <button type="button" class="modal-add-btn" id="modal-add-to-cart-btn">
              <span class="add-btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </span>
              <span class="add-btn-text"><span class="text-long">Agregar al Pedido</span><span class="text-short">Agregar</span></span>
              <span class="add-btn-divider">•</span>
              <span class="add-btn-price" id="modal-calc-total">S/ ${parseFloat(product.price).toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Mostrar modal y bloquear scroll del body
  backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Configurar listeners de la tarjeta
  setupModalInteractions(backdrop);
}

function setupModalInteractions(backdrop) {
  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) closeBtn.onclick = () => closeProductModal(true);

  const modalCard = backdrop.querySelector('.product-modal-card');

  // Gesto táctil deslizar para cerrar en móvil
  if (modalCard) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    modalCard.addEventListener('touchstart', (e) => {
      if (e.target.closest('.modal-drag-bar') || modalCard.scrollTop <= 0) {
        startY = e.touches[0].clientY;
        isDragging = true;
      }
    }, { passive: true });

    modalCard.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const diffY = currentY - startY;
      if (diffY > 0 && modalCard.scrollTop <= 0) {
        modalCard.style.transition = 'none';
        modalCard.style.transform = `translateY(${diffY}px)`;
      }
    }, { passive: true });

    modalCard.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      const diffY = currentY - startY;
      if (diffY > 80 && modalCard.scrollTop <= 0) {
        closeProductModal(true);
      } else {
        modalCard.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
        modalCard.style.transform = '';
      }
      startY = 0;
      currentY = 0;
    }, { passive: true });
  }

  // Galería y Miniaturas
  const mainImg = document.getElementById('modal-main-img');
  const prevBtn = document.getElementById('modal-gallery-prev');
  const nextBtn = document.getElementById('modal-gallery-next');
  const thumbBtns = backdrop.querySelectorAll('.modal-thumb-btn');

  function updateGallery(idx) {
    if (!productImages[idx]) return;
    currentImgIndex = idx;
    if (mainImg) {
      mainImg.style.opacity = '0.5';
      mainImg.src = productImages[idx];
      setTimeout(() => { mainImg.style.opacity = '1'; }, 150);
    }
    thumbBtns.forEach((btn, i) => {
      btn.classList.toggle('active', i === idx);
    });
  }

  if (prevBtn) {
    prevBtn.onclick = () => {
      const newIdx = (currentImgIndex - 1 + productImages.length) % productImages.length;
      updateGallery(newIdx);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      const newIdx = (currentImgIndex + 1) % productImages.length;
      updateGallery(newIdx);
    };
  }

  thumbBtns.forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.index, 10);
      updateGallery(idx);
    };
  });

  // Guarniciones: estilo radio activo
  const sideOptions = backdrop.querySelectorAll('.side-pill-option');
  sideOptions.forEach(label => {
    label.addEventListener('click', () => {
      sideOptions.forEach(l => l.classList.remove('selected'));
      label.classList.add('selected');
    });
  });

  // Salsas: estilo chip activo
  const sauceChips = backdrop.querySelectorAll('.sauce-chip-pill');
  sauceChips.forEach(chip => {
    const cb = chip.querySelector('input[type="checkbox"]');
    if (cb) {
      cb.addEventListener('change', () => {
        chip.classList.toggle('active', cb.checked);
      });
    }
  });

  // Extras: recálculo dinámico de precios
  const extraCheckboxes = backdrop.querySelectorAll('.extra-checkbox');
  extraCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const card = cb.closest('.extra-card-item');
      if (card) card.classList.toggle('selected', cb.checked);
      updateModalCalculations();
    });
  });

  // Contador de cantidad
  const minusBtn = document.getElementById('modal-qty-minus');
  const plusBtn = document.getElementById('modal-qty-plus');

  if (minusBtn) {
    minusBtn.onclick = () => {
      if (currentQuantity > 1) {
        currentQuantity--;
        updateModalCalculations();
      }
    };
  }

  if (plusBtn) {
    plusBtn.onclick = () => {
      currentQuantity++;
      updateModalCalculations();
    };
  }

  // Botón Confirmar y Agregar al Carrito
  const addBtn = document.getElementById('modal-add-to-cart-btn');
  if (addBtn) {
    addBtn.onclick = handleConfirmAddToCart;
  }
}

export function closeProductModal(syncHistory = false) {
  const backdrop = document.getElementById('product-modal-backdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
    const card = backdrop.querySelector('.product-modal-card');
    if (card) card.style.transform = '';
  }
  document.body.style.overflow = '';
  currentProduct = null;

  if (syncHistory && window.location.hash.startsWith('#plato-')) {
    window.history.back();
  }
}

function calculateUnitPrice() {
  if (!currentProduct) return 0;
  let price = parseFloat(currentProduct.price) || 0;

  document.querySelectorAll('.extra-checkbox:checked').forEach(cb => {
    price += parseFloat(cb.dataset.extraPrice) || 0;
  });

  return price;
}

function updateModalCalculations() {
  const qtyVal = document.getElementById('modal-qty-val');
  if (qtyVal) qtyVal.textContent = currentQuantity;

  const unitPrice = calculateUnitPrice();
  const total = unitPrice * currentQuantity;

  const totalEl = document.getElementById('modal-calc-total');
  if (totalEl) totalEl.textContent = 'S/ ' + total.toFixed(2);
}

function handleConfirmAddToCart() {
  if (!currentProduct) return;

  // Guarnición seleccionada
  let chosenSide = '';
  const checkedSide = document.querySelector('input[name="modal-side-choice"]:checked');
  if (checkedSide) chosenSide = checkedSide.value;

  // Salsas seleccionadas
  const chosenSauces = [];
  document.querySelectorAll('input[name="modal-sauce-choice"]:checked').forEach(cb => {
    chosenSauces.push(cb.value);
  });

  // Extras seleccionados
  const chosenExtras = [];
  document.querySelectorAll('.extra-checkbox:checked').forEach(cb => {
    chosenExtras.push({
      name: cb.dataset.extraName,
      price: parseFloat(cb.dataset.extraPrice)
    });
  });

  // Instrucciones especiales
  const notesInput = document.getElementById('modal-notes-input');
  const instructions = notesInput ? notesInput.value.trim() : '';

  const unitPrice = calculateUnitPrice();

  const itemToAdd = {
    id: currentProduct.id,
    name: currentProduct.name,
    imageUrl: productImages[0] || currentProduct.imageUrl,
    basePrice: currentProduct.price,
    unitPrice: unitPrice,
    quantity: currentQuantity,
    side: chosenSide,
    sauces: chosenSauces,
    extras: chosenExtras,
    instructions: instructions
  };

  addToCart(itemToAdd);
  closeProductModal(false);
  if (window.location.hash.startsWith('#plato-')) {
    history.replaceState({ drawer: 'cart' }, '', '#pedido');
    openCartDrawer(false);
  } else {
    openCartDrawer(true);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
