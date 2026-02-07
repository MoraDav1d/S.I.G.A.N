const db = require('./db');

const User = {
    create: (userData, callback) => {
        const { nombre, apellido, cedula, telefono, correo, password } = userData;
        const sql = `INSERT INTO productores (nombre, apellido, cedula, telefono, correo, password) VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(sql, [nombre, apellido, cedula, telefono, correo, password], callback);
    },
    
    findByEmail: (email, callback) => {
        const sql = `SELECT * FROM productores WHERE correo = ?`;
        db.get(sql, [email], callback);
    }
};

module.exports = User;