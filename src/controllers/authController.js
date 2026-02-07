const User = require('../models/userModel');
const multer = require('multer');
const path = require('path');
const db = require('../models/db');

// --- CONFIGURACIÓN DE MULTER (Subida de fotos) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
exports.upload = upload.single('hierro'); // 'hierro' es el name del input en el EJS

// --- LÓGICA DE REGISTRO DE USUARIO (EL PRODUCTOR/SOBRINO) ---
exports.register = (req, res) => {
    User.create(req.body, (err) => {
        if (err) return res.send("Error: La cédula o correo ya existen.");
        res.redirect('/login');
    });
};

// --- LÓGICA DE LOGIN ---
exports.login = (req, res) => {
    const { correo, password } = req.body;
    User.findByEmail(correo, (err, user) => {
        if (err || !user || user.password !== password) {
            return res.send("Correo o contraseña incorrectos.");
        }
        
        // Iniciamos la sesión
        req.session.userId = user.id_productor;
        req.session.userName = user.nombre; 
        
        res.redirect('/dashboard');
    });
};

// --- LÓGICA DE REGISTRO DE FINCA (DATOS DEL PROPIETARIO/ABUELO) ---
exports.registrarTodo = (req, res) => {
    // Verificamos si hay sesión (seguridad extra)
    if (!req.session.userId) {
        return res.redirect('/login');
    }

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
        if (err) {
            console.error("Error al insertar finca:", err.message);
            return res.status(500).send("Error al registrar la finca en la base de datos.");
        }
        
        console.log(`✅ Finca "${nombre_finca}" registrada con éxito por el usuario ID: ${id_productor}`);
        
        // Redirigimos al Dashboard para que vea su nueva finca
        res.redirect('/dashboard');
    });
};

exports.registrarGanado = (req, res) => {
    const { codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito } = req.body;
    const id_productor = req.session.userId;

    // Primero: Necesitamos saber el ID de la finca de este productor
    db.get(`SELECT id_finca FROM fincas WHERE id_productor = ?`, [id_productor], (err, finca) => {
        if (err || !finca) {
            return res.send("Error: No tienes una finca registrada para agregar ganado.");
        }

        const id_finca = finca.id_finca;

        // Segundo: Insertamos el animal vinculado a esa finca
        const sql = `INSERT INTO ganado 
            (codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito, id_finca) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito, id_finca];

        db.run(sql, params, function(err) {
            if (err) {
                console.error(err.message);
                return res.send("Error al registrar el animal (¿El arete ya existe?).");
            }
            // Después de guardar, lo devolvemos al Dashboard
            res.redirect('/dashboard?success=animal_registrado');
        });
    });
};

exports.eliminarAnimal = (req, res) => {
    const id_animal = req.params.id; // Obtenemos el ID de la URL
    const id_productor = req.session.userId;

    // Verificamos que el animal pertenece a la finca del usuario por seguridad
    const sql = `DELETE FROM ganado 
                 WHERE id_animal = ? 
                 AND id_finca = (SELECT id_finca FROM fincas WHERE id_productor = ?)`;

    db.run(sql, [id_animal, id_productor], function(err) {
        if (err) {
            console.error("Error al eliminar:", err.message);
            return res.send("Error al eliminar el animal.");
        }
        console.log(`🗑️ Animal con ID ${id_animal} eliminado.`);
        res.redirect('/dashboard');
    });
};

// --- CERRAR SESIÓN ---
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Error al cerrar sesión:", err);
        }
        res.clearCookie('connect.sid'); // Limpia la cookie del navegador
        res.redirect('/login');
    });
};