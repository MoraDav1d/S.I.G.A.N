const db = require('./db');

const User = {
    // Crear un nuevo usuario (Productor)
    create: (userData, callback) => {
        const { nombre, apellido, cedula, telefono, correo, password } = userData;
        
        // Convertimos el correo a minúsculas antes de guardar para evitar duplicados por formato
        const correoMin = correo.toLowerCase().trim();
        
        const sql = `INSERT INTO productores (nombre, apellido, cedula, telefono, correo, password) VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(sql, [nombre, apellido, cedula, telefono, correoMin, password], callback);
    },
    
    // Buscar usuario por correo (Insensible a mayúsculas/minúsculas)
    findByEmail: (email, callback) => {
        // Usamos LOWER para comparar siempre en minúsculas y encontrar coincidencias exactas
        const sql = `SELECT * FROM productores WHERE LOWER(correo) = LOWER(?)`;
        db.get(sql, [email.trim()], (err, row) => {
            callback(err, row);
        });
    }
};

module.exports = User;