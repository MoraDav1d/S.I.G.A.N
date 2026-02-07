const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// 1. Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 2. Middlewares (Archivos estáticos y lectura de formularios)
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 3. RUTAS (Todas antes del listen)
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/registro', (req, res) => {
    res.render('registro');
});

// Esta es la ruta para la nueva interfaz del mapa
app.get('/mapa-nacional', (req, res) => {
    res.render('mapa'); // Crearemos este archivo ahora
});

// 4. Encendido del Servidor
app.listen(PORT, () => {
    console.log(`✅ SIGAN ejecutándose en http://localhost:${PORT}`);
});