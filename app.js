const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const authRoutes = require('./src/routes/authRoutes');
const mapController = require('./src/controllers/mapController');

const app = express();
const PORT = 3000;

function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.redirect('/login');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'sigan_secreto_ultra_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use((req, res, next) => {
    res.locals.usuario = req.session.userName || null;
    next();
});

// RUTAS PÚBLICAS
app.get('/', (req, res) => res.render('index'));
app.get('/login', (req, res) => res.render('login', { error: null }));
app.get('/registro', (req, res) => res.render('registro', { errores: null, datos: null }));
app.get('/mapa-nacional', mapController.getMapa);

// RUTAS PRIVADAS
app.get('/registro-finca', isAuthenticated, (req, res) => res.render('registro_finca'));

app.get('/dashboard', isAuthenticated, (req, res) => {
    const db = require('./src/models/db');
    const sqlFinca = `SELECT * FROM fincas WHERE id_productor = ?`;
    db.get(sqlFinca, [req.session.userId], (err, finca) => {
        if (err) return res.status(500).send("Error en el servidor");
        if (finca) {
            const sqlGanado = `SELECT * FROM ganado WHERE id_finca = ? ORDER BY id_animal DESC`;
            db.all(sqlGanado, [finca.id_finca], (err, listaAnimales) => {
                res.render('dashboard', {
                    usuario: req.session.userName,
                    finca: finca,
                    totalAnimales: listaAnimales ? listaAnimales.length : 0,
                    animales: listaAnimales || []
                });
            });
        } else {
            res.render('dashboard', { usuario: req.session.userName, finca: null, totalAnimales: 0, animales: [] });
        }
    });
});

app.get('/editar-ganado/:id', isAuthenticated, (req, res) => {
    const db = require('./src/models/db');
    const sql = `SELECT * FROM ganado WHERE id_animal = ? AND id_finca = (SELECT id_finca FROM fincas WHERE id_productor = ?)`;
    db.get(sql, [req.params.id, req.session.userId], (err, animal) => {
        if (err || !animal) return res.redirect('/dashboard');
        res.render('editar_ganado', { animal });
    });
});

// REPORTE PDF
app.get('/reporte-sigan', isAuthenticated, (req, res) => {
    const PDFDocument = require('pdfkit');
    const db = require('./src/models/db');
    const sql = `SELECT f.*, g.* FROM fincas f LEFT JOIN ganado g ON f.id_finca = g.id_finca WHERE f.id_productor = ?`;

    db.all(sql, [req.session.userId], (err, rows) => {
        if (err || !rows || rows.length === 0) return res.send("No hay datos para el reporte.");
        const finca = rows[0];
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=Reporte_SIGAN.pdf`);
        doc.pipe(res);
        doc.fillColor('#2d6a4f').fontSize(25).text('SISTEMA SIGAN', { align: 'center' });
        doc.fontSize(12).text('Inventario Ganadero Oficial', { align: 'center' }).moveDown();
        doc.fontSize(14).fillColor('black').text(`Finca: ${finca.nombre_finca}`);
        doc.fontSize(10).text(`Propietario: ${finca.nombre_prop} ${finca.apellido_prop}`);
        doc.moveDown().text('Inventario Detallado:', { underline: true }).moveDown();

        if (rows[0].id_animal) {
            rows.forEach((animal, i) => {
                doc.text(`${i + 1}. Arete: ${animal.codigo_arete} | Raza: ${animal.raza} | Peso: ${animal.peso_inicial} Kg`);
            });
        }
        doc.end();
    });
});

app.get('/registrar-ganado', isAuthenticated, (req, res) => res.render('registro_ganado'));
app.use('/auth', authRoutes);
app.listen(PORT, () => console.log(`✅ SIGAN funcionando en http://localhost:${PORT}`));