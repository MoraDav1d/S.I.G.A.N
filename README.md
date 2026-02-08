# SIGAN - Sistema Integral de Gestión Agropecuaria Nacional 🇻🇪

SIGAN es una plataforma web desarrollada para la gestión y control del inventario bovino en Venezuela. Permite a los productores registrar sus fincas y animales, manteniendo un control detallado alineado con la codificación de estados nacionales.

## 🚀 Características Actuales
- **Autenticación de Usuarios:** Sistema de login y registro para productores.
- **Gestión de Fincas:** Registro de unidades de producción con ubicación geográfica.
- **Inventario Bovino Completo:** - Registro de animales (Arete, Nombre, Raza, Sexo, Peso).
  - Control de procedencia basado en los 24 estados de Venezuela (Codificación oficial).
  - Edición y actualización de datos en tiempo real.
- **Interfaz Adaptativa (Responsive):** Navbar funcional para escritorio y dispositivos móviles.
- **Reportes Oficiales:** Generación de archivos PDF con el inventario detallado de la finca.

## 🛠️ Tecnologías Utilizadas
- **Backend:** Node.js y Express.js.
- **Motor de Plantillas:** EJS (Embedded JavaScript) para vistas dinámicas.
- **Base de Datos:** SQLite3 (Persistencia de datos local).
- **Estilos:** CSS3 nativo con diseño responsivo.
- **Generación de Documentos:** PDFKit.
- **Iconografía:** FontAwesome 6.0.

## 📁 Estructura del Proyecto
- `/public`: Archivos estáticos (CSS, Imágenes, JS del lado del cliente).
- `/src/models`: Configuración de la base de datos (SQLite).
- `/src/views`: Plantillas EJS (Dashboard, Registro, Edición, Partials).
- `/src/controllers`: Lógica de negocio y manejo de rutas.
- `app.js`: Punto de entrada de la aplicación.

## Aquí tienes el desglose de las dependencias, una debajo de la otra, ideal para copiarlo directamente en tu README.md o para explicárselo al profesor:


## ⚙️ Instalación y Uso
1. Clonar el repositorio: `git clone <url-del-repo>`
2. Instalar dependencias: `npm install
3. Iniciar el servidor: `npm start` o `node app.js`
4. Acceder en el navegador a: `http://localhost:3000`

---
*Desarrollado para el fortalecimiento del sector agropecuario.*