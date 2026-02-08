const User = require('../models/userModel');
const db = require('../models/db');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Requerido para manejar archivos
const resemble = require('resemblejs'); // Requerido para comparar imágenes

// --- CONFIGURACIÓN DE MULTER ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'public/uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });
exports.upload = upload.single('hierro');

// --- REGISTRO ---
exports.register = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('registro', { errores: errors.array(), datos: req.body });
    }

    // Unificamos el prefijo con el número base (Tu mejora)
    const telefonoCompleto = req.body.codigo + req.body.telefono_base;
    
    const datosParaGuardar = {
        nombre: req.body.nombre,
        apellido: req.body.apellido,
        cedula: req.body.cedula,
        telefono: telefonoCompleto,
        correo: req.body.correo.toLowerCase().trim(),
        password: req.body.password
    };

    User.create(datosParaGuardar, (err) => {
        if (err) {
            console.error("Error al crear usuario:", err);
            return res.render('registro', { 
                errores: [{ msg: "La cédula, el teléfono o el correo ya están registrados" }], 
                datos: req.body 
            });
        }
        res.redirect('/login');
    });
};

// --- LOGIN (CON VALIDACIÓN DE ERRORES) ---
exports.login = (req, res) => {
    const { correo, password } = req.body;
    
    User.findByEmail(correo.toLowerCase().trim(), (err, user) => {
        if (err || !user) {
            return res.render('login', { 
                error: "El correo electrónico no está registrado", 
                datos: req.body 
            });
        }
        
        if (user.password !== password) {
            return res.render('login', { 
                error: "La contraseña es incorrecta", 
                datos: req.body 
            });
        }
        
        req.session.userId = user.id_productor;
        req.session.userName = user.nombre; 
        res.redirect('/dashboard');
    });
};

// --- VALIDACIONES AJAX (Lógica de David integrada) ---
exports.checkEmail = (req, res) => {
    let { email } = req.query;
    if (!email) return res.json({ exists: false });
    User.findByEmail(email.trim(), (err, user) => {
        if (err) return res.json({ exists: false });
        res.json({ exists: !!user });
    });
};

exports.checkCedula = (req, res) => {
    let { cedula } = req.query;
    if (!cedula) return res.json({ exists: false });
    User.findByCedula(cedula.trim(), (err, user) => {
        if (err) return res.json({ exists: false });
        res.json({ exists: !!user });
    });
};

exports.checkPhone = (req, res) => {
    let { phone } = req.query;
    if (!phone) return res.json({ exists: false });
    const sql = `SELECT * FROM productores WHERE telefono = ?`;
    db.get(sql, [phone.trim()], (err, row) => {
        if (err) return res.json({ exists: false });
        res.json({ exists: !!row });
    });
};

// --- GESTIÓN DE FINCA CON IDENTIFICADOR DE HIERROS Y HECTÁREAS ---
exports.registrarTodo = async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const { nombre_finca, estado, municipio, ubicacion, hectareas, nombre_prop, apellido_prop, cedula, telefono, correo } = req.body;
    const ubicacionLimpia = ubicacion ? ubicacion.trim() : "";
    const nuevoHierroPath = req.file ? req.file.path : null;
    const nombreArchivoNuevo = req.file ? req.file.filename : null;

    if (nuevoHierroPath) {
        const directorioUps = path.join(__dirname, '../../public/uploads/');
        try {
            const archivos = fs.readdirSync(directorioUps).filter(file => file !== nombreArchivoNuevo);
            for (const archivo of archivos) {
                const rutaExistente = path.join(directorioUps, archivo);
                const data = await new Promise((resolve) => {
                    resemble(nuevoHierroPath)
                        .compareTo(rutaExistente)
                        .ignoreColors()
                        .onComplete(resolve);
                });

                if (data.misMatchPercentage < 15) {
                    if (fs.existsSync(nuevoHierroPath)) fs.unlinkSync(nuevoHierroPath); 
                    return res.send(`
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background-color: #f8f9fa;">
                            <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                                <h2 style="color: #bc4749;">⚠️ ALERTA DE SIMILITUD</h2>
                                <p style="color: #333; font-size: 1.1em;">El sistema ha detectado que su hierro es un <b>${(100 - data.misMatchPercentage).toFixed(2)}% idéntico</b> a uno ya registrado.</p>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                                <p style="font-weight: bold; color: #1b4332;">Hierro existente en base de datos:</p>
                                <img src="/uploads/${archivo}" style="width: 180px; height: 180px; object-fit: contain; border: 3px solid #bc4749; border-radius: 10px; padding: 5px;">
                                <p style="margin-top: 20px; color: #666;">Por razones de seguridad legal y para evitar conflictos de propiedad entre fincas, no se permite el uso de marcas tan similares.</p>
                                <div style="margin-top: 30px;">
                                    <a href="/registro-finca" style="background: #1b4332; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Modificar mi diseño</a>
                                </div>
                            </div>
                        </div>
                    `);
                }
            }
        } catch (error) {
            console.error("Error en el comparador de hierros:", error);
        }
    }

    const sql = `INSERT INTO fincas (nombre_finca, estado, municipio, ubicacion, hectareas, nombre_prop, apellido_prop, cedula_prop, telefono_prop, correo_prop, hierro_img, id_productor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [nombre_finca, estado, municipio, ubicacionLimpia, hectareas, nombre_prop, apellido_prop, cedula, telefono, correo, nombreArchivoNuevo, req.session.userId], (err) => {
        if (err) {
            console.error("Error al insertar finca:", err);
            return res.status(500).send("Error al registrar finca.");
        }
        res.redirect('/dashboard');
    });
};

// --- GESTIÓN DE GANADO ---
exports.registrarGanado = (req, res) => {
    const { codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito, codigo_estado } = req.body;
    
    db.get(`SELECT id_finca FROM fincas WHERE id_productor = ?`, [req.session.userId], (err, finca) => {
        if (err || !finca) return res.send("Error: No tienes una finca registrada.");
        
        // Mantenemos los 9 campos que tenías tú (incluyendo codigo_estado)
        const sql = `INSERT INTO ganado (codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito, codigo_estado, id_finca) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito, codigo_estado, finca.id_finca], (err) => {
            if (err) return res.send("Error al registrar el animal");
            res.redirect('/dashboard?success=animal_registrado');
        });
    });
};

exports.actualizarGanado = (req, res) => {
    const id_animal = req.params.id;
    const { codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito } = req.body;
    const sql = `UPDATE ganado SET codigo_arete = ?, nombre_animal = ?, raza = ?, sexo = ?, fecha_nacimiento = ?, peso_inicial = ?, proposito = ? WHERE id_animal = ? AND id_finca = (SELECT id_finca FROM fincas WHERE id_productor = ?)`;

    db.run(sql, [codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito, id_animal, req.session.userId], function(err) {
        if (err) return res.send("Error al actualizar.");
        res.redirect('/dashboard?success=actualizado');
    });
};

exports.eliminarAnimal = (req, res) => {
    const sql = `DELETE FROM ganado WHERE id_animal = ? AND id_finca = (SELECT id_finca FROM fincas WHERE id_productor = ?)`;
    db.run(sql, [req.params.id, req.session.userId], (err) => {
        if (err) return res.send("Error al eliminar.");
        res.redirect('/dashboard');
    });
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
};