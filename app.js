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

// RUTA DASHBOARD UNIFICADA (Trae finca y lista de animales)
app.get('/dashboard', isAuthenticated, (req, res) => {
    const db = require('./src/models/db');
    const sqlFinca = `SELECT * FROM fincas WHERE id_productor = ?`;
    
    db.get(sqlFinca, [req.session.userId], (err, finca) => {
        if (err) {
            console.error("Error al buscar finca:", err);
            return res.status(500).send("Error en el servidor");
        }

        if (finca) {
            // Buscamos TODOS los animales de esta finca
            const sqlGanado = `SELECT * FROM ganado WHERE id_finca = ? ORDER BY id_animal DESC`;
            
            db.all(sqlGanado, [finca.id_finca], (err, listaAnimales) => {
                const animalesParaVista = listaAnimales || [];
                res.render('dashboard', {
                    usuario: req.session.userName,
                    finca: finca,
                    totalAnimales: animalesParaVista.length,
                    animales: animalesParaVista
                });
            });
        } else {
            // Caso: El usuario aún no ha registrado su finca
            res.render('dashboard', {
                usuario: req.session.userName,
                finca: null,
                totalAnimales: 0,
                animales: []
            });
        }
    });
});

app.get('/registrar-ganado', isAuthenticated, (req, res) => {
    res.render('registro_ganado');
});

// 5. RUTAS DE LÓGICA (Auth)
app.use('/auth', authRoutes);

// 6. Encendido del servidor
app.listen(PORT, () => {
    console.log(`✅ SIGAN funcionando en http://localhost:${PORT}`);
});