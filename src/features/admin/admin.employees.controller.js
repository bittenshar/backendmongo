// admin.employees.controller.js (MongoDB version)

const bcrypt = require('bcryptjs');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const User = require('../auth/auth.model'); // or '../users/user.model' if that's where your User schema is

// GET /api/admin/employees
exports.getAllEmployees = catchAsync(async (req, res, next) => {
  console.log('📊 Getting all employees (MongoDB)...');

  try {
    // Verify admin permissions (route is already protected, this is extra safety)
    if (!req.user || req.user.role !== 'admin') {
      console.log('❌ Unauthorized access attempt to get employees list');
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    // MongoDB: find all users with role = 'employee'
    const employees = await User.find({ role: 'employee' })
      .select('-password') // strip password
      .sort('-createdAt'); // optional: keep newest first, similar to how you'd usually view

    console.log(`✅ Found ${employees.length} employees`);

    res.status(200).json({
      status: 'success',
      results: employees.length,
      data: { employees }
    });
  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    return next(
      new AppError(`Failed to fetch employees: ${error.message}`, 500)
    );
  }
});

// POST /api/admin/employees
exports.createEmployee = catchAsync(async (req, res, next) => {
  console.log('🧑‍💼 Creating employee (MongoDB)...');

  try {
    // Verify admin permissions (route is already protected, this is extra safety)
    if (!req.user || req.user.role !== 'admin') {
      console.log('❌ Unauthorized access attempt to create employee');
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    const {
      fullName,
      name,
      username,
      email,
      password,
      phone,
      permissions,
      status
    } = req.body || {};

    // Basic validation
    if (!email || !password) {
      return next(new AppError('Email and password are required', 400));
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate userId (keep same format as before)
    const userId = `emp_${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    const timestamp = new Date().toISOString();

    // Create employee document in MongoDB
    const employeeDoc = await User.create({
      userId,
      fullName: fullName || name || username || null,
      name: name || fullName || username || null, // optional: if your schema has "name"
      username: username || null,                // optional: if your schema has "username"
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || null,
      role: 'employee',
      permissions: Array.isArray(permissions) ? permissions : [],
      avatar: null,
      verificationStatus: 'pending',
      aadhaarPhoto: null,
      uploadedPhoto: null,
      lastLogin: null,
      status: status || 'active',
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // Remove password before sending response
    const safeEmployee = employeeDoc.toObject();
    delete safeEmployee.password;

    res.status(201).json({
      status: 'success',
      data: { employee: safeEmployee }
    });
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    return next(
      new AppError(`Failed to create employee: ${error.message}`, 500)
    );
  }
});
