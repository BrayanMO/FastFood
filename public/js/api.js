/**
 * API Client para Rest FastFood
 */

export async function fetchConfig() {
  try {
    const res = await fetch('/api/config?_t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener config');
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function fetchSettings() {
  try {
    const res = await fetch('/api/settings?_t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener ajustes');
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function fetchCategories() {
  try {
    const res = await fetch('/api/categories?_t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener categorías');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function fetchProducts(category = 'Todos', search = '') {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'Todos') params.append('category', category);
    if (search) params.append('search', search);

    const url = '/api/products' + (params.toString() ? '?' + params.toString() : '');
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener productos');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}
