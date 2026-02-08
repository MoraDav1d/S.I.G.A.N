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
    const path = require('path');
    
    // Diccionario de estados para mostrar nombres reales
    const estadosVzla = {
        "1": "Anzoátegui", "2": "Apure", "3": "Aragua", "4": "Barinas", "5": "Bolívar",
        "6": "Carabobo", "7": "Cojedes", "8": "Falcón", "9": "Guárico", "10": "Lara",
        "11": "Mérida", "12": "Miranda", "13": "Monagas", "14": "Nueva Esparta", "15": "Portuguesa",
        "16": "Sucre", "17": "Táchira", "18": "Trujillo", "19": "Yaracuy", "20": "Zulia",
        "21": "Distrito Capital", "22": "Amazonas", "23": "Delta Amacuro", "24": "La Guaira"
    };

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
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        const nombreArchivo = `Reporte_SIGAN_${finca.nombre_finca.replace(/\s+/g, '_')}.pdf`;
        res.setHeader('Content-Disposition', `inline; filename=${nombreArchivo}`);

        doc.pipe(res);

        // --- ENCABEZADO PRO ---
        // Logo a la izquierda
        const logoPath = path.join(__dirname, 'public/img/logo-sigan.png');
        try {
            doc.image(logoPath, 50, 45, { width: 80 });
        } catch (e) {
            console.log("Logo no encontrado, continuando sin imagen.");
        }

        // Títulos a la derecha
        doc.fillColor('#1b4332')
           .fontSize(20)
           .text('SISTEMA SIGAN', 150, 50, { align: 'right' });
        doc.fontSize(10)
           .fillColor('#2d6a4f')
           .text('Gestión Integral de Ganadería Nacional', { align: 'right' });
        doc.fillColor('#444')
           .text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, { align: 'right' });

        // Línea divisoria elegante
        doc.moveTo(50, 110).lineTo(550, 110).lineWidth(2).strokeColor('#2d6a4f').stroke();

        doc.moveDown(4);

        // --- INFORMACIÓN DE LA UNIDAD DE PRODUCCIÓN ---
        doc.rect(50, 130, 500, 20).fill('#f2f2f2'); // Fondo gris claro para el subtítulo
        doc.fillColor('#1b4332').fontSize(12).text('DATOS DE LA UNIDAD DE PRODUCCIÓN', 60, 135);
        
        doc.moveDown(1);
        doc.fillColor('black').fontSize(11);
        
        const col1 = 60;
        const col2 = 300;
        let yPos = doc.y;

        doc.text(`Finca: ${finca.nombre_finca}`, col1, yPos);
        doc.text(`Propietario: ${finca.nombre_prop} ${finca.apellido_prop}`, col2, yPos);
        
        yPos += 20;
        const nombreEstado = estadosVzla[finca.estado] || finca.estado;
        doc.text(`Ubicación: Municipio ${finca.municipio}, Edo. ${nombreEstado}`, col1, yPos);
        doc.text(`Capacidad Total: ${rows[0].id_animal ? rows.length : 0} Animales`, col2, yPos);

        doc.moveDown(3);

        // --- TABLA DE INVENTARIO (DISEÑO PRO) ---
        const tableTop = doc.y;
            const itemHeight = 35; // Aumentamos un poco el alto para que quepa la segunda línea

            // Cabecera de la tabla
            doc.rect(50, tableTop, 500, 25).fill('#1b4332');
            doc.fillColor('white').fontSize(10);
            doc.text('ID/Arete', 60, tableTop + 8);
            doc.text('Nombre / Propósito', 130, tableTop + 8);
            doc.text('Raza', 260, tableTop + 8);
            doc.text('Sexo', 350, tableTop + 8);
            doc.text('Origen / F. Nac', 440, tableTop + 8);

            // Filas de animales
            doc.fillColor('black');
            let currentY = tableTop + 25;

            if (rows[0].id_animal) {
                rows.forEach((animal, index) => {
                    // Fondo cebra
                    if (index % 2 !== 0) {
                        doc.rect(50, currentY, 500, itemHeight).fill('#f9f9f9');
                    }

                    doc.fillColor('black').fontSize(10);
                    const edoAnimal = estadosVzla[animal.codigo_estado] || "---";
                    
                    // Primera Línea (Datos principales)
                    doc.font('Helvetica-Bold').text(animal.codigo_arete, 60, currentY + 7);
                    doc.font('Helvetica').text(animal.nombre_animal || 'N/A', 130, currentY + 7);
                    doc.text(animal.raza, 260, currentY + 7);
                    doc.text(animal.sexo, 350, currentY + 7);
                    doc.text(edoAnimal, 440, currentY + 7);

                    // Segunda Línea (Detalles técnicos en gris y letra más pequeña)
                    doc.fillColor('#666').fontSize(8);
                    doc.text(`Uso: ${animal.proposito || 'No definido'}`, 130, currentY + 20);
                    doc.text(`Nacido el: ${animal.fecha_nacimiento || 'S/D'}`, 440, currentY + 20);

                    // Línea divisoria
                    doc.moveTo(50, currentY + itemHeight).lineTo(550, currentY + itemHeight).lineWidth(0.5).strokeColor('#ddd').stroke();
                    
                    currentY += itemHeight;

                    // Control de salto de página
                    if (currentY > 730) { 
                        doc.addPage();
                        currentY = 50; 
                    }
                });
    } else {
            doc.text('No se encontraron ejemplares registrados en esta finca.', 60, currentY + 15);
        }

        // --- PIE DE PÁGINA ---
        doc.fontSize(8).fillColor('grey')
           .text('Este reporte es generado por el Sistema Integral de Gestión Agropecuaria Nacional (SIGAN).', 50, 780, { align: 'center' });
        doc.text('La veracidad de los datos depende del registro realizado por el productor.', { align: 'center' });

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