const User = require('../models/userModel');
const multer = require('multer');
const path = require('path');
const db = require('../models/db');

const estadosVenezuela = {
    1: "Anzoátegui", 2: "Apure", 3: "Aragua", 4: "Barinas", 5: "Bolívar",
    6: "Carabobo", 7: "Cojedes", 8: "Falcón", 9: "Guárico", 10: "Lara",
    11: "Mérida", 12: "Miranda", 13: "Monagas", 14: "Nueva Esparta", 15: "Portuguesa",
    16: "Sucre", 17: "Táchira", 18: "Trujillo", 19: "Yaracuy", 20: "Zulia",
    21: "Distrito Capital", 22: "Amazonas", 23: "Delta Amacuro", 24: "La Guaira"
};

// --- CONFIGURACIÓN DE MULTER ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
exports.upload = upload.single('hierro');

// --- REGISTRO DE USUARIO ---
exports.register = (req, res) => {
    User.create(req.body, (err) => {
        if (err) return res.send("Error: La cédula o correo ya existen.");
        res.redirect('/login');
    });
};

// --- LOGIN ---
exports.login = (req, res) => {
    const { correo, password } = req.body;
    User.findByEmail(correo, (err, user) => {
        if (err || !user || user.password !== password) {
            return res.send("Correo o contraseña incorrectos.");
        }
        req.session.userId = user.id_productor;
        req.session.userName = user.nombre; 
        res.redirect('/dashboard');
    });
};

// --- REGISTRO DE FINCA ---
exports.registrarTodo = (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    const { 
        nombre_finca, estado, municipio, ubicacion, 
        nombre_prop, apellido_prop, cedula, telefono, correo 
    } = req.body;
    
    const hierro_img = req.file ? req.file.filename : null;
    const id_productor = req.session.userId; 

    const sql = `INSERT INTO fincas 
        (nombre_finca, estado, municipio, ubicacion, nombre_prop, apellido_prop, cedula_prop, telefono_prop, correo_prop, hierro_img, id_productor) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        nombre_finca, estado, municipio, ubicacion, 
        nombre_prop, apellido_prop, cedula, telefono, correo, 
        hierro_img, id_productor
    ];

    db.run(sql, params, function(err) {
        if (err) return res.status(500).send("Error al registrar la finca.");
        res.redirect('/dashboard');
    });
};

// --- REGISTRO DE GANADO MODIFICADO ---
exports.registrarGanado = (req, res) => {
    const { codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito } = req.body;
    const id_productor = req.session.userId;

    // 1. Buscamos de qué estado es la finca para obtener el código numérico
    db.get(`SELECT id_finca, estado FROM fincas WHERE id_productor = ?`, [id_productor], (err, finca) => {
        if (err || !finca) {
            return res.send("Error: No tienes una finca registrada para agregar ganado.");
        }

        // 2. Mapeamos el nombre del estado al código numérico (ej: "Barinas" -> 4)
        const codigo_estado = Object.keys(estadosVenezuela).find(key => estadosVenezuela[key] === finca.estado);

        // 3. Insertamos el animal incluyendo el nuevo campo codigo_estado
        const sql = `INSERT INTO ganado 
            (codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito, codigo_estado, id_finca) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            codigo_arete, 
            nombre_animal, 
            raza, 
            sexo, 
            fecha_nacimiento, 
            peso_inicial, 
            proposito, 
            codigo_estado || 0, // Si no se encuentra el estado, pone 0 por defecto
            finca.id_finca
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error(err.message);
                return res.send("Error al registrar el animal (¿El arete ya existe?).");
            }
            res.redirect('/dashboard?success=animal_registrado');
        });
    });
};

// --- ELIMINAR ANIMAL ---
exports.eliminarAnimal = (req, res) => {
    const id_animal = req.params.id;
    const id_productor = req.session.userId;

    const sql = `DELETE FROM ganado 
                 WHERE id_animal = ? 
                 AND id_finca = (SELECT id_finca FROM fincas WHERE id_productor = ?)`;

    db.run(sql, [id_animal, id_productor], function(err) {
        if (err) return res.send("Error al eliminar el animal.");
        res.redirect('/dashboard');
    });
};

exports.actualizarGanado = (req, res) => {
    const id_animal = req.params.id;
    const { nombre_animal, raza, sexo, peso_inicial, proposito } = req.body;
    const id_productor = req.session.userId;

    const sql = `UPDATE ganado SET 
                 nombre_animal = ?, raza = ?, sexo = ?, peso_inicial = ?, proposito = ?
                 WHERE id_animal = ? 
                 AND id_finca = (SELECT id_finca FROM fincas WHERE id_productor = ?)`;

    const params = [nombre_animal, raza, sexo, peso_inicial, proposito, id_animal, id_productor];

    db.run(sql, params, function(err) {
        if (err) {
            console.error(err.message);
            return res.send("Error al actualizar el animal.");
        }
        res.redirect('/dashboard?success=actualizado');
    });
};

// --- CERRAR SESIÓN ---
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
};