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
        hectareas REAL DEFAULT 0, -- Nueva columna para extensión de tierra
        nombre_prop TEXT,
        apellido_prop TEXT,
        cedula_prop TEXT,
        telefono_prop TEXT,
        correo_prop TEXT,
        hierro_img TEXT, 
        id_productor INTEGER,
        FOREIGN KEY (id_productor) REFERENCES productores(id_productor)
    )`);

    // 3. Tabla de Ganado
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

    // --- BLOQUE DE ACTUALIZACIONES SEGURAS (ALTER TABLES) ---

    // 1. Agregar hectareas a fincas (por si la tabla ya existía sin ella)
    db.run(`ALTER TABLE fincas ADD COLUMN hectareas REAL DEFAULT 0`, (err) => {
        if (err) {
            // No imprimimos error grave porque es normal que falle si ya existe
        } else {
            console.log("✅ Columna 'hectareas' agregada a 'fincas'.");
        }
    });

    // 2. Agregar proposito a ganado
    db.run(`ALTER TABLE ganado ADD COLUMN proposito TEXT`, (err) => {
        if (err) { /* ya existe */ } else {
            console.log("✅ Columna 'proposito' agregada a 'ganado'.");
        }
    });

    // 3. Agregar codigo_estado a ganado
    db.run(`ALTER TABLE ganado ADD COLUMN codigo_estado INTEGER`, (err) => {
        if (err) { /* ya existe */ } else {
            console.log("✅ Columna 'codigo_estado' agregada a 'ganado'.");
        }
    });
});

module.exports = db;