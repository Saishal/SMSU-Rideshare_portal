const User = require('../models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// --- 1. Configure Email Transporter (Nodemailer) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- Render Pages ---

exports.getLogin = (req, res) => {
  res.render('auth/login', { 
    title: 'Login', // <-- CORRECTED: title
    errorMessage: null
  });
};

exports.getRegister = (req, res) => {
  res.render('auth/register', { 
    title: 'Register', // <-- CORRECTED: title
    errorMessage: null,
    oldInput: { name: '', email: '', role: 'student' } 
  });
};

// New: Show the Verification Page
exports.getVerify = (req, res) => {
  const email = req.query.email || ''; 
  res.render('auth/verify', { 
    title: 'Verify Email', // <-- CORRECTED: title
    email: email, 
    errorMessage: null 
  });
};

// --- Handle Logic (Only showing where titles are passed in re-render) ---

// Handle Registration
exports.postRegister = async (req, res) => {
  // ... (unchanged logic: domain validation, user creation, email sending) ...

    if (!isStudent && !isStaff) {
      return res.render('auth/register', {
        title: 'Register', // <-- CORRECTED: title
        errorMessage: 'Access Denied. You must use a valid SMSU/MinnState email (@go.minnstate.edu or @minnstate.edu).',
        oldInput: { name, email, role }
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('auth/register', {
        title: 'Register', // <-- CORRECTED: title
        errorMessage: 'This email is already registered. Please login.',
        oldInput: { name, email, role }
      });
    }

    // ... (rest of the postRegister logic is unchanged: save user, send email, redirect to /verify) ...
    // Note: The success page does not need title defined here since you redirect
};

// Handle Verification Logic
exports.postVerify = async (req, res) => {
  const { email, code } = req.body;
  
  try {
    const user = await User.findOne({ email }).select('+verificationCode +verificationCodeExpires');

    if (!user) {
      return res.render('auth/verify', { title: 'Verify', email, errorMessage: 'User not found.' }); // <-- CORRECTED: title
    }

    if (user.verificationCode !== code || Date.now() > user.verificationCodeExpires) {
       return res.render('auth/verify', { title: 'Verify', email, errorMessage: 'Invalid or expired code.' }); // <-- CORRECTED: title
    }

    // ... (success logic is unchanged) ...
    res.redirect('/login');

  } catch (err) {
    console.log(err);
    res.redirect('/login');
  }
};

// Handle Login
exports.postLogin = async (req, res) => {
  // ... (unchanged logic: find user, compare password) ...

    if (!user || !(await user.comparePassword(password))) {
      return res.render('auth/login', {
        title: 'Login', // <-- CORRECTED: title
        errorMessage: 'Invalid email or password.'
      });
    }

    // CRITICAL: Check if Verified
    if (!user.isVerified) {
       return res.render('auth/verify', {
         title: 'Verify Email', // <-- CORRECTED: title
         email: email,
         errorMessage: 'You must verify your email before logging in.'
       });
    }

    // ... (session logic and redirect is unchanged) ...
};

// Logout is unchanged
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};