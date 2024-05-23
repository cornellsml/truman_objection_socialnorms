const passport = require('passport');

const User = require('../models/User');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async(id, done) => {
    try {
        return done(null, await User.findById(id));
    } catch (error) {
        return done(error);
    }
});

/**
 * Middleware.
 */
exports.isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/signup');
};