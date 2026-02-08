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

// RUTA DASHBOARD UNIFICADA
app.get('/dashboard', isAuthenticated, (req, res) => {
    const db = require('./src/models/db');
    const sqlFinca = `SELECT * FROM fincas WHERE id_productor = ?`;
    
    db.get(sqlFinca, [req.session.userId], (err, finca) => {
        if (err) {
            console.error("Error al buscar finca:", err);
            return res.status(500).send("Error en el servidor");
        }

        if (finca) {
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
            res.render('dashboard', {
                usuario: req.session.userName,
                finca: null,
                totalAnimales: 0,
                animales: []
            });
        }
    });
});

// Ruta para mostrar el formulario de edición con los datos actuales
app.get('/editar-ganado/:id', isAuthenticated, (req, res) => {
    const db = require('./src/models/db');
    const id_animal = req.params.id;
    const id_productor = req.session.userId;

    const sql = `SELECT * FROM ganado WHERE id_animal = ? 
                 AND id_finca = (SELECT id_finca FROM fincas WHERE id_productor = ?)`;

    db.get(sql, [id_animal, id_productor], (err, animal) => {
        if (err || !animal) return res.redirect('/dashboard');
        res.render('editar_ganado', { animal });
    });
});


// GENERACIÓN DE REPORTE PDF SIGAN
app.get('/reporte-sigan', isAuthenticated, (req, res) => {
    const PDFDocument = require('pdfkit');
    const db = require('./src/models/db');
    
    const sql = `
        SELECT f.*, g.* FROM fincas f 
        LEFT JOIN ganado g ON f.id_finca = g.id_finca 
        WHERE f.id_productor = ?
    `;

    db.all(sql, [req.session.userId], (err, rows) => {
        if (err || !rows || rows.length === 0) {
            return res.send("No hay datos suficientes para generar el reporte.");
        }

        const finca = rows[0];
        const doc = new PDFDocument({ margin: 50 });

        // CONFIGURACIÓN DE CABECERAS (Headers) [cite: 1, 3]
        res.setHeader('Content-Type', 'application/pdf'); // [cite: 1]
        const nombreArchivo = `Reporte_SIGAN_${finca.nombre_finca.replace(/\s+/g, '_')}.pdf`; // 
        res.setHeader('Content-Disposition', `inline; filename=${nombreArchivo}`); // 

        doc.pipe(res);

        // --- DISEÑO DEL PDF ---
        doc.fillColor('#2d6a4f').fontSize(25).text('SISTEMA SIGAN', { align: 'center' }); // [cite: 1, 2]
        doc.fontSize(12).text('Reporte Oficial de Inventario Ganadero', { align: 'center' }); // [cite: 1, 2]
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Datos de la Finca [cite: 3, 4]
        doc.fillColor('black').fontSize(14).text(`Unidad de Producción: ${finca.nombre_finca}`); // 
        doc.fontSize(10).text(`Propietario: ${finca.nombre_prop} ${finca.apellido_prop}`); // [cite: 4]
        doc.text(`Ubicación: ${finca.municipio}, Edo. ${finca.estado}`); // [cite: 4]
        doc.text(`Total Animales: ${rows[0].id_animal ? rows.length : 0}`); // [cite: 4]
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Tabla de Animales [cite: 5, 6]
        doc.fontSize(14).fillColor('#2d6a4f').text('Inventario Detallado', { underline: true }); // [cite: 5]
        doc.moveDown();

        if (rows[0].id_animal) {
            rows.forEach((animal, i) => {
                doc.fillColor('black').fontSize(10)
                   .text(`${i + 1}. Arete: ${animal.codigo_arete} | Nombre: ${animal.nombre_animal || 'N/A'} | Raza: ${animal.raza} | Uso: ${animal.proposito}`); // [cite: 6, 8]
                doc.text(`   Sexo: ${animal.sexo} | Peso: ${animal.peso_inicial} Kg | F. Nacimiento: ${animal.fecha_nacimiento}`, { indent: 20 }); // [cite: 7, 9]
                doc.moveDown(0.5);
            });
        } else {
            doc.text('No se encontraron animales registrados.');
        }

        // Pie de página [cite: 10]
        doc.fontSize(8).fillColor('grey').text(`Documento generado el: ${new Date().toLocaleString()}`, 50, 700, { align: 'center' }); // [cite: 10]

        doc.end();
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