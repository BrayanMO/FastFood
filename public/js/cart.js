/**
 * Gestor del Carrito de Comida Rápida en localStorage
 */

const CART_KEY = 'fastfood_cart_items';

export function getCart() {
  try {
    const data = localStorage.getItem(CART_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
  } catch (e) {}
}

export function addToCart(item) {
  const cart = getCart();
  cart.push(item);
  saveCart(cart);
}

export function removeFromCart(index) {
  const cart = getCart();
  if (index >= 0 && index < cart.length) {
    cart.splice(index, 1);
    saveCart(cart);
  }
}

export function updateCartItemQuantity(index, newQty) {
  const cart = getCart();
  if (cart[index]) {
    if (newQty <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = newQty;
    }
    saveCart(cart);
  }
}

export function clearCart() {
  saveCart([]);
}

export function getCartCount() {
  const cart = getCart();
  return cart.reduce((total, item) => total + (item.quantity || 1), 0);
}

export function getCartTotal() {
  const cart = getCart();
  return cart.reduce((total, item) => {
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const qty = parseInt(item.quantity, 10) || 1;
    return total + (unitPrice * qty);
  }, 0);
}
