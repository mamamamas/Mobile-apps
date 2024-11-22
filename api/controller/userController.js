const asyncHandler = require('express-async-handler');
const User = require('../model/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const tokenBlacklist = new Set();
const PersonalInfo = require("../model/personalInfoModel");
const EducationInfo = require("../model/educationInfo");
const MedicalInfo = require("../model/medicalRecords/medicalInfo");
const Immunization = require("../model/medicalRecords/immunization");
const Assessment = require("../model/medicalRecords/assessment");
const passport = require('passport');
const { encrypt, decrypt } = require("../middleware/encryption")
const { cloudinary } = require("../middleware/config");
const getGoogle = passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
});

const getGoogleCallback = async (req, res, next) => {
    try {
        const { code } = req.query; // Assuming the mobile app sends the Google auth code

        // Exchange the code for Google tokens
        const { tokens } = await oauth2Client.getToken(code);

        // Verify the ID token
        const ticket = await oauth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        // Create your own JWT
        const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { algorithm: 'HS256' });

        // Redirect to the mobile app with the token
        const redirectUrl = `myapp://auth/success?token=${accessToken}`;
        return res.redirect(redirectUrl);
    } catch (error) {
        console.error('Authentication error:', error);
        return res.redirect('myapp://auth/failure');
    }
};

const getAllUser = asyncHandler(async (req, res) => {

    try {
        const user = await User.find()
        res.status(200).json(user);
    } catch (error) {
        res.status(400).json({ message: "Email is already in use" });
    }
})

const getUser = asyncHandler(async (req, res) => {
    try {
        const userId = req.params.id;
        const currentUser = req.user;
        if (currentUser.role !== "admin" && currentUser.id !== userId) {
            return res.status(404).json({ error: "Not authorize" });
        }
        const personal = await PersonalInfo.findOne({ userId }).lean();
        const medical = await MedicalInfo.findOne({ userId }).lean();
        const education = await EducationInfo.findOne({ userId }).lean();
        const user = await User.findById(userId, "pfp").lean();

        const assessment = await Assessment.find({ medicalInfoId: medical._id }).lean();

        const decryptedAssessment = assessment.map(item => ({
            ...item,
            actions: decrypt(item.actions), // Decrypt actions
            complaints: decrypt(item.complaints), // Decrypt complaints
            // Decrypt other fields as necessary
        }));
        const immunization = await Immunization.find({ medicalInfoId: medical._id }).lean();

        if (personal) {
            return res.status(200).json({
                personal,
                medical,
                education,
                assessment: decryptedAssessment,
                immunization,
                pfp: user.pfp,
            });
        } else {
            console.log(`User with ID ${userId} not found`);
            return res.status(404).json({ error: "User not found" });
        }
    } catch (err) {
        console.log("error:", err);
        res.status(500).json({ error: "Error fetching user" });
    }
});

const registerUser = asyncHandler(async (req, res) => {
    const { username, password, email } = req.body;

    try {
        const exist = await User.findOne({ username });
        if (exist) {
            return res.status(400).json({ error: "User already exists" });
        }

        const existE = await User.findOne({ email });
        if (existE) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = await User.create({
            username,
            password: hashedPassword,
            email,
            role: "student"
        });

        // Add related information
        await PersonalInfo.create({ userId: newUser._id });
        await MedicalInfo.create({ userId: newUser._id });
        await EducationInfo.create({
            userId: newUser._id,
            educationLevel: null,
            yearlvl: null,
            section: null,
            department: null,
            strand: null,
            course: null,
        });

        // Generate token
        const token = jwt.sign({ id: newUser.id }, process.env.ACCESS_TOKEN_SECRET);
        console.log("Token generated:", token);

        // Set cookie
        res.cookie("jwtToken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
        });

        return res.status(200).json({ message: "Register Successful" });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Error registering" });
    }
});

const updateUser = asyncHandler(async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id)
        return res.statusCode(200).json(user);

    } catch (error) {
        return res.status(401).json({ message: "User not authenticated or token is invalid" });
    }
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(401).json({ message: "All fields are required" });

    }

    const user = await User.findOne({ email });
    if (user.role === "student") {
        return res
            .status(400)
            .json({ error: "Student can only login via google" });
    }
    if (!user) {
        return res.status(401).json({ message: "Email or password is incorrect" });

    }
    console.log(user);

    if (!(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Email or password is incorrect" });
    }

    const payload = {
        sub: user._id.toString(),
        aud: 'Saulus',
        role: user.role,
        firstname: user.firstname,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30)
    };

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { algorithm: 'HS256' });

    res.status(200).json({
        id: user._id,
        accessToken,
        role: user.role,
        firstname: user.firstname,
        username: user.username
    });
});
const logoutUser = asyncHandler(async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];

    try {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
        return res.status(400).json({ message: 'The token is invalid' });
    }

    if (tokenBlacklist.has(token)) {
        return res.status(200).json({ message: 'The token is already in the blacklist' });
    }

    tokenBlacklist.add(token);
    res.status(200).json({ message: 'Logged out successfully' });
});

// router.patch("/profile/:id", auth, 

const UpdateStudentProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const currentUser = req.user;
        const currentUserId = req.user.sub;
        const { personal, education, medical } = req.body;

        console.log('Updating profile for user ID:', userId);
        console.log("Received education data:", education);
        console.log("Complete request body:", req.body);
        // Check for authorization
        if (
            currentUser.role !== "admin" &&
            currentUser.role !== "staff" &&
            currentUserId !== userId
        ) {
            return res.status(403).json({ error: "Not authorized" });
        }

        // Check for duplicate email
        if (personal?.email) {
            const existingUser = await User.findOne({ email: personal.email });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).json({ error: "Email already exists." });
            }
        }

        // Update Personal Info
        if (personal) {
            if (personal.firstName !== null) personal.firstName = encrypt(personal.firstName);
            if (personal.lastName !== null) personal.lastName = encrypt(personal.lastName);
            if (personal.sex !== null) personal.sex = encrypt(personal.sex);
            if (personal.civilStatus !== null) personal.civilStatus = encrypt(personal.civilStatus);
            if (personal.address !== null) personal.address = encrypt(personal.address);
            if (personal.religion !== null) personal.religion = encrypt(personal.religion);
            if (personal.telNo !== null) personal.telNo = encrypt(personal.telNo);
            if (personal.guardian !== null) personal.guardian = encrypt(personal.guardian);
            if (personal.guardianAddress !== null) personal.guardianAddress = encrypt(personal.guardianAddress);
            if (personal.guardianTelNo !== null) personal.guardianTelNo = encrypt(personal.guardianTelNo);

            if (personal.dateOfBirth !== null) {
                personal.dateOfBirth = new Date(personal.dateOfBirth);
            }

            await PersonalInfo.findOneAndUpdate({ userId: userId }, personal, {
                new: true,
                upsert: true,
            });
        }

        if (education && education.educationLevel && education.yearlvl && education.section) {
            console.log("Populated education data:", education);
            await EducationInfo.findOneAndUpdate({ userId: userId }, education, {
                new: true,
                upsert: true,
            });
        } else {
            console.error("Incomplete education data:", education);
        }

        // Update Medical Info
        if (medical) {
            const medicalToUpdate = {};

            for (const key in medical) {
                if (medical[key] !== null) {
                    if (key === "timestamp" || key === "_id" || key === "userId") {
                        medicalToUpdate[key] = medical[key];
                    } else if (typeof medical[key] === "boolean") {
                        medicalToUpdate[key] = medical[key];
                    } else if (typeof medical[key] === "object" && medical[key] instanceof Date) {
                        medicalToUpdate[key] = new Date(medical[key]);
                    } else if (typeof medical[key] === "string") {
                        medicalToUpdate[key] = encrypt(medical[key]);
                    } else {
                        medicalToUpdate[key] = medical[key];
                    }
                }
            }

            await MedicalInfo.findOneAndUpdate(
                { userId: userId },
                { $set: medicalToUpdate },
                { new: true, upsert: true }
            );
        }

        // Fetch updated data if needed
        const updatedPersonal = personal ? await PersonalInfo.findOne({ userId: userId }) : null;
        const updatedEducation = education ? await EducationInfo.findOne({ userId: userId }) : null;
        const updatedMedical = medical ? await MedicalInfo.findOne({ userId: userId }) : null;

        return res.status(200).json({
            personal: updatedPersonal,
            education: updatedEducation,
            medical: updatedMedical,
        });

    } catch (err) {
        if (err.code === 11000 && err.keyPattern?.email) {
            return res.status(409).json({ error: "Email already exists." });
        }
        console.error("Error updating user profile:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// router.get("/profile/:id", auth, 

const StudentGetProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const currentUser = req.user;

        const currentUserId = currentUser.sub;

        console.log("userID Link: ", userId + " vs " + currentUserId + " " + JSON.stringify(currentUser));

        // Authorization check
        if (
            currentUser.role !== "admin" &&
            currentUser.role !== "staff" &&
            currentUser.role !== "student" &&
            !currentUserId.equals(userId)
        ) {
            return res.status(404).json({ error: "Not authorized" });
        }
        console.log("Fetching profile for user ID:", userId);
        // Get current user's education info for staff authorization
        const currentUserEducation = await EducationInfo.findOne({
            userId: currentUserId,
        }).select("educationLevel");

        // Retrieve user's data
        const personal = await PersonalInfo.findOne({ userId });
        const medical = await MedicalInfo.findOne({ userId });
        const education = await EducationInfo.findOne({ userId });
        const user = await User.findById(userId, "pfp");

        // Assessments and immunization data
        const assessment = await Assessment.find({ medicalInfoId: medical?._id });
        const immunization = await Immunization.find({
            medicalInfoId: medical?._id,
        });

        const decryptIfValid = (value) => {
            if (value && value !== "N/A" && value.includes(":")) {
                return decrypt(value);
            }
            return value; // Return the original value if it's invalid for decryption
        };

        // Decrypt personal info if available
        if (personal) {
            personal.firstName = decryptIfValid(personal.firstName);
            personal.lastName = decryptIfValid(personal.lastName);
            personal.sex = decryptIfValid(personal.sex); // Decrypt 'sex' enum
            personal.civilStatus = decryptIfValid(personal.civilStatus); // Decrypt 'civilStatus' enum
            personal.address = decryptIfValid(personal.address);
            personal.religion = decryptIfValid(personal.religion);
            personal.telNo = decryptIfValid(personal.telNo);
            personal.guardian = decryptIfValid(personal.guardian);
            personal.guardianAddress = decryptIfValid(personal.guardianAddress);
            personal.guardianTelNo = decryptIfValid(personal.guardianTelNo);

            if (personal.dateOfBirth) {
                personal.dateOfBirth = new Date(personal.dateOfBirth); // This may be redundant if it's already a Date
            }
        }

        if (medical) {
            const medicalFields = [
                "respiratory",
                "digestive",
                "nervous",
                "excretory",
                "endocrine",
                "circulatory",
                "skeletal",
                "muscular",
                "reproductive",
                "lymphatic",
                "psychological",
                "specificPsychological",
                "allergy",
                "specificAllergy",
                "eyes",
                "ear",
                "nose",
                "throat",
                "tonsils",
                "teeth",
                "tongue",
                "neck",
                "thyroids",
                "cervicalGlands",
                "chest",
                "contour",
                "heart",
                "rate",
                "rhythm",
                "bp",
                "height",
                "weight",
                "bmi",
                "lungs",
                "abdomen",
                "ABcontour",
                "liver",
                "spleen",
                "kidneys",
                "extremities",
                "upperExtremities",
                "lowerExtremities",
                "bloodChemistry",
                "cbc",
                "urinalysis",
                "fecalysis",
                "chestXray",
                "others",
            ];

            medicalFields.forEach((field) => {
                if (
                    medical[field] &&
                    medical[field] !== "N/A" &&
                    medical[field].includes(":")
                ) {
                    medical[field] = decrypt(medical[field]);
                }
            });
        }

        if (immunization) {
            immunization.forEach((item) => {
                item.vaccine = decryptIfValid(item.vaccine);
                item.remarks = decryptIfValid(item.remarks);
            });
        }

        if (assessment) {
            assessment.forEach((item) => {
                item.complaints = decryptIfValid(item.complaints);
                item.actions = decryptIfValid(item.actions);
                if (item.followUps) {
                    item.followUps.followUpComplaints = decryptIfValid(
                        item.followUps.followUpComplaints
                    );
                    item.followUps.followUpActions = decryptIfValid(
                        item.followUps.followUpActions
                    );
                }
            });
        }

        // Return the data, ensuring consistency with PATCH
        return res.status(200).json({
            personal,
            medical,
            education,
            assessment,
            immunization,
            pfp: user?.pfp,
            staffAuth: currentUserEducation,
        });
    } catch (err) {
        res.status(404).json({ error: "Error fetching user" });
    }
};

const ChangePhoto = async (req, res) => {
    const Id = req.params.id;
    const currentUser = req.user;

    try {
        let imgUrl = "";
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "requestforms/medical",
            });
            imgUrl = result.secure_url;
        }

        // Update user profile picture
        const updatedUser = await User.findByIdAndUpdate(Id, { pfp: imgUrl }, { new: true });
        return res.status(200).json(updatedUser);
    } catch (err) {
        console.error("Error uploading image:", err);
        return res.status(500).json({ error: "Failed to upload image" });
    }
};



module.exports = {
    registerUser, loginUser, updateUser, getAllUser, getUser, logoutUser, ChangePhoto, getGoogle, getGoogleCallback, UpdateStudentProfile, StudentGetProfile
}