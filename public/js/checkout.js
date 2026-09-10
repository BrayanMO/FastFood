/**
 * Checkout y Generación de Comanda WhatsApp
 */

import { getCart, getCartTotal, clearCart } from './cart.js';
import { closeCartDrawer } from './ui.js';

let storeSettings = null;
let orderType = 'delivery'; // 'delivery' o 'pickup'
let selectedPaymentMethod = 'yape';

export function initCheckout(settings) {
  storeSettings = settings;

  // Botón abrir checkout desde el cart drawer
  const btnGoToCheckout = document.getElementById('btn-go-to-checkout');
  if (btnGoToCheckout) {
    btnGoToCheckout.addEventListener('click', () => {
      const cart = getCart();
      if (cart.length === 0) return;
      closeCartDrawer(false);
      if (window.location.hash === '#pedido' || window.location.hash === '#carrito') {
        history.replaceState({ modal: 'checkout' }, '', '#checkout');
        openCheckoutModal(false);
      } else {
        openCheckoutModal(true);
      }
    });
  }

  // Cerrar checkout modal
  const closeBtn = document.getElementById('checkout-close-btn');
  const backdrop = document.getElementById('checkout-modal-backdrop');
  if (closeBtn) closeBtn.addEventListener('click', () => closeCheckoutModal(true));
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeCheckoutModal(true);
    });
  }

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop && backdrop.classList.contains('active')) {
      closeCheckoutModal(true);
    }
  });

  // Arrastrar hacia abajo para cerrar en móvil
  const dragBar = document.getElementById('checkout-drag-bar');
  const dialog = document.querySelector('.checkout-modal-dialog');
  if (dragBar && dialog) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    dragBar.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
    }, { passive: true });

    dragBar.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        dialog.style.transform = `translateY(${deltaY}px)`;
      }
    }, { passive: true });

    dragBar.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      const deltaY = currentY - startY;
      if (deltaY > 100) {
        closeCheckoutModal(true);
      }
      dialog.style.transform = '';
    });
  }

  // Tabs Delivery vs Retiro
  const tabDelivery = document.getElementById('tab-delivery');
  const tabPickup = document.getElementById('tab-pickup');
  const deliveryBox = document.getElementById('delivery-fields-box');
  const pickupBox = document.getElementById('pickup-fields-box');
  const deliveryRow = document.getElementById('checkout-delivery-row');

  if (tabDelivery && tabPickup) {
    tabDelivery.addEventListener('click', () => {
      orderType = 'delivery';
      tabDelivery.classList.add('active');
      tabPickup.classList.remove('active');
      if (deliveryBox) deliveryBox.style.display = 'block';
      if (pickupBox) pickupBox.style.display = 'none';
      if (deliveryRow) deliveryRow.style.display = 'flex';
      updateCheckoutTotals();
    });

    tabPickup.addEventListener('click', () => {
      orderType = 'pickup';
      tabPickup.classList.add('active');
      tabDelivery.classList.remove('active');
      if (deliveryBox) deliveryBox.style.display = 'none';
      if (pickupBox) pickupBox.style.display = 'block';
      if (deliveryRow) deliveryRow.style.display = 'none';
      updateCheckoutTotals();
    });
  }

  // Llenar zonas de delivery
  const zoneSelect = document.getElementById('delivery-zone');
  if (zoneSelect && storeSettings && storeSettings.deliveryZones) {
    zoneSelect.innerHTML = storeSettings.deliveryZones.map((z, i) => `
      <option value="${z.name}" data-cost="${z.cost}">${z.name} (+ S/ ${parseFloat(z.cost).toFixed(2)})</option>
    `).join('');
    zoneSelect.addEventListener('change', updateCheckoutTotals);
  }

  // Métodos de pago
  const paymentCards = document.querySelectorAll('.payment-card-option');
  paymentCards.forEach(card => {
    card.addEventListener('click', () => {
      paymentCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedPaymentMethod = card.dataset.method;
      renderPaymentDetails();
    });
  });
  renderPaymentDetails();

  // Botón Enviar WhatsApp
  const btnSendWhatsapp = document.getElementById('btn-send-order-whatsapp');
  if (btnSendWhatsapp) {
    btnSendWhatsapp.addEventListener('click', handleSendWhatsAppOrder);
  }
}

export function openCheckoutModal(pushHistory = true) {
  const backdrop = document.getElementById('checkout-modal-backdrop');
  if (backdrop) backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
  updateCheckoutTotals();

  if (pushHistory && window.location.hash !== '#checkout') {
    history.pushState({ modal: 'checkout' }, '', '#checkout');
  }
}

export function closeCheckoutModal(syncHistory = false) {
  const backdrop = document.getElementById('checkout-modal-backdrop');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';

  if (syncHistory && window.location.hash === '#checkout') {
    window.history.back();
  }
}

function getSelectedDeliveryFee() {
  if (orderType === 'pickup') return 0;
  const zoneSelect = document.getElementById('delivery-zone');
  if (!zoneSelect) return 5.00;
  const selectedOpt = zoneSelect.options[zoneSelect.selectedIndex];
  if (!selectedOpt) return 5.00;
  return parseFloat(selectedOpt.dataset.cost) || 0;
}

function updateCheckoutTotals() {
  const subtotal = getCartTotal();
  const deliveryFee = getSelectedDeliveryFee();
  const total = subtotal + deliveryFee;

  const subtotalEl = document.getElementById('checkout-subtotal');
  const deliveryEl = document.getElementById('checkout-delivery-fee');
  const totalEl = document.getElementById('checkout-total-final');

  if (subtotalEl) subtotalEl.textContent = 'S/ ' + subtotal.toFixed(2);
  if (deliveryEl) deliveryEl.textContent = 'S/ ' + deliveryFee.toFixed(2);
  if (totalEl) totalEl.textContent = 'S/ ' + total.toFixed(2);
}

function renderPaymentDetails() {
  const box = document.getElementById('payment-info-box');
  if (!box || !storeSettings) return;

  const pm = storeSettings.paymentMethods || {};
  if (selectedPaymentMethod === 'yape') {
    const yapeNum = (pm.yape && pm.yape.number) || storeSettings.whatsappNumber || '988182681';
    const yapeHolder = (pm.yape && pm.yape.holder) || 'Fuego & Brasa Fast Food';
    box.innerHTML = `
      <strong>🟣 Paga con YAPE:</strong><br>
      Número: <strong id="copy-yape">${yapeNum}</strong>
      <button type="button" class="copy-badge" onclick="navigator.clipboard.writeText('${yapeNum}'); this.textContent='¡Copiado!';">Copiar</button><br>
      Titular: <strong>${yapeHolder}</strong><br>
      <span style="color: var(--text-muted); font-size: 0.8rem;">* Recuerda adjuntar la captura del comprobante al enviar tu mensaje.</span>
    `;
  } else if (selectedPaymentMethod === 'plin') {
    const plinNum = (pm.plin && pm.plin.number) || storeSettings.whatsappNumber || '988182681';
    const plinHolder = (pm.plin && pm.plin.holder) || 'Fuego & Brasa Fast Food';
    box.innerHTML = `
      <strong>🔵 Paga con PLIN:</strong><br>
      Número: <strong>${plinNum}</strong>
      <button type="button" class="copy-badge" onclick="navigator.clipboard.writeText('${plinNum}'); this.textContent='¡Copiado!';">Copiar</button><br>
      Titular: <strong>${plinHolder}</strong><br>
      <span style="color: var(--text-muted); font-size: 0.8rem;">* Recuerda adjuntar la captura del comprobante al enviar tu mensaje.</span>
    `;
  } else if (selectedPaymentMethod === 'transferencia') {
    const trans = pm.transferencia || {};
    box.innerHTML = `
      <strong>🏦 Transferencia Bancaria (${trans.bank || 'BCP'}):</strong><br>
      N° de Cuenta: <strong>${trans.account || '194-988182681-0-22'}</strong><br>
      CCI: <strong>${trans.cci || '002-194-00988182681022-91'}</strong>
      <button type="button" class="copy-badge" onclick="navigator.clipboard.writeText('${trans.cci || ''}'); this.textContent='¡Copiado!';">Copiar CCI</button><br>
      Titular: <strong>${trans.holder || 'Fuego & Brasa SAC'}</strong>
    `;
  } else {
    box.innerHTML = `
      <strong>💵 Pago Contra Entrega:</strong><br>
      Puedes pagar en efectivo o con tarjeta física (POS móvil) al recibir tu pedido.<br>
      <span style="color: var(--text-muted); font-size: 0.8rem;">Si pagas con billete grande, indícanos con cuánto pagarás para llevar cambio.</span>
    `;
  }
}

function handleSendWhatsAppOrder() {
  const nameInput = document.getElementById('client-name');
  const phoneInput = document.getElementById('client-phone');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';

  if (!name || !phone) {
    alert('Por favor ingresa tu Nombre y Teléfono de contacto.');
    if (!name && nameInput) nameInput.focus();
    else if (phoneInput) phoneInput.focus();
    return;
  }

  let address = '';
  let reference = '';
  let zoneName = '';
  let deliveryFee = 0;

  if (orderType === 'delivery') {
    const addrInput = document.getElementById('delivery-address');
    const refInput = document.getElementById('delivery-reference');
    const zoneSelect = document.getElementById('delivery-zone');

    address = addrInput ? addrInput.value.trim() : '';
    reference = refInput ? refInput.value.trim() : '';
    zoneName = zoneSelect ? zoneSelect.value : '';
    deliveryFee = getSelectedDeliveryFee();

    if (!address) {
      alert('Por favor ingresa tu Dirección exacta de entrega.');
      if (addrInput) addrInput.focus();
      return;
    }
  }

  const cart = getCart();
  if (cart.length === 0) return;

  const subtotal = getCartTotal();
  const totalFinal = subtotal + deliveryFee;

  // FORMATO COMANDA WHATSAPP
  let msg = `🍔 *¡NUEVO PEDIDO - ${storeSettings.storeName.toUpperCase()}!*\n`;
  msg += `------------------------------------\n`;
  msg += `👤 *Cliente:* ${name}\n`;
  msg += `📞 *Teléfono:* ${phone}\n`;
  msg += `------------------------------------\n`;
  msg += `📋 *DETALLE DE LA COMANDA:*\n\n`;

  cart.forEach((item, idx) => {
    msg += `*${item.quantity}x ${item.name}* (S/ ${(item.unitPrice * item.quantity).toFixed(2)})\n`;
    if (item.side) {
      msg += `   🍟 *Guarnición:* ${item.side}\n`;
    }
    if (item.sauces && item.sauces.length > 0) {
      msg += `   🥫 *Cremas:* ${item.sauces.join(', ')}\n`;
    }
    if (item.extras && item.extras.length > 0) {
      const extrasStr = item.extras.map(e => `+${e.name} (+S/ ${e.price.toFixed(2)})`).join(', ');
      msg += `   🥓 *Extras:* ${extrasStr}\n`;
    }
    if (item.instructions) {
      msg += `   📝 *Nota:* "${item.instructions}"\n`;
    }
    msg += `\n`;
  });

  msg += `------------------------------------\n`;
  if (orderType === 'delivery') {
    msg += `🛵 *MODALIDAD:* Delivery a Domicilio\n`;
    msg += `📍 *Dirección:* ${address}\n`;
    if (reference) msg += `📌 *Referencia:* ${reference}\n`;
    msg += `🗺️ *Zona:* ${zoneName}\n`;
    msg += `📦 *Envío:* S/ ${deliveryFee.toFixed(2)}\n`;
  } else {
    msg += `🛍️ *MODALIDAD:* Retiro en Local / Para Llevar\n`;
    msg += `📍 *Punto de retiro:* Calle Los Sauces 450, Surco\n`;
  }

  msg += `------------------------------------\n`;
  msg += `💳 *MÉTODO DE PAGO:* ${selectedPaymentMethod.toUpperCase()}\n`;
  msg += `💰 *TOTAL A PAGAR:* *S/ ${totalFinal.toFixed(2)}*\n`;
  msg += `------------------------------------\n`;
  msg += `⏱️ *¡Muchas gracias! Quedo a la espera de su confirmación para encender los fuegos.* 🔥`;

  const targetWhatsApp = (storeSettings && storeSettings.whatsappNumber) || '988182681';
  const cleanPhone = targetWhatsApp.replace(/\D/g, '');
  const finalPhone = cleanPhone.startsWith('51') ? cleanPhone : '51' + cleanPhone;

  const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`;

  // Limpiar carrito tras confirmación y abrir WhatsApp
  clearCart();
  closeCheckoutModal();
  window.open(url, '_blank');
}
