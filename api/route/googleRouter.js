// const express = require('express');
// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const jwt = require('jsonwebtoken');

// const router = express.Router();

// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: "https://d697-103-129-124-2.ngrok-free.app/auth/google/callback"
// },
//     function (accessToken, refreshToken, profile, cb) {
//         // Your user creation/retrieval logic here
//         return cb(null, { id: profile.id, email: profile.emails[0].value });
//     }
// ));

// router.get('/auth/google/callback',
//     passport.authenticate('google', { session: false, failureRedirect: 'myapp://auth/failure' }),
//     function (req, res) {
//         const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
//         res.redirect(`myapp://auth/success?token=${token}&googleId=${req.user.id}`);
//     });
// module.exports = router;