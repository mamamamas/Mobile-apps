
const tokenBlacklist = new Set();
const checkTokenBlacklist = (req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    if (tokenBlacklist.has(token)) {
        return res.status(401).json({ message: 'Token is invalidated' });
    }
    next();
};
module.exports = checkTokenBlacklist;