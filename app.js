const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

// Importamos las rutas y controladores
const authRoutes = require('./src/routes/authRoutes');
const mapController = require('./src/controllers/mapController');

const app = express();
const PORT = 3000;

// Middleware de autenticación
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
}

// 1. Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 2. Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'sigan_secreto_ultra_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Middleware global para pasar el usuario a todas las vistas
app.use((req, res, next) => {
    res.locals.usuario = req.session.userName || null;
    next();
});

// 3. RUTAS DE VISTAS PÚBLICAS
app.get('/', (req, res) => res.render('index'));
app.get('/login', (req, res) => res.render('login'));
app.get('/registro', (req, res) => res.render('registro'));
app.get('/mapa-nacional', mapController.getMapa);

// 4. RUTAS PRIVADAS (Requieren sesión)
app.get('/registro-finca', isAuthenticated, (req, res) => {
    res.render('registro_finca'); 
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    const db = require('./src/models/db');
    const sql = `SELECT * FROM fincas WHERE id_productor = ?`;
    
    db.get(sql, [req.session.userId], (err, finca) => {
        res.render('dashboard', {
            usuario: req.session.userName,
            finca: finca
        });
    });
});

// 5. RUTAS DE LÓGICA (Auth)
app.use('/auth', authRoutes);

// 6. Encendido del servidor
app.listen(PORT, () => {
    console.log(`✅ SIGAN funcionando en http://localhost:${PORT}`);
});