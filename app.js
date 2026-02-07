const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// Importamos las rutas y controladores
const authRoutes = require('./src/routes/authRoutes');
const mapController = require('./src/controllers/mapController');

const app = express();
const PORT = 3000;

// 1. Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 2. Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 3. RUTAS DE VISTAS
app.get('/', (req, res) => res.render('index'));
app.get('/login', (req, res) => res.render('login'));
app.get('/registro', (req, res) => res.render('registro'));
app.get('/registro-finca', (req, res) => res.render('registro_finca'));

// RUTA DEL MAPA (Usando el controlador corregido)
app.get('/mapa-nacional', mapController.getMapa);

// 4. RUTAS DE LÓGICA
app.use('/auth', authRoutes);

// 5. Encendido
app.listen(PORT, () => {
    console.log(`✅ SIGAN funcionando en http://localhost:${PORT}`);
});