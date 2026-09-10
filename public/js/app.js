/**
 * Punto de entrada principal de Rest FastFood
 */

import { fetchSettings, fetchCategories, fetchProducts } from './api.js';
import { initUI } from './ui.js';
import { renderCategories, renderProducts } from './menu.js';
import { initProductModal, openProductModal, closeProductModal } from './product-modal.js';
import { closeCartDrawer, openCartDrawer } from './ui.js';
import { initCheckout, closeCheckoutModal } from './checkout.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inicializar UI básica
  initUI();

  // 2. Cargar Ajustes y Configuración
  const settings = await fetchSettings();
  if (settings) {
    applyStoreSettings(settings);
    initProductModal(settings);
    initCheckout(settings);
  }

  // 3. Cargar Categorías
  const categories = await fetchCategories();
  renderCategories(categories, async (selectedCategory) => {
    const products = await fetchProducts(selectedCategory);
    renderProducts(products);
  });

  // 4. Cargar Platos Iniciales
  const products = await fetchProducts('Todos');
  renderProducts(products);

  // 5. Manejo del botón Atrás del Navegador Móvil / Gestos de retroceso (PopState)
  window.addEventListener('popstate', () => {
    const checkoutBackdrop = document.getElementById('checkout-modal-backdrop');
    const productBackdrop = document.getElementById('product-modal-backdrop');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartBackdrop = document.getElementById('cart-drawer-backdrop');

    // Si el checkout modal estaba abierto, cerrarlo sin recargar ni salir
    if (checkoutBackdrop && checkoutBackdrop.classList.contains('active')) {
      closeCheckoutModal(false);
      return;
    }

    // Si el modal de plato estaba abierto, cerrarlo
    if (productBackdrop && productBackdrop.classList.contains('active')) {
      closeProductModal(false);
      return;
    }

    // Si el carrito drawer estaba abierto, cerrarlo
    if ((cartDrawer && cartDrawer.classList.contains('open')) || (cartBackdrop && cartBackdrop.classList.contains('active'))) {
      closeCartDrawer(false);
      return;
    }
  });

  // 6. Restaurar estado si la URL cargó con un hash inicial (#pedido o #plato-ID)
  const initialHash = window.location.hash;
  if (initialHash === '#pedido' || initialHash === '#carrito') {
    openCartDrawer(false);
  } else if (initialHash.startsWith('#plato-')) {
    const prodId = initialHash.replace('#plato-', '');
    const found = products.find(p => String(p.id) === String(prodId));
    if (found) {
      openProductModal(found, false);
    }
  }
});

function applyStoreSettings(settings) {
  if (!settings) return;

  // Título y Nombre
  if (settings.storeName) {
    document.title = `${settings.storeName} - Pedidos por WhatsApp`;
    const brandEl = document.getElementById('store-brand-name');
    if (brandEl) brandEl.textContent = settings.storeName;
  }

  // Estado del restaurante (Abierto / Cerrado)
  const statusPill = document.getElementById('store-status-pill');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  if (statusDot && statusText) {
    if (settings.isOpen) {
      statusDot.classList.remove('closed');
      statusText.textContent = 'Abierto ahora';
    } else {
      statusDot.classList.add('closed');
      statusText.textContent = 'Cerrado por ahora';
    }
  }

  // Banner
  const banner = document.getElementById('announcement-banner');
  const bannerText = document.getElementById('announcement-text');
  if (banner && settings.banner) {
    if (settings.banner.enabled && settings.banner.text) {
      if (bannerText) bannerText.textContent = settings.banner.text;
      if (settings.banner.bgColor) banner.style.backgroundColor = settings.banner.bgColor;
      if (settings.banner.textColor) banner.style.color = settings.banner.textColor;
      banner.style.display = 'flex';
      banner.style.justifyContent = 'center';
      banner.style.alignItems = 'center';
      banner.style.textAlign = 'center';
    } else {
      banner.style.display = 'none';
    }
  }

  // Hero Section
  if (settings.hero) {
    const tagText = document.getElementById('hero-tag-text');
    if (tagText && settings.hero.tag) tagText.textContent = settings.hero.tag.toUpperCase();

    const titleText = document.getElementById('hero-title-text');
    if (titleText && settings.hero.title) titleText.textContent = settings.hero.title;

    const descText = document.getElementById('hero-desc-text');
    if (descText && settings.hero.description) descText.textContent = settings.hero.description;

    const ctaLabel = document.getElementById('hero-cta-label');
    if (ctaLabel && settings.hero.ctaText) ctaLabel.textContent = settings.hero.ctaText;

    const badgeTitle = document.getElementById('hero-badge-title-text');
    if (badgeTitle && settings.hero.badgeTitle) badgeTitle.textContent = settings.hero.badgeTitle;

    const badgeDesc = document.getElementById('hero-badge-desc-text');
    if (badgeDesc && settings.hero.badgeText) badgeDesc.textContent = settings.hero.badgeText;

    // Jerarquía de Imagen Portada
    const adminHeroImage = (settings.hero.imageUrl && typeof settings.hero.imageUrl === 'string')
      ? settings.hero.imageUrl.trim()
      : '';

    let imgEl = document.getElementById('hero-image-img');
    if (!imgEl) {
      const wrapper = document.querySelector('.hero-image-wrapper');
      if (wrapper) {
        imgEl = document.createElement('img');
        imgEl.id = 'hero-image-img';
        imgEl.alt = settings.hero.title || 'Fuego y Brasa';
        imgEl.loading = 'eager';
        wrapper.prepend(imgEl);
      }
    }

    if (imgEl) {
      if (adminHeroImage) {
        try { localStorage.setItem('fastfood_cached_hero', adminHeroImage); } catch (e) {}
        if (imgEl.src !== adminHeroImage) imgEl.src = adminHeroImage;
        imgEl.style.opacity = '1';
      } else {
        try { localStorage.removeItem('fastfood_cached_hero'); } catch (e) {}
        const fallback = imgEl.getAttribute('data-fallback') || '';
        if (fallback && imgEl.src !== fallback) imgEl.src = fallback;
        imgEl.style.opacity = '1';
      }
    }
  }

  // WhatsApp móvil
  if (settings.whatsappPhone) {
    const waClean = settings.whatsappPhone.replace(/\D/g, '');
    const waBtn = document.getElementById('mobile-nav-whatsapp-btn');
    if (waBtn) waBtn.href = `https://wa.me/${waClean.startsWith('51') ? waClean : '51' + waClean}`;
  }

  // Tiempos estimados
  const estTime = document.getElementById('hero-estimated-time');
  if (estTime && settings.estimatedTime) {
    estTime.textContent = settings.estimatedTime;
  }
}
