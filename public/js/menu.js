/**
 * Renderizado de Categorías y Catálogo de Platos (Estilo Tienda de Ropa)
 */

import { openProductModal } from './product-modal.js';

let allProducts = [];
let activeCategory = 'Todos';

export function renderCategories(categories, onSelectCategory) {
  const container = document.getElementById('categories-pills-container');
  if (!container) return;

  const list = [
    { id: 'all', name: 'Todos', icon: '🔥' },
    ...categories
  ];

  container.innerHTML = list.map(cat => `
    <button type="button" class="category-pill ${cat.name === activeCategory ? 'active' : ''}" data-category="${cat.name}">
      <span>${cat.icon || '🍽️'}</span> ${cat.name}
    </button>
  `).join('');

  container.querySelectorAll('.category-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.category-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      if (onSelectCategory) onSelectCategory(activeCategory);
    });
  });
}

export function renderProducts(products) {
  allProducts = products;
  const container = document.getElementById('products-container');
  const titleEl = document.getElementById('current-category-title');
  if (titleEl) titleEl.textContent = activeCategory === 'Todos' ? 'Nuestras Especialidades' : activeCategory;

  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🍳</div>
        <p>No se encontraron platos en esta categoría.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(prod => {
    const isSoldOut = prod.available === false;
    return `
      <article class="product-card" data-id="${prod.id}">
        <div class="product-card-media" data-action="open-detail">
          <img class="product-card-img" src="${prod.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'}" alt="${prod.name}" loading="lazy" />
          ${prod.badge ? `<span class="product-card-badge">${prod.badge}</span>` : ''}
          ${isSoldOut ? `<div class="sold-out-overlay">Agotado por hoy</div>` : ''}
        </div>

        <div class="product-card-content">
          <span class="product-card-cat">${prod.category}</span>
          <h3 class="product-card-title" data-action="open-detail">${prod.name}</h3>
          <p class="food-card-desc">${prod.description || ''}</p>

          <div class="product-card-footer">
            <span class="product-card-price">S/ ${parseFloat(prod.price).toFixed(2)}</span>
            ${isSoldOut ? `
              <button type="button" class="btn-sold-out-badge" disabled>
                Agotado
              </button>
            ` : `
              <button type="button" class="btn-select-product" data-id="${prod.id}">
                + Agregar
              </button>
            `}
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Click listeners para abrir modal de personalización
  container.querySelectorAll('.btn-select-product').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const product = allProducts.find(p => p.id === id);
      if (product) openProductModal(product);
    });
  });

  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Evitar doble apertura si se hizo click en el botón
      if (e.target.closest('.btn-select-product')) return;
      const id = card.dataset.id;
      const product = allProducts.find(p => p.id === id);
      if (product && product.available !== false) openProductModal(product);
    });
  });
}
