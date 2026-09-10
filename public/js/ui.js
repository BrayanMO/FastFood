/**
 * Manejo de la Interfaz, Drawers y Barras Flotantes
 */

import { getCart, getCartTotal, getCartCount, removeFromCart, updateCartItemQuantity } from './cart.js';

export function initUI() {
  const btnOpenDesktop = document.getElementById('btn-open-cart-desktop');
  const btnCloseDrawer = document.getElementById('drawer-close-btn');
  const backdropDrawer = document.getElementById('cart-drawer-backdrop');
  const mobileBar = document.getElementById('mobile-cart-bar');

  if (btnOpenDesktop) btnOpenDesktop.addEventListener('click', openCartDrawer);
  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeCartDrawer);
  if (backdropDrawer) backdropDrawer.addEventListener('click', closeCartDrawer);
  if (mobileBar) mobileBar.addEventListener('click', openCartDrawer);

  // Mobile Bottom Navigation Bar (Apple Liquid Glass)
  const navMenuBtn = document.getElementById('mobile-nav-menu-btn');
  const navCatBtn = document.getElementById('mobile-nav-cat-btn');
  const navCartBtn = document.getElementById('mobile-nav-cart-btn');

  if (navMenuBtn) {
    navMenuBtn.addEventListener('click', () => {
      setActiveMobileNav(navMenuBtn);
      const menuSection = document.getElementById('menu') || document.querySelector('.menu-section');
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  if (navCatBtn) {
    navCatBtn.addEventListener('click', () => {
      setActiveMobileNav(navCatBtn);
      const catBar = document.getElementById('categories-bar') || document.querySelector('.categories-scroller');
      if (catBar) {
        catBar.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (navCartBtn) {
    navCartBtn.addEventListener('click', () => {
      setActiveMobileNav(navCartBtn);
      openCartDrawer();
    });
  }

  window.addEventListener('cart:updated', () => {
    updateCartUI();
  });

  updateCartUI();
}

function setActiveMobileNav(btn) {
  document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

export function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-drawer-backdrop');
  if (drawer) drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
  renderCartDrawerItems();
}

export function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-drawer-backdrop');
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

export function updateCartUI() {
  const count = getCartCount();
  const total = getCartTotal();

  // Desktop badge
  const desktopBadge = document.getElementById('cart-badge-count');
  if (desktopBadge) desktopBadge.textContent = count;

  // Mobile bottom nav badge
  const mobileNavBadge = document.getElementById('mobile-cart-badge');
  if (mobileNavBadge) {
    if (count > 0) {
      mobileNavBadge.textContent = count;
      mobileNavBadge.style.display = 'flex';
    } else {
      mobileNavBadge.style.display = 'none';
    }
  }

  // Mobile floating bar
  const mobileBar = document.getElementById('mobile-cart-bar');
  const mobileCount = document.getElementById('cart-bar-count');
  const mobileTotal = document.getElementById('cart-bar-total');

  if (mobileBar) {
    if (count > 0) {
      mobileBar.classList.remove('hidden');
      if (mobileCount) mobileCount.textContent = count + (count === 1 ? ' plato' : ' platos');
      if (mobileTotal) mobileTotal.textContent = 'S/ ' + total.toFixed(2);
    } else {
      mobileBar.classList.add('hidden');
    }
  }

  renderCartDrawerItems();
}

function renderCartDrawerItems() {
  const container = document.getElementById('cart-items-list');
  const footer = document.getElementById('cart-drawer-footer');
  if (!container) return;

  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <div class="cart-empty-icon">🍔</div>
        <h4>Tu bandeja está vacía</h4>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.3rem;">¡Agrega unas ricas hamburguesas o alitas!</p>
      </div>
    `;
    if (footer) footer.style.display = 'none';
    return;
  }

  if (footer) footer.style.display = 'flex';

  container.innerHTML = cart.map((item, index) => `
    <div class="cart-item-card">
      <div class="cart-item-header">
        <div>
          <span class="cart-item-name">${item.quantity}x ${item.name}</span>
          ${item.side ? `<div style="font-size: 0.8rem; color: var(--text-muted);">🍟 ${item.side}</div>` : ''}
        </div>
        <span class="cart-item-price">S/ ${(item.unitPrice * item.quantity).toFixed(2)}</span>
      </div>

      ${(item.sauces && item.sauces.length > 0) || (item.extras && item.extras.length > 0) || item.instructions ? `
        <div class="cart-item-customizations">
          ${item.sauces && item.sauces.length > 0 ? `<div>🥫 ${item.sauces.join(', ')}</div>` : ''}
          ${item.extras && item.extras.length > 0 ? `<div>🥓 ${item.extras.map(e => '+' + e.name).join(', ')}</div>` : ''}
          ${item.instructions ? `<div>📝 "${item.instructions}"</div>` : ''}
        </div>
      ` : ''}

      <div class="cart-item-actions">
        <div class="qty-counter" style="padding: 0.15rem 0.35rem;">
          <button type="button" class="qty-btn btn-cart-minus" data-index="${index}">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button type="button" class="qty-btn btn-cart-plus" data-index="${index}">+</button>
        </div>
        <button type="button" class="btn-remove-item" data-index="${index}">Eliminar</button>
      </div>
    </div>
  `).join('');

  // Total en footer
  const total = getCartTotal();
  const subtotalEl = document.getElementById('cart-drawer-subtotal');
  const totalEl = document.getElementById('cart-drawer-total');
  if (subtotalEl) subtotalEl.textContent = 'S/ ' + total.toFixed(2);
  if (totalEl) totalEl.textContent = 'S/ ' + total.toFixed(2);

  // Eventos de cantidad y eliminar
  container.querySelectorAll('.btn-cart-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      updateCartItemQuantity(idx, cart[idx].quantity - 1);
    });
  });

  container.querySelectorAll('.btn-cart-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      updateCartItemQuantity(idx, cart[idx].quantity + 1);
    });
  });

  container.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      removeFromCart(idx);
    });
  });
}
