const User = require('../models/userModel');
const multer = require('multer');
const path = require('path');

// Configuración de dónde y cómo se guardan las fotos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Las fotos irán aquí
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Nombre único
    }
});

const upload = multer({ storage: storage });
exports.upload = upload.single('hierro'); // 'hierro' es el nombre del input en el HTML

// --- LOGICA DE REGISTRO DE USUARIO ---
exports.register = (req, res) => {
    User.create(req.body, (err) => {
        if (err) return res.send("Error: La cédula o correo ya existen.");
        res.redirect('/login');
    });
};

// --- LOGICA DE LOGIN ---
exports.login = (req, res) => {
    const { correo, password } = req.body;
    User.findByEmail(correo, (err, user) => {
        if (err || !user || user.password !== password) {
            return res.send("Correo o contraseña incorrectos.");
        }
        res.redirect('/registro-finca');
    });
};

// --- LOGICA DE REGISTRO DE FINCA (Aquí se guarda todo) ---
exports.registrarTodo = (req, res) => {
    console.log("Datos recibidos:", req.body);
    console.log("Imagen recibida:", req.file);
    
    // Por ahora, solo confirmamos que llegó
    res.send("<h1>¡Registro Exitoso!</h1><p>La finca y el hierro han sido guardados en el sistema nacional.</p><a href='/'>Volver al inicio</a>");
};