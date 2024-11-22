const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log("Token missing");
        return res.sendStatus(401);
    }

    console.log("Received token:", token);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            console.log("Token verification failed:", err);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
