const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const authRoutes = require('./src/routes/authRoutes');
const session = require('express-session');

const app = express();
const PORT = 3000;

function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next(); // Si hay sesión, sigue adelante
    }
    res.redirect('/login'); // Si no, pa' fuera
}

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'sigan_secreto_ultra_seguro', // Una frase clave para encriptar
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Ponlo en true solo si usas HTTPS
}));

app.use((req, res, next) => {
    // Esto hace que "usuario" esté disponible en todos los .ejs
    res.locals.usuario = req.session.userName || null;
    next();
});

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

app.use('/auth', authRoutes);

app.get('/registro-finca', isAuthenticated, (req, res) => {
    res.render('registro_finca'); 
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login'); // Si no hay sesión, al login
    }
    
    // Buscamos la finca asociada a este productor
    const db = require('./src/models/db');
    const sql = `SELECT * FROM fincas WHERE id_productor = ?`;
    
    db.get(sql, [req.session.userId], (err, finca) => {
        res.render('dashboard', {
            usuario: req.session.userName,
            finca: finca // Pasamos los datos de la finca del abuelo
        });
    });
});