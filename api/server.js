if (process.env.MONGO_URL !== 'production') {
    require('dotenv').config();
}
const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const app = express();
const serverPort = process.env.PORT || 3002;
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
app.use(cors({
    origin: ['http://localhost:3000', 'https://saulus-myo8hu43t-markchristiandurana75-gmailcoms-projects.vercel.app'],
}));


const authRoute = require('../api/route/auth');
const Request = require('../api/model/appointmentModel');
const User = require('./model/userModel');
const Item = require('../api/model/menu');
const googleUser = require('../api/model/googleSchema');
const inventoryRoute = require('../api/route/inventoryRoute');
const userRoute = require('../api/route/userRoute');
const fs = require('fs');
const checkTokenBlacklist = require('../api/middleware/logOut');
const medicalInfo = require('../api/route/medicalRoute');
const authenticateTokens = require('../api/middleware/authenticateToken');
const isAdmins = require('../api/middleware/isAdmin');
const validateTokens = require('../api/middleware/validateToken');
const archiveRoute = require('./route/archiveRoute');
const medicalRoute = require("./route/medic");
const stockRoutes = require("../api/route/stocksRoute");
const posterRoute = require("./route/poster");
const weightRoute = require("../api/route/weightRoute");
const googleRouter = require("../api/route/googleRouter");
const requestRoute = require("../api/route/requestsRoute");
const notificationsRoute = require("../api/route/notificationRoute");
const loginGoogle = require("../api/route/auth");
const eventRoute = require("../api/route/eventRoute");
const adminRoute = require("../api/route/adminRoute");
const scheduleRoute = require("../api/route/scheduleRoute");
const SerialPort = require("serialport");
const Readline = require("@serialport/parser-readline");
const postRoute = require("../api/route/postRoute");
const chartRoute = require("../api/route/chartRoute");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());



const tokenBlacklist = new Set();
mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB: " + error.message);
    });

app.listen(serverPort, () => {
    console.log("Connected to Server port: " + serverPort);
});

// Define your routes here 
app.get('/', (req, res) => { res.send('Event route works!'); });


app.use('/user', medicalInfo);
app.use('/user', userRoute);
app.use('/protected', checkTokenBlacklist);
app.use("/medical", validateTokens, medicalRoute);
app.use("/archive", authenticateTokens, archiveRoute);
app.use('/login', loginGoogle);
app.use("/stocks", validateTokens, isAdmins, stockRoutes);
app.use("/requests", validateTokens, requestRoute);
app.use("/notification", authenticateTokens, notificationsRoute);
app.use("/poster", authenticateTokens, posterRoute);
app.use("/event", authenticateTokens, eventRoute);
app.use("/admin", authenticateTokens, isAdmins, adminRoute);
app.use("/schedule", validateTokens, scheduleRoute);
app.use("/post", validateTokens, postRoute);
app.use("/charts", chartRoute);

// app.use('/use', googleRouter);
// app.use(passport.initialize());
// app.use(googleRouter);

// app.use('/weight', weightRoute); // Use weight route




// app.get('/medical-info', authenticateTokens, isAdmins, validateTokens, async (req, res) => {
//     try {
//         const medicalInfos = await MedicalInfo.find();
//         res.status(200).send(medicalInfos);
//     } catch (error) {
//         res.status(500).send(error);
//     }
// });

// app.get('/', async (req, res) => {

//     try {
//         const user = await User.find()
//         res.status(200).json(user);
//     } catch (error) {
//         res.status(400).json({ message: "Email is already in use" });
//     }
// });

// app.post('/registers', async (req, res) => {
//     const { firstname, lastname, role, email, password } = req.body;

//     if (!firstname || !lastname || !role || !email || !password) {

//         res.status(400).json({ message: "All fields are required" });
//     }

//     const userAvailable = await User.findOne({ email: email });
//     if (userAvailable) {
//         res.status(400).json({ message: "Email is already in use" });
//     }

//     // Hash Password
//     const hashedPassword = await bcrypt.hash(password, 10);
//     console.log(hashedPassword);

//     const user = await User.create({
//         firstname,
//         lastname,
//         role,
//         email,
//         password: hashedPassword
//     });
//     console.log(`user created ${user}`);

//     if (user) {
//         res.status(200).json({ success: true, id: user.id, email: user.email });
//     } else {
//         res.status(400);
//         throw new Error("User data is not valid");
//     }
// });

// app.put('/:id', async (req, res) => {
//     try {
//         const user = await User.findByIdAndUpdate(req.params.id)
//         return res.statusCode(200).json(user);

//     } catch (error) {
//         return res.status(401).json({ message: "User not authenticated or token is invalid" });
//     }
// })


// app.post('/login', async (req, res) => {
//     const { email, password } = req.body;

//     if (!email || !password) {
//         return res.status(401).json({ message: "All fields are required" });

//     }

//     const user = await User.findOne({ email });

//     if (!user) {
//         return res.status(401).json({ message: "Email or password is incorrect" });

//     }

//     if (!(await bcrypt.compare(password, user.password))) {
//         res.status(401);
//         throw new Error("Email or password is incorrect");
//     }

//     const payload = {
//         sub: user._id.toString(),
//         aud: 'Saulus',
//         role: user.role,
//         firstname: user.firstname,
//         iat: Math.floor(Date.now() / 1000),
//         exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30)
//     };

//     const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { algorithm: 'HS256' });

//     res.status(200).json({
//         id: user._id,
//         accessToken,
//         role: user.role,
//         firstname: user.firstname,
//     });
// });


// const validateToken = async (req, res, next) => {
//     const authHeader = req.headers.Authorization || req.headers.authorization;

//     if (authHeader && authHeader.startsWith('Bearer ')) {
//         const token = authHeader.split(" ")[1];

//         try {
//             const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

//             if (decoded.aud !== 'Saulus') { // Ensure this matches the audience value
//                 throw new Error('Invalid audience');
//             }

//             req.user = decoded.user;
//             next();
//         } catch (err) {
//             console.error('JWT verification failed:', err);
//             return res.status(401).json({ message: "User not authenticated" });
//         }
//     } else {
//         return res.status(401).json({ message: "User not authenticated or token is invalid" });
//     }
// };





// app.get('/user/:id', validateToken, async (req, res) => {
//     try {
//         const user = await User.findById(req.params.id);
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         res.json(user);
//     } catch (err) {
//         console.error('Error fetching user data:', err);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

// app.post('/req', async (req, res) => {
//     try {
//         const { title, description, googleId, author, userId } = req.body;

//         // Validate if userId exists
//         if (!userId) {
//             return res.status(400).json({ message: 'User ID is required.' });
//         }

//         // Validate if user exists in the database
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ message: 'User not found.' });
//         }

//         // Create a new request
//         const newRequest = await Request.create({
//             title,
//             description,
//             User: userId,// Store the user's ObjectId
//             googleId, // Store Google ID if provided
//             author // Store the author name or identifier
//         });
//         await newRequest.save();

//         return res.status(200).json({ message: 'Request created successfully', data: newRequest });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });



// const authenticateToken = (req, res, next) => {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];

//     if (token == null) return res.sendStatus(401);

//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
//         if (err) return res.sendStatus(403);
//         req.user = user;
//         next();
//     });
// };

// const isAdmin = (req, res, next) => {
//     const user = req.user; // Access the user object from the request

//     if (!user) {
//         return res.status(401).json({ message: 'Unauthorized: No user found' });
//     }

//     console.log('User ID:', user.sub); // Debug output for User ID
//     console.log('User Role:', user.role); // Debug output for User Role
//     console.log('User:', user);

//     const allowedRoles = ['admin', 'Nurse', "staff"];

//     if (allowedRoles.includes(user.role)) {
//         next(); // User has an allowed role, proceed to the next middleware
//     } else {
//         res.status(403).json({ message: 'Access denied: Insufficient permissions' });
//     }
// };


// // Route to get all requests (visible to admins)
// app.get('/requests', authenticateToken, isAdmin, async (req, res) => {
//     try {
//         const requests = await Request.find().populate('User', 'firstname lastname email');
//         res.json(requests);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching requests', error });
//     }
// });


// app.post('/admin/posts', authenticateToken, isAdmin, async (req, res) => {
//     try {

//         if (!req.user.sub) {
//             return res.status(401).json({ message: 'User not authenticated' });

//         }

//         const post = new Post({
//             title: req.body.title,
//             content: req.body.content,
//             author: req.user.sub,  // Ensure this references the user ID correctly
//         });
//         const savedPost = await post.save();
//         res.status(201).json(savedPost);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });

// // Route to get all posts
// app.get('/admin/posts', async (req, res) => {
//     try {
//         const posts = await Post.find();
//         res.json(posts);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });

// // Route to get all posts with populated user data
// app.get('/admin/posts/all', validateTokens, async (req, res) => {
//     try {
//         const posts = await Post.find().populate('author', 'firstname');

//         console.log(posts)
//         res.json(posts);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });

// app.patch('/posts/edit/:id', async (req, res) => {
//     try {
//         // Destructure title and content from req.body
//         const { title, content } = req.body;

//         // Check if title and content are provided
//         if (!title || !content) {
//             return res.status(400).json({ message: 'Title and content are required' });
//         }

//         // Update the post by ID, with title and content fields
//         const updatedPost = await Post.findByIdAndUpdate(
//             req.params.id,
//             { title, content }, // Update only the title and content
//             { new: true }        // Return the updated post
//         );

//         // If the post is not found
//         if (!updatedPost) {
//             return res.status(404).json({ message: 'Post not found' });
//         }
//         return res.status(200).json(updatedPost); // Return the updated post

//     } catch (error) {
//         return res.status(500).json({ message: error.message });
//     }
// });

// app.delete('/posts/delete/:id', async (req, res) => {

//     try {
//         const postIdToDelete = req.params.id;
//         const deletedPost = await Post.findByIdAndDelete(postIdToDelete);
//         if (deletedPost) {
//             res.status(200).json({ message: "Post deleted successfully" });
//         } else {
//             res.status(404).json({ message: "Post not found or already deleted" });
//         }
//     } catch (error) {
//         return res.status(500).json({ message: error.message });
//     }
// })

// const GoogleStrategy = require('passport-google-oauth2').Strategy;

// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     callbackURL: "https://d697-103-129-124-2.ngrok-free.app/auth/google/callback",
//     passReqToCallback: true
// },
//     async function (request, accessToken, refreshToken, profile, done) {
//         try {
//             let user = await googleUser.findOne({ googleId: profile.id });
//             if (!user) {
//                 user = await googleUser.create({
//                     googleId: profile.id,
//                     name: profile.displayName,
//                     email: profile.emails[0].value,
//                     profilePicture: profile.photos[0]?.value,
//                     role: 'user',
//                 });
//             }

//             // Create JWT token
//             const payload = {
//                 sub: user._id.toString(),
//                 aud: 'Saulus',
//                 role: user.role,
//                 name: user.name,
//                 googleId: user.googleId,
//                 iat: Math.floor(Date.now() / 1000),
//                 exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
//             };

//             const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { algorithm: 'HS256' });

//             return done(null, { user, token });
//         } catch (err) {
//             return done(err, null);
//         }
//     }));


// function isLoggedIn(req, res, next) {
//     req.user ? next() : res.sendStatus(401);
// }

// passport.serializeUser((data, done) => {
//     done(null, data);
// });

// passport.deserializeUser((data, done) => {
//     done(null, data);
// });




// app.use(session({
//     secret: process.env.CLIENT_SECRET,
//     resave: false,
//     saveUninitialized: true,
//     cookie: { secure: false }
// }));
// app.use(passport.initialize());
// app.put('/item/:id',
//     // Validate inputs
//     [
//         body('itemName').notEmpty().withMessage('Item name is required'),
//         body('quantity').isNumeric().withMessage('Quantity should be a number'),
//         body('manufactors').notEmpty().withMessage('Manufactors is required'),
//     ],
//     async (req, res) => {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ errors: errors.array() });
//         }

//         const { itemName, quantity, expiredDate, manufactors } = req.body;
//         const itemId = req.params.id;
//         console.log(itemId);
//         console.log('Received request to update item with ID:', itemId);

//         try {
//             const updatedItem = { itemName, quantity, expiredDate, manufactors };

//             const updatedDocument = await Item.findByIdAndUpdate(itemId, updatedItem, { new: true, runValidators: true });
//             console.log(updatedItem)
//             if (!updatedDocument) {
//                 console.error('Failed to update item:', itemId);
//                 return res.status(404).json({ message: 'Item not found' });
//             }

//             console.log('Item updated successfully:', updatedDocument);
//             return res.status(200).json({ message: 'Item updated successfully', updatedItem: updatedDocument });
//         } catch (err) {
//             console.error('Error updating item:', err);
//             if (err.name === 'ValidationError' || err.name === 'CastError') {
//                 return res.status(400).json({ message: 'Validation error', error: err.message });
//             }
//             return res.status(500).json({ message: 'Internal Server Error' });
//         }
//     }
// );



// app.get('/search', async (req, res) => {
//     const { q } = req.query;

//     try {
//         const items = await Item.find({ itemName: { $regex: q, $options: 'i' } }).exec();
//         res.json(items);
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Internal Server Error');
//     }
// });

app.use('/auth', authRoute);

app.use('/inventory', inventoryRoute)

module.exports = app; 