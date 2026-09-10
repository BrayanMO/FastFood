/**
 * Servidor Express para Rest FastFood
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración Cloudinary si existe
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Multer
const upload = multer({ storage: multer.memoryStorage() });

// Middleware Autenticación Admin
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-key'];
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;

  if (!token || token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Acceso no autorizado. Clave incorrecta.' });
  }
  next();
}

// ---------------- RUTAS PÚBLICAS ----------------

app.get('/api/config', async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json({
      storeName: settings.storeName,
      whatsappNumber: settings.whatsappNumber,
      currencySymbol: settings.currencySymbol,
      currencyCode: settings.currencyCode,
      isOpen: settings.isOpen,
      openingHours: settings.openingHours,
      estimatedTime: settings.estimatedTime,
      deliveryZones: settings.deliveryZones,
      paymentMethods: settings.paymentMethods
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ajustes' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.getCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    const products = await db.getProducts({ category, search });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// ---------------- AUTENTICACIÓN ADMIN ----------------

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  res.json({ token: ADMIN_PASSWORD, message: 'Autenticación exitosa' });
});

app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
  res.json({ valid: true });
});

// ---------------- RUTAS ADMIN PROTEGIDAS ----------------

app.put('/api/settings', authenticateAdmin, async (req, res) => {
  try {
    const updated = await db.updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar ajustes' });
  }
});

app.patch('/api/settings/toggle-open', authenticateAdmin, async (req, res) => {
  try {
    const current = await db.getSettings();
    const updated = await db.updateSettings({ isOpen: !current.isOpen });
    res.json({ isOpen: updated.isOpen });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

app.post('/api/categories', authenticateAdmin, async (req, res) => {
  try {
    const created = await db.createCategory(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/categories/:name', authenticateAdmin, async (req, res) => {
  try {
    await db.deleteCategory(req.params.name);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

app.post('/api/products', authenticateAdmin, async (req, res) => {
  try {
    const created = await db.createProduct(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

app.put('/api/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const updated = await db.updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

app.patch('/api/products/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    const updated = await db.toggleProductAvailability(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar disponibilidad' });
  }
});

app.delete('/api/products/:id', authenticateAdmin, async (req, res) => {
  try {
    await db.deleteProduct(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

app.post('/api/upload', authenticateAdmin, upload.any(), async (req, res) => {
  try {
    const file = req.files && req.files.length > 0 ? req.files[0] : req.file;
    if (!file) return res.status(400).json({ error: 'No se envió ninguna imagen' });

    if (!isCloudinaryConfigured) {
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      return res.json({ success: true, url: base64Image, secure_url: base64Image });
    }

    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = 'data:' + file.mimetype + ';base64,' + b64;
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'rest_fastfood',
      transformation: [
        { width: 800, height: 600, crop: 'fill', gravity: 'auto', quality: 'auto' }
      ]
    });

    res.json({ success: true, url: result.secure_url, secure_url: result.secure_url });
  } catch (err) {
    console.error('Error al subir imagen:', err);
    res.status(500).json({ error: 'Error al procesar la imagen' });
  }
});


// ---------------- GESTIÓN DE EXTRAS Y SALSAS ----------------
app.get('/api/extras', async (req, res) => {
  try {
    const s = await db.getSettings();
    res.json({
      extras: s.globalExtras || [],
      sauces: s.globalSauces || [],
      sides: s.globalSides || []
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener extras' });
  }
});

app.post('/api/extras', authenticateAdmin, async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || isNaN(price)) return res.status(400).json({ error: 'Nombre y precio requeridos' });
    const s = await db.getSettings();
    const list = s.globalExtras || [];
    const newExtra = {
      id: 'ext-' + Date.now(),
      name: name.trim(),
      price: parseFloat(price),
      active: true
    };
    list.push(newExtra);
    await db.updateSettings({ globalExtras: list });
    res.status(201).json(newExtra);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear extra' });
  }
});

app.delete('/api/extras/:id', authenticateAdmin, async (req, res) => {
  try {
    const s = await db.getSettings();
    let list = s.globalExtras || [];
    list = list.filter(e => e.id !== req.params.id);
    await db.updateSettings({ globalExtras: list });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar extra' });
  }
});

app.patch('/api/extras/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    const s = await db.getSettings();
    let list = s.globalExtras || [];
    const item = list.find(e => e.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    item.active = !item.active;
    await db.updateSettings({ globalExtras: list });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar estado de extra' });
  }
});

app.post('/api/sauces', authenticateAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre de salsa requerido' });
    const s = await db.getSettings();
    let sauces = s.globalSauces || [];
    if (!sauces.includes(name.trim())) {
      sauces.push(name.trim());
      await db.updateSettings({ globalSauces: sauces });
    }
    res.status(201).json({ sauces });
  } catch (err) {
    res.status(500).json({ error: 'Error al agregar salsa' });
  }
});

app.delete('/api/sauces/:name', authenticateAdmin, async (req, res) => {
  try {
    const s = await db.getSettings();
    let sauces = (s.globalSauces || []).filter(item => item !== req.params.name);
    await db.updateSettings({ globalSauces: sauces });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar salsa' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🔥 Servidor Rest FastFood activo en http://localhost:${PORT}`);
});
