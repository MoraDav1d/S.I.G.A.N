const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Esto crea el archivo de la base de datos en la raíz de tu proyecto
const dbPath = path.resolve(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar con SQLite:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos SQLite.');
    }
});

// Crear las tablas necesarias
db.serialize(() => {
    // 1. Tabla de Productores (Usuarios)
    db.run(`CREATE TABLE IF NOT EXISTS productores (
        id_productor INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        cedula TEXT UNIQUE NOT NULL,
        telefono TEXT,
        correo TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // 2. Tabla de Fincas y Hierros
    db.run(`CREATE TABLE IF NOT EXISTS fincas (
        id_finca INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_finca TEXT NOT NULL,
        ubicacion TEXT,
        estado TEXT,
        municipio TEXT,
        nombre_prop TEXT,
        apellido_prop TEXT,
        cedula_prop TEXT,
        telefono_prop TEXT,
        correo_prop TEXT,
        hierro_img TEXT, -- Aquí guardaremos el nombre de la imagen
        id_productor INTEGER,
        FOREIGN KEY (id_productor) REFERENCES productores(id_productor)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ganado (
        id_animal INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_arete TEXT UNIQUE, 
        nombre_animal TEXT,
        raza TEXT,
        sexo TEXT,
        fecha_nacimiento DATE,
        peso_inicial REAL,
        proposito TEXT,
        codigo_estado INTEGER,
        id_finca INTEGER,
        FOREIGN KEY (id_finca) REFERENCES fincas(id_finca)
    )`, (err) => {
        if (err) {
            console.error("Error al crear la tabla ganado:", err.message);
        } else {
            console.log("✅ Tabla 'ganado' verificada/creada correctamente.");
        }
    });
});

db.run(`ALTER TABLE ganado ADD COLUMN proposito TEXT`, (err) => {
    if (err) {
        console.log("La columna 'proposito' ya existe o no se pudo agregar.");
    } else {
        console.log("✅ Columna 'proposito' agregada con éxito.");
    }
});

db.run(`ALTER TABLE ganado ADD COLUMN codigo_estado INTEGER`, (err) => {
    if (err) {
        // Esto es normal si la columna ya fue agregada anteriormente
        console.log("La columna 'codigo_estado' ya existe o no se pudo agregar.");
    } else {
        console.log("✅ Columna 'codigo_estado' agregada con éxito para el Registro Nacional.");
    }
});

module.exports = db;