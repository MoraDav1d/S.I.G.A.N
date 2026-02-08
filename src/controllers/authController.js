const User = require('../models/userModel');
const db = require('../models/db');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

// --- CONFIGURACIÓN DE MULTER ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'public/uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });
exports.upload = upload.single('hierro');

// --- REGISTRO Y LOGIN ---
exports.register = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('registro', { errores: errors.array(), datos: req.body });
    }
    User.create(req.body, (err) => {
        if (err) return res.render('registro', { errores: [{ msg: "Cédula o Correo ya registrado" }], datos: req.body });
        res.redirect('/login');
    });
};

exports.checkEmail = (req, res) => {
    let { email } = req.query;
    if (!email) return res.json({ exists: false });
    User.findByEmail(email.trim(), (err, user) => {
        if (user) return res.json({ exists: true });
        res.json({ exists: false });
    });
};

exports.login = (req, res) => {
    const { correo, password } = req.body;
    User.findByEmail(correo, (err, user) => {
        if (err || !user || user.password !== password) {
            return res.render('login', { error: "Credenciales incorrectas" });
        }
        req.session.userId = user.id_productor;
        req.session.userName = user.nombre; 
        res.redirect('/dashboard');
    });
};

// --- GESTIÓN DE FINCA ---
exports.registrarTodo = (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const { nombre_finca, estado, municipio, ubicacion, nombre_prop, apellido_prop, cedula, telefono, correo } = req.body;
    const hierro_img = req.file ? req.file.filename : null;
    const sql = `INSERT INTO fincas (nombre_finca, estado, municipio, ubicacion, nombre_prop, apellido_prop, cedula_prop, telefono_prop, correo_prop, hierro_img, id_productor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [nombre_finca, estado, municipio, ubicacion, nombre_prop, apellido_prop, cedula, telefono, correo, hierro_img, req.session.userId], (err) => {
        if (err) return res.status(500).send("Error al registrar finca.");
        res.redirect('/dashboard');
    });
};

// --- GESTIÓN DE GANADO ---
exports.registrarGanado = (req, res) => {
    const { codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito } = req.body;
    db.get(`SELECT id_finca FROM fincas WHERE id_productor = ?`, [req.session.userId], (err, finca) => {
        if (err || !finca) return res.send("Error: No tienes una finca registrada.");
        const sql = `INSERT INTO ganado (codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito, id_finca) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [codigo_arete, nombre_animal, raza, sexo, fecha_nacimiento, peso_inicial, proposito, finca.id_finca], (err) => {
            if (err) return res.send("Error al registrar el animal (¿Arete duplicado?)");
            res.redirect('/dashboard?success=animal_registrado');
        });
    });
};

exports.actualizarGanado = (req, res) => {
    const id_animal = req.params.id;
    const { nombre_animal, raza, sexo, peso_inicial, proposito } = req.body;
    const sql = `UPDATE ganado SET nombre_animal = ?, raza = ?, sexo = ?, peso_inicial = ?, proposito = ? WHERE id_animal = ? AND id_finca = (SELECT id_finca FROM fincas WHERE id_productor = ?)`;
    db.run(sql, [nombre_animal, raza, sexo, peso_inicial, proposito, id_animal, req.session.userId], function(err) {
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