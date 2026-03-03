const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// --- Login Routes ---
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

// --- Register Routes ---
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);

// --- Verification Routes (New!) ---
router.get('/verify', authController.getVerify);
router.post('/verify', authController.postVerify);

// --- Logout Route ---
router.get('/logout', authController.logout);

module.exports = router; 
