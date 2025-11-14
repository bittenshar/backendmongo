// routes/admin/admin.employees.routes.js

const express = require('express');
const router = express.Router();

const employeeController = require('./admin.employees.controller');
const authMiddleware = require('../auth/auth.middleware');

// Protect all routes – requires login
router.use(authMiddleware.protect);

// Restrict all routes to admin users
router.use(authMiddleware.restrictTo('admin'));

// GET /api/admin/employees - List employees
router.get('/', employeeController.getAllEmployees);

// POST /api/admin/employees - Create employee
router.post('/', employeeController.createEmployee);

module.exports = router;
