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

// --- NUEVA RUTA DE ESTADÍSTICAS ---
app.get('/estadisticas', isAuthenticated, (req, res) => {
    const db = require('./src/models/db');
    
    // Consulta 1: Datos de la finca y conteos
    const sqlData = `
        SELECT 
            (SELECT COUNT(*) FROM ganado g JOIN fincas f ON g.id_finca = f.id_finca WHERE f.id_productor = ?) as misAnimales,
            (SELECT COUNT(*) FROM ganado g JOIN fincas f ON g.id_finca = f.id_finca 
             WHERE f.estado = (SELECT estado FROM fincas WHERE id_productor = ?)) as totalEstado,
            f.estado, f.nombre_finca
        FROM fincas f WHERE f.id_productor = ?`;

    db.get(sqlData, [req.session.userId, req.session.userId, req.session.userId], (err, infoGeneral) => {
        if (err || !infoGeneral) return res.redirect('/dashboard');

        // Consulta 2: Agrupar por Sexo
        const sqlSexo = `SELECT sexo, COUNT(*) as cantidad FROM ganado WHERE id_finca = (SELECT id_finca FROM fincas WHERE id_productor = ?) GROUP BY sexo`;
        
        // Consulta 3: Agrupar por Raza
        const sqlRaza = `SELECT raza, COUNT(*) as cantidad FROM ganado WHERE id_finca = (SELECT id_finca FROM fincas WHERE id_productor = ?) GROUP BY raza`;

        db.all(sqlSexo, [req.session.userId], (err, statsSexo) => {
            db.all(sqlRaza, [req.session.userId], (err, statsRaza) => {
                res.render('estadisticas', {
                    info: infoGeneral,
                    statsSexo: statsSexo,
                    statsRaza: statsRaza
                });
            });
        });
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

// REPORTE PDF PRO
app.get('/reporte-sigan', isAuthenticated, (req, res) => {
    const PDFDocument = require('pdfkit');
    const db = require('./src/models/db');
    const path = require('path');
    
    const estadosVzla = {
        "1": "Anzoátegui", "2": "Apure", "3": "Aragua", "4": "Barinas", "5": "Bolívar",
        "6": "Carabobo", "7": "Cojedes", "8": "Falcón", "9": "Guárico", "10": "Lara",
        "11": "Mérida", "12": "Miranda", "13": "Monagas", "14": "Nueva Esparta", "15": "Portuguesa",
        "16": "Sucre", "17": "Táchira", "18": "Trujillo", "19": "Yaracuy", "20": "Zulia",
        "21": "Distrito Capital", "22": "Amazonas", "23": "Delta Amacuro", "24": "La Guaira"
    };

    const sql = `SELECT f.*, g.* FROM fincas f LEFT JOIN ganado g ON f.id_finca = g.id_finca WHERE f.id_productor = ?`;

    db.all(sql, [req.session.userId], (err, rows) => {
        if (err || !rows || rows.length === 0) return res.send("No hay datos para el reporte.");
        
        const finca = rows[0];
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=Reporte_SIGAN.pdf`);
        doc.pipe(res);

        const logoPath = path.join(__dirname, 'public/img/logo-sigan.png');
        try { doc.image(logoPath, 50, 45, { width: 80 }); } catch (e) {}

        doc.fillColor('#1b4332').fontSize(20).text('SISTEMA SIGAN', 150, 50, { align: 'right' });
        doc.fontSize(10).fillColor('#2d6a4f').text('Gestión Integral de Ganadería Nacional', { align: 'right' });
        doc.moveTo(50, 110).lineTo(550, 110).lineWidth(2).strokeColor('#2d6a4f').stroke();

        doc.moveDown(4);
        doc.rect(50, 130, 500, 20).fill('#f2f2f2');
        doc.fillColor('#1b4332').fontSize(12).text('DATOS DE LA UNIDAD DE PRODUCCIÓN', 60, 135);
        
        doc.fillColor('black').fontSize(11).text(`Finca: ${finca.nombre_finca}`, 60, 160);
        doc.text(`Propietario: ${finca.nombre_prop} ${finca.apellido_prop}`, 300, 160);

        // --- ENCABEZADO DE TABLA RECONFIGURADO ---
        // --- ENCABEZADO DE TABLA RECONFIGURADO (Incluye Peso) ---
        const tableTop = 220;
        doc.rect(50, tableTop, 500, 25).fill('#1b4332');
        doc.fillColor('white').fontSize(9) // Bajamos a 9 para que quepan más títulos
           .text('Arete', 55, tableTop + 8)
           .text('Animal / Uso', 110, tableTop + 8)
           .text('Raza', 215, tableTop + 8)
           .text('Peso', 290, tableTop + 8) // Columna de Peso
           .text('Sexo', 340, tableTop + 8)
           .text('F. Nac', 395, tableTop + 8)
           .text('Origen', 475, tableTop + 8);

        let currentY = tableTop + 25;
        if (rows[0].id_animal) {
            rows.forEach((animal, index) => {
                doc.fillColor('black').fontSize(8.5);
                
                if (index % 2 !== 0) doc.rect(50, currentY, 500, 35).fill('#f9f9f9');
                
                doc.fillColor('black');
                
                // 1. Arete
                doc.text(animal.codigo_arete, 55, currentY + 12);
                
                // 2. Nombre y Propósito (Multilínea)
                doc.font('Helvetica-Bold').text(animal.nombre_animal || 'S/N', 110, currentY + 8);
                doc.font('Helvetica').fontSize(7.5).fillColor('#40916c').text(`${animal.proposito || 'N/A'}`, 110, currentY + 18);
                
                // 3. Raza
                doc.fillColor('black').fontSize(8.5).text(animal.raza, 215, currentY + 12);
                
                // 4. Peso (Con unidad de medida)
                const pesoText = animal.peso_inicial ? `${animal.peso_inicial} Kg` : 'S/P';
                doc.text(pesoText, 290, currentY + 12);
                
                // 5. Sexo
                doc.text(animal.sexo, 340, currentY + 12);
                
                // 6. Fecha Nacimiento
                doc.text(animal.fecha_nacimiento || 'S/D', 395, currentY + 12);
                
                // 7. Origen (Estado)
                const nombreEstado = estadosVzla[animal.codigo_estado] || 'N/A';
                doc.text(nombreEstado, 475, currentY + 12);
                
                currentY += 35;

                // Control de salto de página (Opcional pero recomendado)
                if (currentY > 700) { 
                    doc.addPage();
                    currentY = 50; 
                    // Aquí podrías repetir el encabezado si quieres
                }
            });
        }
        doc.end();
    });
});

app.get('/registrar-ganado', isAuthenticated, (req, res) => res.render('registro_ganado'));
app.use('/auth', authRoutes);
app.listen(PORT, () => console.log(`✅ SIGAN funcionando en http://localhost:${PORT}`));