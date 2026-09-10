/**
 * Capa de Base de Datos para Rest FastFood
 * Con soporte para PostgreSQL Neon DB y persistencia de respaldo local JSON
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const CATEGORIES_FILE = path.join(__dirname, 'data', 'categories.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');

let pool = null;
let isDbConnected = false;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    isDbConnected = true;
    console.log('🔌 Conectando a PostgreSQL Neon DB...');
    initPgTables();
  } catch (err) {
    console.warn('⚠️ No se pudo conectar a PostgreSQL, usando archivos locales JSON:', err.message);
    isDbConnected = false;
  }
}

async function initPgTables() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        icon VARCHAR(50) DEFAULT '🍔',
        "order" INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS food_products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        description TEXT,
        image_url TEXT,
        images JSONB DEFAULT '[]'::jsonb,
        available BOOLEAN DEFAULT true,
        badge VARCHAR(100) DEFAULT '',
        allow_sides BOOLEAN DEFAULT false,
        allow_sauces BOOLEAN DEFAULT true,
        allow_extras BOOLEAN DEFAULT true,
        extras JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fastfood_settings (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Columnas adicionales en caso de actualización
    await pool.query(`
      ALTER TABLE food_products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE food_products ADD COLUMN IF NOT EXISTS allow_extras BOOLEAN DEFAULT true;
    `);

    // Auto-sembrado si la base de datos está vacía
    const catCheck = await pool.query('SELECT COUNT(*) FROM food_categories');
    if (parseInt(catCheck.rows[0].count, 10) === 0) {
      const localCats = readJson(CATEGORIES_FILE, []);
      for (let i = 0; i < localCats.length; i++) {
        const c = localCats[i];
        await pool.query(
          'INSERT INTO food_categories (id, name, icon, "order") VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
          [c.id || ('cat-' + (i + 1)), c.name, c.icon || '🍔', c.order || (i + 1)]
        );
      }
    }

    const prodCheck = await pool.query('SELECT COUNT(*) FROM food_products');
    if (parseInt(prodCheck.rows[0].count, 10) === 0) {
      const localProds = readJson(PRODUCTS_FILE, []);
      for (const p of localProds) {
        await pool.query(`
          INSERT INTO food_products (id, name, category, price, description, image_url, images, available, badge, allow_sides, allow_sauces, allow_extras, extras)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `, [
          p.id,
          p.name,
          p.category,
          parseFloat(p.price) || 0,
          p.description || '',
          p.imageUrl || '',
          JSON.stringify(p.images || [p.imageUrl].filter(Boolean)),
          p.available !== undefined ? p.available : true,
          p.badge || '',
          Boolean(p.allowSides),
          p.allowSauces !== false,
          p.allowExtras !== false,
          JSON.stringify(p.extras || [])
        ]);
      }
    }

    const setCheck = await pool.query("SELECT COUNT(*) FROM fastfood_settings WHERE id = 'main_config'");
    if (parseInt(setCheck.rows[0].count, 10) === 0) {
      const localSettings = readJson(SETTINGS_FILE, {});
      await pool.query(
        "INSERT INTO fastfood_settings (id, data, updated_at) VALUES ('main_config', $1, CURRENT_TIMESTAMP)",
        [JSON.stringify(localSettings)]
      );
    }

    console.log('✅ Tablas PostgreSQL Neon verificadas e inicializadas.');
  } catch (err) {
    console.error('Error al inicializar tablas PostgreSQL:', err.message);
  }
}

// ---------------- UTILIDADES LOCALES ----------------
function readJson(file, defaultVal) {
  try {
    if (!fs.existsSync(file)) return defaultVal;
    const content = fs.readFileSync(file, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Error al leer ' + file + ':', e.message);
    return defaultVal;
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error al escribir ' + file + ':', e.message);
  }
}

// ---------------- PLATOS & PRODUCTOS ----------------
async function getProducts(filters = {}) {
  let list = [];
  if (isDbConnected && pool) {
    try {
      const res = await pool.query('SELECT * FROM food_products ORDER BY created_at ASC');
      list = res.rows.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        price: parseFloat(r.price),
        description: r.description || '',
        imageUrl: r.image_url || '',
        images: Array.isArray(r.images) 
          ? r.images 
          : (typeof r.images === 'string' ? JSON.parse(r.images) : [r.image_url].filter(Boolean)),
        available: r.available,
        badge: r.badge || '',
        allowSides: r.allow_sides,
        allowSauces: r.allow_sauces,
        allowExtras: r.allow_extras !== false,
        extras: typeof r.extras === 'string' ? JSON.parse(r.extras) : (r.extras || [])
      }));
    } catch (e) {
      console.warn('Error leyendo productos de PG, usando fallback local:', e.message);
      list = readJson(PRODUCTS_FILE, []);
    }
  } else {
    list = readJson(PRODUCTS_FILE, []);
  }

  if (filters.category && filters.category !== 'Todos') {
    list = list.filter(p => p.category.toLowerCase() === filters.category.toLowerCase());
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
  }
  return list;
}

async function getProductById(id) {
  const products = await getProducts();
  return products.find(p => p.id === id) || null;
}

async function createProduct(prod) {
  const newProd = {
    id: 'prod-' + Date.now(),
    name: prod.name,
    category: prod.category || 'Hamburguesas',
    price: parseFloat(prod.price) || 0,
    description: prod.description || '',
    imageUrl: prod.imageUrl || '',
    images: Array.isArray(prod.images) ? prod.images : [prod.imageUrl].filter(Boolean),
    available: prod.available !== undefined ? prod.available : true,
    badge: prod.badge || '',
    allowSides: Boolean(prod.allowSides),
    allowSauces: prod.allowSauces !== false,
    allowExtras: prod.allowExtras !== false,
    extras: Array.isArray(prod.extras) ? prod.extras : []
  };

  if (isDbConnected && pool) {
    try {
      await pool.query(`
        INSERT INTO food_products (id, name, category, price, description, image_url, images, available, badge, allow_sides, allow_sauces, allow_extras, extras)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        newProd.id,
        newProd.name,
        newProd.category,
        newProd.price,
        newProd.description,
        newProd.imageUrl,
        JSON.stringify(newProd.images),
        newProd.available,
        newProd.badge,
        newProd.allowSides,
        newProd.allowSauces,
        newProd.allowExtras,
        JSON.stringify(newProd.extras)
      ]);
    } catch (e) {
      console.error('Error insert pg:', e.message);
    }
  }

  const list = readJson(PRODUCTS_FILE, []);
  list.push(newProd);
  writeJson(PRODUCTS_FILE, list);
  return newProd;
}

async function updateProduct(id, prod) {
  const list = readJson(PRODUCTS_FILE, []);
  const index = list.findIndex(p => p.id === id);
  if (index === -1) return null;

  const current = list[index];
  const updated = {
    ...current,
    ...prod,
    price: prod.price !== undefined ? parseFloat(prod.price) : current.price,
    images: prod.images !== undefined ? prod.images : current.images,
    allowSides: prod.allowSides !== undefined ? Boolean(prod.allowSides) : current.allowSides,
    allowSauces: prod.allowSauces !== undefined ? Boolean(prod.allowSauces) : current.allowSauces,
    allowExtras: prod.allowExtras !== undefined ? Boolean(prod.allowExtras) : current.allowExtras,
    extras: prod.extras !== undefined ? prod.extras : current.extras
  };

  if (isDbConnected && pool) {
    try {
      await pool.query(`
        UPDATE food_products
        SET name = $1, category = $2, price = $3, description = $4, image_url = $5, images = $6, available = $7, badge = $8, allow_sides = $9, allow_sauces = $10, allow_extras = $11, extras = $12
        WHERE id = $13
      `, [
        updated.name,
        updated.category,
        updated.price,
        updated.description,
        updated.imageUrl,
        JSON.stringify(updated.images || []),
        updated.available,
        updated.badge,
        updated.allowSides,
        updated.allowSauces,
        updated.allowExtras,
        JSON.stringify(updated.extras),
        id
      ]);
    } catch (e) {
      console.error('Error update pg:', e.message);
    }
  }

  list[index] = updated;
  writeJson(PRODUCTS_FILE, list);
  return updated;
}

async function toggleProductAvailability(id) {
  const list = readJson(PRODUCTS_FILE, []);
  const index = list.findIndex(p => p.id === id);
  if (index === -1) return null;

  list[index].available = !list[index].available;

  if (isDbConnected && pool) {
    try {
      await pool.query('UPDATE food_products SET available = $1 WHERE id = $2', [list[index].available, id]);
    } catch (e) {
      console.error('Error toggle pg:', e.message);
    }
  }

  writeJson(PRODUCTS_FILE, list);
  return list[index];
}

async function deleteProduct(id) {
  if (isDbConnected && pool) {
    try {
      await pool.query('DELETE FROM food_products WHERE id = $1', [id]);
    } catch (e) {
      console.error('Error delete pg:', e.message);
    }
  }
  let list = readJson(PRODUCTS_FILE, []);
  list = list.filter(p => p.id !== id);
  writeJson(PRODUCTS_FILE, list);
  return true;
}

// ---------------- CATEGORÍAS ----------------
async function getCategories() {
  if (isDbConnected && pool) {
    try {
      const res = await pool.query('SELECT * FROM food_categories ORDER BY "order" ASC');
      if (res.rows.length > 0) return res.rows;
    } catch (e) {}
  }
  return readJson(CATEGORIES_FILE, []);
}

async function createCategory(cat) {
  const list = await getCategories();
  const name = typeof cat === 'string' ? cat.trim() : cat.name.trim();
  if (list.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('La categoría ya existe');
  }

  const newCat = {
    id: 'cat-' + Date.now(),
    name,
    icon: (cat && cat.icon) || '🍽️',
    order: list.length + 1
  };

  if (isDbConnected && pool) {
    try {
      await pool.query('INSERT INTO food_categories (id, name, icon, "order") VALUES ($1, $2, $3, $4)', [newCat.id, newCat.name, newCat.icon, newCat.order]);
    } catch (e) {}
  }

  list.push(newCat);
  writeJson(CATEGORIES_FILE, list);
  return newCat;
}

async function deleteCategory(idOrName) {
  let list = await getCategories();
  list = list.filter(c => c.id !== idOrName && c.name !== idOrName);

  if (isDbConnected && pool) {
    try {
      await pool.query('DELETE FROM food_categories WHERE id = $1 OR name = $1', [idOrName]);
    } catch (e) {}
  }

  writeJson(CATEGORIES_FILE, list);
  return true;
}

// ---------------- AJUSTES & CONFIGURACIÓN ----------------
async function getSettings() {
  let s = null;
  if (isDbConnected && pool) {
    try {
      const res = await pool.query("SELECT data FROM fastfood_settings WHERE id = 'main_config'");
      if (res.rows.length > 0) {
        const raw = res.rows[0].data;
        s = typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    } catch (e) {}
  }
  if (!s) {
    s = readJson(SETTINGS_FILE, {});
  }
  return {
    ...s,
    storeName: s.storeName || process.env.STORE_NAME || 'FUEGO & BRASA | Fast Food',
    whatsappNumber: s.whatsappNumber || process.env.WHATSAPP_NUMBER || '',
    currencySymbol: s.currencySymbol || process.env.CURRENCY_SYMBOL || 'S/',
    currencyCode: s.currencyCode || process.env.CURRENCY_CODE || 'SOL'
  };
}

async function updateSettings(newSettings) {
  const current = await getSettings();
  const merged = {
    ...current,
    ...newSettings,
    banner: { ...(current.banner || {}), ...(newSettings.banner || {}) },
    hero: { ...(current.hero || {}), ...(newSettings.hero || {}) },
    paymentMethods: newSettings.paymentMethods || current.paymentMethods,
    deliveryZones: newSettings.deliveryZones || current.deliveryZones,
    globalSauces: newSettings.globalSauces || current.globalSauces,
    globalExtras: newSettings.globalExtras !== undefined ? newSettings.globalExtras : (current.globalExtras || []),
    globalSides: newSettings.globalSides !== undefined ? newSettings.globalSides : (current.globalSides || [])
  };

  if (isDbConnected && pool) {
    try {
      await pool.query(`
        INSERT INTO fastfood_settings (id, data, updated_at)
        VALUES ('main_config', $1, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = CURRENT_TIMESTAMP
      `, [JSON.stringify(merged)]);
    } catch (e) {
      console.error('Error pg update settings:', e.message);
    }
  }

  writeJson(SETTINGS_FILE, merged);
  return merged;
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductAvailability,
  deleteProduct,
  getCategories,
  createCategory,
  deleteCategory,
  getSettings,
  updateSettings
};
