const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { body } = require('express-validator');

const validateRegister = [
    body('nombre').trim().notEmpty(),
    body('apellido').trim().notEmpty(),
    body('correo').isEmail(),
    body('password').isLength({ min: 8 })
];

router.post('/register', validateRegister, authController.register);
router.post('/login', authController.login);

// RUTAS AJAX PARA VALIDACIÓN EN TIEMPO REAL
router.get('/check-email', authController.checkEmail);
router.get('/check-cedula', authController.checkCedula);
router.get('/check-phone', authController.checkPhone);

router.post('/registrar-todo', authController.upload, authController.registrarTodo);
router.post('/registrar-ganado', authController.registrarGanado);
router.post('/actualizar-animal/:id', authController.actualizarGanado);
router.get('/logout', authController.logout);

module.exports = router;