const router = require("express").Router();
const Archive = require("../model/archive/archiveModel");
const ArchiveChange = require("../model/archive/archiveChanges");
const MedicalInfo = require("../model/medicalRecords/medicalInfo");
const Immunization = require("../model/medicalRecords/immunization");
const Assessment = require("../model/medicalRecords/assessment");
const PersonalInfo = require("../model/personalInfoModel");
const { encrypt, decrypt } = require("../middleware/encryption");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// route = /archive
// route = /archive
router.get("/:id/medical", async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user;

    try {
        if (currentUser.role !== "admin") {
            return res.status(404).json({ error: "Not authorized" });
        }

        console.log("Current User:", currentUser);

        const medical = await MedicalInfo.findOne({ userId }).lean();
        console.log("Medical Record:", medical);
        if (!medical) {
            return res.status(404).json({ error: "Medical record not found" });
        }

        const archive = await Archive.findOne({ documentId: medical._id.toString() }).lean();

        console.log("Archive found:", archive);
        if (!archive) {
            return res.status(404).json({ error: "Archive not found" });
        }

        const changes = await ArchiveChange.find({ archiveId: archive._id }).lean();
        console.log("Changes found:", changes);

        if (changes.length === 0) {
            return res.status(404).json({ error: "No changes found" });
        }

        // Process changes and user details
        const userIds = [...new Set(changes.map((change) => change.userId))];
        const userDetails = await PersonalInfo.find({
            userId: { $in: userIds },
        })
            .select("userId firstName lastName")
            .lean();

        console.log("User Details:", userDetails);

        // Update changes with user details
        const userDetailsMap = userDetails.reduce((acc, user) => {
            acc[user.userId] = user;
            return acc;
        }, {});

        const updatedChanges = changes.map((change) => {
            const userDetail = userDetailsMap[change.userId] || { firstName: "", lastName: "" };
            const decryptedStaffDetails = {
                firstName: decrypt(userDetail.firstName || ""),
                lastName: decrypt(userDetail.lastName || ""),
            };

            const decryptedChangedFields = Object.fromEntries(
                Object.entries(change.changedFields).map(([field, { old, new: newValue }]) => [
                    field,
                    {
                        old: typeof old === "boolean" ? old : decrypt(old),
                        new: typeof newValue === "boolean" ? newValue : decrypt(newValue),
                    }
                ])
            );

            return {
                ...change,
                changedFields: decryptedChangedFields,
                handledBy: decryptedStaffDetails,
            };
        });

        res.json({ changes: updatedChanges });
    } catch (err) {
        console.error("Error fetching archive and changes:", err);
        res.status(500).json({ error: "Error fetching archive" });
    }
});


router.get("/:id/assessment", async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user;
    try {
        if (currentUser.role !== "admin") {
            return res.status(404).json({ error: "Not authorized" });
        }

        const medical = await MedicalInfo.findOne({ userId }).lean();
        if (!medical) {
            return res.status(404).json({ error: "Medical record not found" });
        }

        const assessments = await Assessment.find({
            medicalInfoId: medical._id,
        }).lean();

        if (!assessments) {
            return res.status(404).json({ error: "Assessment record not found" });
        }

        // Find all archives for each assessment
        const archives = await Promise.all(
            assessments.map(async (assessment) => {
                const archive = await Archive.findOne({
                    documentId: assessment._id,
                }).lean();
                return archive;
            })
        );

        // Filter out null archives
        const validArchives = archives.filter((archive) => archive !== null);

        // Find changes for each valid archive
        const changes = await Promise.all(
            validArchives.map(async (archive) => {
                const changes = await ArchiveChange.find({
                    archiveId: archive._id,
                }).lean();
                return changes;
            })
        );

        // Flatten the array of changes
        const flattenedChanges = changes.flat();

        // Extract unique userIds from changes
        const userIds = [
            ...new Set(flattenedChanges.map((change) => change.userId)),
        ];

        const userDetails = await PersonalInfo.find({
            userId: { $in: userIds },
        })
            .select("userId firstName lastName")
            .lean();

        // Map user details by userId for easy lookup
        const userDetailsMap = userDetails.reduce((acc, user) => {
            acc[user.userId] = user;
            return acc;
        }, {});

        // Update changes with corresponding user details
        const updatedChanges = flattenedChanges.map((change) => {
            const userDetail = userDetailsMap[change.userId] || {
                firstName: "",
                lastName: "",
            };

            const decryptedStaffDetails = {
                firstName: userDetail.firstName ? decrypt(userDetail.firstName) : "",
                lastName: userDetail.lastName ? decrypt(userDetail.lastName) : "",
            };

            // Decrypt the changed fields
            const decryptedChangedFields = Object.fromEntries(
                Object.entries(change.changedFields).map(
                    ([field, { old, new: newValue }]) => [
                        field,
                        {
                            old: typeof old === "boolean" ? old : decrypt(old),
                            new: typeof newValue === "boolean" ? newValue : decrypt(newValue),
                        },
                    ]
                )
            );

            console.log("decryptedChangedFields", decryptedChangedFields);

            return {
                ...change,
                changedFields: decryptedChangedFields,
                handledBy: decryptedStaffDetails,
            };
        });

        res.json({ changes: updatedChanges });
    } catch (err) {
        console.error("Error searching archive and changes:", err);
        res.status(500).json({ error: "Error fetching archive" });
    }
});

router.get("/:id/immunization", async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user;
    try {
        if (currentUser.role !== "admin") {
            return res.status(404).json({ error: "Not authorized" });
        }

        const medical = await MedicalInfo.findOne({ userId }).lean();
        if (!medical) {
            return res.status(404).json({ error: "Medical record not found" });
        }

        const immunization = await Immunization.findOne({
            medicalInfoId: medical._id,
        }).lean();
        if (!immunization) {
            return res.status(404).json({ error: "Immunization record not found" });
        }

        const archive = await Archive.findOne({
            documentId: immunization._id,
        }).lean();
        if (!archive) {
            return res.status(404).json({ error: "Archive not found" });
        }

        const changes = await ArchiveChange.find({ archiveId: archive._id }).lean();

        if (changes.length === 0) {
            return res.status(404).json({ error: "No changes found" });
        }

        const userIds = [...new Set(changes.map((change) => change.userId))];

        // Fetch all related user details
        const userDetails = await PersonalInfo.find({
            userId: { $in: userIds },
        })
            .select("userId firstName lastName")
            .lean();

        const userDetailsMap = userDetails.reduce((acc, user) => {
            acc[user.userId] = user;
            return acc;
        }, {});

        const updatedChanges = changes.map((change) => {
            const userDetail = userDetailsMap[change.userId] || {
                firstName: "",
                lastName: "",
            };

            const decryptedStaffDetails = {
                firstName: userDetail.firstName ? decrypt(userDetail.firstName) : "",
                lastName: userDetail.lastName ? decrypt(userDetail.lastName) : "",
            };

            // Decrypt the changed fields
            const decryptedChangedFields = Object.fromEntries(
                Object.entries(change.changedFields).map(
                    ([field, { old, new: newValue }]) => [
                        field,
                        {
                            old: typeof old === "boolean" ? old : decrypt(old),
                            new: typeof newValue === "boolean" ? newValue : decrypt(newValue),
                        },
                    ]
                )
            );

            return {
                ...change,
                changedFields: decryptedChangedFields,
                handledBy: decryptedStaffDetails,
            };
        });

        res.json({ changes: updatedChanges });
    } catch (err) {
        console.error("Error searching archive and changes:", err);
        res.status(500).json({ error: "Error fetching archive" });
    }
});

module.exports = router;