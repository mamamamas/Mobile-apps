const router = require("express").Router();
const PersonalInfo = require("../model/personalInfoModel");
const EducationInfo = require("../model/educationInfo");
const MedicalInfo = require("../model/medicalRecords/medicalInfo");
const User = require('../model/userModel');
const { encrypt, decrypt } = require("../middleware/encryption");
const { hashPassword, comparePassword } = require("../middleware/bcrypted");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../middleware/config");

//default route = /admin

router.get("/", async (req, res) => {
    const { educationLevel } = req.query;
    console.log("query: ", educationLevel);

    try {
        // Find accounts with the specified education level and where user role is not 'student'
        const accounts = await EducationInfo.find({ educationLevel })
            .populate({
                path: 'userId',
                match: { role: { $ne: "student" } } // Only fetch users with role other than 'student'
            });

        console.log("Found accounts:", accounts);

        const combinedData = await Promise.all(
            accounts.map(async (account) => {
                // Skip accounts with a null userId or filtered out due to role
                if (!account.userId) {
                    console.log("Account without eligible userId:", account._id);
                    return null;
                }

                const userId = account.userId._id;
                console.log("Processing userId:", userId);

                // Fetch personal info if available
                const personal = await PersonalInfo.findOne(
                    { userId },
                    "userId firstName lastName"
                );

                console.log("Personal info found:", personal ? "yes" : "no");

                if (!personal) {
                    console.log("No personal info found for userId:", userId);
                    return null;
                }

                const firstName = personal.firstName === "N/A" ? "N/A" : decrypt(personal.firstName);
                const lastName = personal.lastName === "N/A" ? "N/A" : decrypt(personal.lastName);

                return { userId, firstName, lastName };
            })
        );

        // Filter out null values to return only valid user data
        const filteredData = combinedData.filter((data) => data !== null);

        console.log("Filtered data length:", filteredData.length);

        res.json(filteredData);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Error fetching users", details: err.message });
    }
});

router.post("/register", async (req, res) => {
    const { username, password, email, education } = req.body;
    const currentUser = req.user;

    try {
        if (currentUser.role !== "admin") {
            return res.status(404).json({ error: "Not authorized" });
        }

        const exist = await User.findOne({ username });
        if (exist) {
            return res.status(400).json({ error: "User already exist" });
        }

        const existE = await User.findOne({ email });
        if (existE) {
            return res.status(400).json({ error: "Email already exist" });
        }

        const hashedPassword = await hashPassword(password);
        const newUser = await User.create({
            username: username,
            password: hashedPassword,
            email,
            role: "staff",
        });

        await PersonalInfo.create({
            userId: newUser._id,
        });

        await MedicalInfo.create({
            userId: newUser._id,
        });

        await EducationInfo.create({
            userId: newUser._id,
            educationLevel: education.educationLevel,
            yearlvl: education.yearlvl || null,
            section: education.section || null,
            department: education.department || null,
            strand: education.strand || null,
            course: education.course || null,
        });
        return res.status(200).json({ message: "Register Successful" });
    } catch (err) {
        console.log("error: ", err);
        res.status(404).json({ error: "error registering" });
    }
});

router.patch("/account/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const currentUser = req.user;
        const { email, password, username, education } = req.body;

        // Check if userId is valid
        if (!userId || userId === 'undefined') {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        if (currentUser.role !== "admin") {
            return res.status(403).json({ error: "Not authorized" });
        }

        const existingUser = await User.findOne({
            $or: [{ email: email }, { username: username }],
            _id: { $ne: userId },
        });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(400).json({ error: "Email already exists" });
            } else if (existingUser.username === username) {
                return res.status(400).json({ error: "Username already exists" });
            }
        }

        // Update User Info
        const updateFields = { email, username };
        if (password) {
            const hashedPassword = await hashPassword(password);
            updateFields.password = hashedPassword;
        }

        const updateUser = await User.findByIdAndUpdate(
            userId,
            updateFields,
            { new: true, runValidators: true }
        );

        if (!updateUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Update Education Info
        let updatedEducation = null;
        if (education) {
            updatedEducation = await EducationInfo.findOneAndUpdate(
                { userId: userId },
                education,
                {
                    new: true,
                    upsert: true,
                    runValidators: true,
                }
            );
        }

        return res.status(200).json({
            user: updateUser,
            education: updatedEducation,
        });
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ error: "Error updating user" });
    }
});

router.get("/account/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const currentUser = req.user;

        // if (currentUser.role !== "admin") {
        //     return res.status(403).json({ error: "Not authorized" });
        // }

        const user = await User.findById(userId);
        const education = await EducationInfo.findOne({ userId });

        // Return the data, ensuring consistency with PATCH
        return res.status(200).json({
            user,
            education,
        });
    } catch (err) {
        res.status(404).json({ error: "Error fetching user" });
    }
});

router.post("/password", async (req, res) => {
    const { adminPassword } = req.body;
    const currentUserId = req.user._id;

    try {
        const user = await User.findById({ _id: currentUserId });
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        if (user.role === "student") {
            return res.status(400).json({ error: "Not Authorized" });
        }

        const match = await comparePassword(adminPassword, user.password);
        if (match) {
            return res.status(200).json({ message: "Authentication Successful" });
        } else {
            return res.status(400).json({ error: "Password do not match" });
        }
    } catch (err) {
        console.log("error authenticating: ", err);
        res.status(404).json({ error: "error logging in" });
    }
});

module.exports = router;