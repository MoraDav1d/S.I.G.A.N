const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { body } = require('express-validator');

const validateRegister = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio'),
    body('cedula').matches(/^[V|E|J|G]-[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}$/).withMessage('Formato de cédula inválido'),
    body('telefono').matches(/^(0414|0424|0412|0416|0426)[0-9]{7}$/).withMessage('Teléfono inválido (11 dígitos)'),
    body('correo').isEmail().withMessage('Correo inválido'),
    body('password').isLength({ min: 8 }).withMessage('Mínimo 8 caracteres').matches(/\d/).withMessage('Debe incluir un número').matches(/[A-Z]/).withMessage('Debe incluir una mayúscula'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) throw new Error('Las contraseñas no coinciden');
        return true;
    })
];

router.post('/register', validateRegister, authController.register);
router.post('/login', authController.login);
router.get('/check-email', authController.checkEmail); // NUEVA RUTA PARA AJAX
router.post('/registrar-todo', authController.upload, authController.registrarTodo);
router.post('/registrar-ganado', authController.registrarGanado);
router.post('/actualizar-animal/:id', authController.actualizarGanado);
router.get('/logout', authController.logout);

module.exports = router;