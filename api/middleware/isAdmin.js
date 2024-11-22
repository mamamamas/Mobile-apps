const isAdmin = (req, res, next) => {
    const user = req.user;
    console.log(user);
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized: No user found' });
    }

    console.log('User ID:', user.sub);
    console.log('User Role:', user.role);
    console.log('User:', user);

    const allowedRoles = ['admin', 'Nurse', 'staff'];

    if (allowedRoles.includes(user.role)) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
};

module.exports = isAdmin;