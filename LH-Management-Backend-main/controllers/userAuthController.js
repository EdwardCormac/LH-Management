// controllers/authController.js
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { ALLOW_SIGNUP } = require('../config/env');
const { signToken } = require('../utils/jwt');



module.exports.signup = async (req, res) => {
  // Public signup lets the caller choose any role, so it is disabled unless ALLOW_SIGNUP=true.
  if (!ALLOW_SIGNUP) {
    return res.status(403).json({ message: 'Signup is disabled' });
  }
  try {
    const { email, password, role } = req.body;

    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      email,
      password: hashedPassword,
      role, // Assuming you have a 'role' field in your user schema
    });

    // Save the user to the database
    await newUser.save();
    // Generate a JWT token for the newly registered user
    const token = await signToken(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      '1d'
    );

    // Set the JWT token in a cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: 'none',
      secure:true
    });

    res.status(201).json({ message: 'Signup successful', user: { email: newUser.email, role: newUser.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user in the database
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate a JWT token
    const token = await signToken(
      { userId: user.id, email: user.email, role: user.role },
      '1d' // Token expiration time
    );

    // Set the JWT token in a cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite:'none',
      secure:true
    });

    // Set user data in the session (if using session)
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      token,
    };

    res.json({ message: 'Login successful', user: req.session.user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports.logout = async (req, res) => {
  // Clear the JWT cookie
  res.clearCookie('jwt',{sameSite:'none',
  secure:true});
  res.json({ message: 'Logout successful' });
};
