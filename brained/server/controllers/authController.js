const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const analyticsService = require('../services/analyticsService');

// Token helpers
const createAccessToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const createRefreshToken = (user) => {
  // longer lived refresh token
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

  // allow creating an admin only when ADMIN_SECRET is provided and matches
  const requestedRole = req.body.role;
  const roleToSet = requestedRole === 'admin' && req.body.adminSecret === process.env.ADMIN_SECRET ? 'admin' : 'customer';

  const user = await User.create({ name, email, password: hash, role: roleToSet });

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

    // save refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    // set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({ accessToken, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    
    // Track user registration
    analyticsService.captureEvent(user._id.toString(), null, {
      eventType: 'user_registered',
      eventName: 'User Registered',
      pageURL: req.headers.referer || '/register',
      metadata: { email: user.email, role: user.role },
    }).catch(e => console.error('Analytics error:', e));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

    // store refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    // set cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    
    // Track user login
    analyticsService.captureEvent(user._id.toString(), null, {
      eventType: 'user_logged_in',
      eventName: 'User Logged In',
      pageURL: req.headers.referer || '/login',
      metadata: { email: user.email, role: user.role },
    }).catch(e => console.error('Analytics error:', e));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

  const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    // check token exists in user's stored tokens
    if (!user.refreshTokens.includes(token)) {
      return res.status(401).json({ message: 'Refresh token revoked' });
    }

  // rotate refresh token
  const newAccessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);

    // replace old refresh token using atomic operation to prevent version conflicts
    await User.findByIdAndUpdate(
      user._id,
      {
        $pull: { refreshTokens: token },
      }
    );
    await User.findByIdAndUpdate(
      user._id,
      {
        $addToSet: { refreshTokens: newRefreshToken },
      }
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken: newAccessToken, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        const user = await User.findById(payload.id);
        if (user) {
          user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
          await user.save();
        }
      } catch (e) {
        // ignore
      }
    }

    // clear cookie
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Logged out' });
    
    // Track user logout
    if (req.userId) {
      analyticsService.captureEvent(req.userId.toString(), null, {
        eventType: 'user_logged_out',
        eventName: 'User Logged Out',
        pageURL: req.headers.referer || '/logout',
      }).catch(e => console.error('Analytics error:', e));
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// middleware to protect routes
exports.authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    req.userRole = payload.role;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// authorize middleware - ensure user has one of the allowed roles
exports.authorize = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Extract and verify token
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ message: 'No token' });
      
      const token = auth.split(' ')[1];
      if (!token) return res.status(401).json({ message: 'No token' });
      
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.id;
        req.userRole = payload.role;
      } catch (e) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      
      // Check user exists and has required role
      const user = await User.findById(req.userId);
      if (!user) return res.status(401).json({ message: 'User not found' });
      if (!roles.includes(user.role)) return res.status(403).json({ message: 'Forbidden: Admin access required' });
      
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  };
};
