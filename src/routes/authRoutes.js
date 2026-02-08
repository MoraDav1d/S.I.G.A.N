const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/registrar-todo', authController.upload, authController.registrarTodo);
router.post('/registrar-ganado', authController.registrarGanado);
router.post('/actualizar-animal/:id', authController.actualizarGanado);
router.get('/logout', authController.logout);

router.post('/eliminar-animal/:id', authController.eliminarAnimal);

module.exports = router;