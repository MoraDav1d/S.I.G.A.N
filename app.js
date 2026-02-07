const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Rutas
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/registro', (req, res) => {
    res.render('registro');
});

app.listen(PORT, () => {
    console.log(`✅ SIGAN ejecutándose en http://localhost:${PORT}`);
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/registro', (req, res) => {
    res.render('registro');
});