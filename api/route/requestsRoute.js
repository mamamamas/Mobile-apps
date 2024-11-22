const router = require("express").Router();

const RequestForm = require("../model/requestModel");
const PersonalInfo = require("../model/personalInfoModel");
const Notification = require("../model/notification/notification");
const User = require("../model/userModel");
const { cloudinary } = require("../middleware/config");
const upload = require("../middleware/multer");
const { encrypt, decrypt } = require("../middleware/encryption");

// route = request-form

router.get("/", async (req, res) => {
    const currentUser = req.user;
    try {
        const appointments = await RequestForm.find({ userId: currentUser.sub })
            .sort({ timestamp: -1 })
            .lean();

        const appointmentsWithUserDetails = await Promise.all(
            appointments.map(async (appointment) => {
                if (!appointment.handledBy) {
                    console.log("Missing handledBy for appointment:", appointment);
                    return { ...appointment, handledByDetails: { firstName: "Not Assigned", lastName: "" } };
                }

                const staffDetails = await PersonalInfo.findOne({
                    userId: appointment.handledBy,
                })
                    .select("firstName lastName userId")
                    .lean();

                console.log("Staff Details for User ID", appointment.handledBy, ":", staffDetails);

                const decryptedStaffDetails = staffDetails
                    ? {
                        firstName:
                            staffDetails.firstName === "N/A"
                                ? staffDetails.firstName
                                : decrypt(staffDetails.firstName),
                        lastName:
                            staffDetails.lastName === "N/A"
                                ? staffDetails.lastName
                                : decrypt(staffDetails.lastName),
                    }
                    : { firstName: "", lastName: "" };

                return {
                    ...appointment,
                    handledByDetails: decryptedStaffDetails,
                };
            })
        );

        res.status(200).json(appointmentsWithUserDetails);
    } catch (err) {
        console.log(err);
        return res.status(400).json({ error: "No Appointment found" });
    }
});


router.get("/teleHealth", async (req, res) => {
    const currentUser = req.user;

    if (currentUser.role === "staff") {
        try {
            const appointments = await RequestForm.find({
                userId: currentUser.sub,
                formName: "Telehealth",
            })
                .sort({ timestamp: -1 })
                .lean();

            console.log("User Role: ", currentUser.role);
            console.log("User ID: ", currentUser.sub);
            console.log("Appointments fetched: ", appointments);

            const appointmentsWithUserDetails = await Promise.all(
                appointments.map(async (appointment) => {
                    const userDetails = await PersonalInfo.findOne({
                        userId: appointment.handledBy,
                    })
                        .select("firstName lastName")
                        .lean();

                    const decryptedStaffDetails = userDetails
                        ? {
                            firstName:
                                userDetails.firstName === "N/A"
                                    ? userDetails.firstName
                                    : decrypt(userDetails.firstName),
                            lastName:
                                userDetails.lastName === "N/A"
                                    ? userDetails.lastName
                                    : decrypt(userDetails.lastName),
                        }
                        : { firstName: "", lastName: "" };

                    return {
                        ...appointment, // Spread appointment details
                        handledByDetails: decryptedStaffDetails, // Attach userDetails
                    };
                })
            );

            res.status(200).json(appointmentsWithUserDetails);
        } catch (err) {
            console.log("error3121: ", err);
            return res.status(400).json({ error: "No Appointment found" });
        }
    } else {
        try {
            const requests = await RequestForm.find({
                handledBy: currentUser.sub,
                formName: "Telehealth",
            })
                .sort({ timestamp: -1 })
                .lean();

            const requestsWithUserDetails = await Promise.all(
                requests.map(async (request) => {
                    const staffDetails = await PersonalInfo.findOne({
                        userId: request.handledBy,
                    })
                        .select("firstName lastName")
                        .lean();

                    const userDetails = await PersonalInfo.findOne({
                        userId: request.userId,
                    })
                        .select("firstName lastName")
                        .lean();

                    const decryptedStaffDetails = staffDetails
                        ? {
                            firstName:
                                staffDetails.firstName === "N/A"
                                    ? staffDetails.firstName
                                    : decrypt(staffDetails.firstName),
                            lastName:
                                staffDetails.lastName === "N/A"
                                    ? staffDetails.lastName
                                    : decrypt(staffDetails.lastName),
                        }
                        : { firstName: "", lastName: "" };

                    const decryptedUserDetails = userDetails
                        ? {
                            firstName:
                                userDetails.firstName === "N/A"
                                    ? userDetails.firstName
                                    : decrypt(userDetails.firstName),
                            lastName:
                                userDetails.lastName === "N/A"
                                    ? userDetails.lastName
                                    : decrypt(userDetails.lastName),
                        }
                        : { firstName: "", lastName: "" };

                    return {
                        ...request,
                        handledByDetails: decryptedStaffDetails,
                        sentBy: decryptedUserDetails,
                    };
                })
            );

            res.status(200).json(requestsWithUserDetails);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch requests" });
        }
    }
});

// Admin route to get all requests
router.get("/admin", async (req, res) => {
    const currentUser = req.user;

    if (currentUser.role !== "admin" && currentUser.role !== "staff") {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        const requests = await RequestForm.find({}).sort({ timestamp: -1 }).lean();

        const requestsWithUserDetails = await Promise.all(
            requests.map(async (request) => {
                const staffDetails = await PersonalInfo.findOne({
                    userId: request.handledBy,
                })
                    .select("firstName lastName userId")
                    .lean();

                const userDetails = await PersonalInfo.findOne({
                    userId: request.userId,
                })
                    .select("firstName lastName userId")
                    .lean();

                const decryptedStaffDetails = staffDetails
                    ? {
                        firstName:
                            staffDetails.firstName === "N/A"
                                ? staffDetails.firstName
                                : decrypt(staffDetails.firstName),
                        lastName:
                            staffDetails.lastName === "N/A"
                                ? staffDetails.lastName
                                : decrypt(staffDetails.lastName),
                    }
                    : { firstName: "", lastName: "" };

                const decryptedUserDetails = userDetails
                    ? {
                        firstName:
                            userDetails.firstName === "N/A"
                                ? userDetails.firstName
                                : decrypt(userDetails.firstName),
                        lastName:
                            userDetails.lastName === "N/A"
                                ? userDetails.lastName
                                : decrypt(userDetails.lastName),
                    }
                    : { firstName: "", lastName: "" };

                console.log("decrypt user: ", decryptedUserDetails);
                // console.log("decrypt staff: ", decryptedStaffDetails);

                return {
                    ...request,
                    handledByDetails: decryptedStaffDetails,
                    sentBy: decryptedUserDetails,
                };
            })
        );

        res.status(200).json(requestsWithUserDetails);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

router.get("/:id", async (req, res) => {
    const appointmentId = req.params.id;

    try {
        const appointment = await RequestForm.findOne({
            _id: appointmentId,
        }).lean();

        if (!appointment) {
            return res.status(404).json({ error: "appointment record not found" });
        }

        const userDetails = await PersonalInfo.findOne({
            userId: appointment.userId,
        }).select("firstName lastName");
        console.log("userDetails: ", userDetails);

        const staffDetails = await PersonalInfo.findOne({
            userId: appointment.handledBy,
        }).select("firstName lastName");
        console.log("staffDetails: ", staffDetails);

        const decryptedStaffDetails = staffDetails
            ? {
                firstName:
                    staffDetails.firstName === "N/A"
                        ? staffDetails.firstName
                        : decrypt(staffDetails.firstName),
                lastName:
                    staffDetails.lastName === "N/A"
                        ? staffDetails.lastName
                        : decrypt(staffDetails.lastName),
            }
            : { firstName: "", lastName: "" };

        const decryptedUserDetails = userDetails
            ? {
                firstName:
                    userDetails.firstName === "N/A"
                        ? userDetails.firstName
                        : decrypt(userDetails.firstName),
                lastName:
                    userDetails.lastName === "N/A"
                        ? userDetails.lastName
                        : decrypt(userDetails.lastName),
            }
            : { firstName: "", lastName: "" };

        res.status(200).json({
            appointment,
            userDetails: decryptedUserDetails,
            staffDetails: decryptedStaffDetails,
        });
    } catch (err) {
        console.log("errorasd", err);
        return res.status(400).json({ error: "No Appointment found" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const requestFormId = req.params.id;
        const currentUser = req.user;

        const requestFormToDelete = await RequestForm.findById(requestFormId);
        if (!requestFormToDelete) {
            return res.status(404).json({ message: "Request form not found" });
        }
        console.log("requestFormToDelete", requestFormToDelete);
        await RequestForm.findByIdAndDelete(requestFormId);

        switch (requestFormToDelete.formName) {
            case "Appointment":
                await Notification.deleteOne({
                    documentId: requestFormId,
                    documentType: "Appointment",
                });
                break;
            case "Medical Leave Form":
                await Notification.deleteOne({
                    documentId: requestFormId,
                    documentType: "Medical Leave Form",
                });
                break;
            case "Medical Record Request":
                await Notification.deleteOne({
                    documentId: requestFormId,
                    documentType: "Medical Record Request",
                });
                break;
            case "Special Leave Form":
                await Notification.deleteOne({
                    documentId: requestFormId,
                    documentType: "Special Leave Form",
                });
                break;
            case "Referral Form Telehalth":
                await Notification.deleteOne({
                    documentId: requestFormId,
                    documentType: "Referral Form Telehalth",
                });
                break;
            case "Telehealth":
                await Notification.deleteOne({
                    documentId: requestFormId,
                    documentType: "Telehealth",
                });
                break;
            case "Medical Leave Form":
                await Notification.deleteOne({
                    documentId: requestFormId,
                    documentType: "Medical Leave Form",
                });
                break;
            case "Parental Consent":
                await Notification.deleteOne({
                    documentId: requestFormId,
                    documentType: "Parental Consent",
                });
            case "Student Absence Form":
                await Notification.deleteOne({
                    documentId: requestFormId,
                    documentType: "Student Absence Form",
                });
                break;
            default:
                console.error("Unknown document type");
        }

        res.json({
            message: "Request and related notifications cancelled successfully",
        });
    } catch (err) {
        console.log("error:", err);
        res.status(404).json({ error: "error canceling request" });
    }
});

// Appointment Request Form
router.post("/appointment", upload.none(), async (req, res) => {
    const currentUser = req.user;
    const { appointmentDate, reason } = req.body;
    console.log(currentUser)
    try {
        const currentDate = new Date();
        const selectedDate = new Date(appointmentDate);
        if (!reason) {
            return res
                .status(400)
                .json("reason is missing");
        }
        // Check if the selected date is in the past
        if (selectedDate < currentDate) {
            return res
                .status(400)
                .json("Appointment must be 1 day ahead and not in the past");
        }

        const newAppointment = await RequestForm.create({
            userId: currentUser.sub,
            formName: "Appointment",
            appointmentDate,
            reason,
        });

        const userDetails = await PersonalInfo.findOne({
            userId: currentUser.sub,
        }).select("firstName lastName");

        //fetched all userId with role admin/staff
        const recipientUsers = await User.find({
            role: { $in: ["admin", "staff"] },
        }).select("_id");

        // Extract  IDs
        const recipientIds = recipientUsers.map((user) => user._id);

        const decryptedUserDetails = userDetails
            ? {
                firstName:
                    userDetails.firstName === "N/A"
                        ? userDetails.firstName
                        : decrypt(userDetails.firstName),
                lastName:
                    userDetails.lastName === "N/A"
                        ? userDetails.lastName
                        : decrypt(userDetails.lastName),
            }
            : { firstName: "", lastName: "" };

        // Encrypt the title with the decrypted names
        const notificationTitle = `${decryptedUserDetails.firstName} ${decryptedUserDetails.lastName} made an appointment request!`;
        const encryptedTitle = encrypt(notificationTitle);

        await Notification.create({
            userId: currentUser.sub,
            title: encryptedTitle,
            documentId: newAppointment._id,
            documentType: "Appointment",
            recipientIds: recipientIds,
        });

        return res.status(200).json(newAppointment);
    } catch (err) {
        console.log("error: ", err);
    }
});


router.patch("/:id", async (req, res) => {
    const currentUser = req.user;
    const appointmentId = req.params.id;
    const { status, feedback } = req.body;

    if (currentUser.role !== "admin" && currentUser.role !== "staff") {
        return res.status(404).json({ error: "Not authorized" });
    }

    const updateData = { status, handledBy: currentUser.sub };

    if (!feedback) {
        return res
            .status(400)
            .json({ error: "Feedback is required when declining" });
    }
    updateData.feedback = feedback; // Store feedback if declining

    if (currentUser.role === "staff") {
        try {
            // Fetch the appointment to get the userId
            const appointment = await RequestForm.findById(appointmentId).select(
                "userId"
            );

            if (!appointment) {
                return res.status(404).json({ error: "No Appointment found" });
            }

            const requester = await User.findById(appointment.userId).select("role");

            if (!requester) {
                return res.status(404).json({ error: "Requester not found" });
            }

            if (requester.role !== "student" && requester.role !== "admin") {
                return res.status(403).json({
                    error: "User must be admin to make changes in staff request.",
                });
            }
        } catch (err) {
            console.log("Error fetching appointment or user:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    try {
        const appointment = await RequestForm.findOneAndUpdate(
            { _id: appointmentId },
            updateData,
            { new: true } // Return the updated document
        ).lean();

        if (!appointment) {
            return res.status(404).json({ error: "No Appointment found" });
        }

        console.log("appointmentzxc", appointment);

        const staffDetails = await PersonalInfo.findOne({
            userId: appointment.handledBy,
        }).select("firstName lastName");

        const decryptedStaffDetails = staffDetails
            ? {
                firstName:
                    staffDetails.firstName === "N/A"
                        ? staffDetails.firstName
                        : decrypt(staffDetails.firstName),
                lastName:
                    staffDetails.lastName === "N/A"
                        ? staffDetails.lastName
                        : decrypt(staffDetails.lastName),
            }
            : { firstName: "", lastName: "" };

        // Encrypt the title with the decrypted names
        const notificationTitle = `${decryptedStaffDetails.firstName} ${decryptedStaffDetails.lastName} replied to your request!`;
        const encryptedTitle = encrypt(notificationTitle);

        await Notification.create({
            userId: currentUser._id,
            title: encryptedTitle,
            documentId: appointment._id,
            documentType: appointment.formName,
            recipientIds: appointment.userId,
        });

        res.status(200).json({ appointment, decryptedStaffDetails });
    } catch (err) {
        console.log("err:", err);
        return res.status(400).json({ error: "No Appointment found" });
    }
});

// Medical Leave Form
router.post("/medical-leave", upload.single("image"), async (req, res) => {
    const currentUser = req.user;
    const { leave, reason } = req.body;

    //validate time
    const currentDate = new Date();
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);

    if (startDate < currentDate) {
        return res
            .status(400)
            .json({ message: "Start date cannot be in the past." });
    }

    if (startDate >= endDate) {
        return res
            .status(400)
            .json({ message: "Start time must be before end time." });
    }

    try {
        let imgUrl = "";
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "requestforms/medical",
            });
            imgUrl = result.secure_url;
        }

        const newAppointment = await RequestForm.create({
            userId: currentUser.sub,
            formName: "Medical Leave Form",
            reason,
            leave: { startDate, endDate },
            medicalCert: imgUrl,
        });

        const userDetails = await PersonalInfo.findOne({
            userId: currentUser.sub,
        }).select("firstName lastName");

        //fetched all userId with role admin/staff
        const recipientUsers = await User.find({
            role: { $in: ["admin", "staff"] },
        }).select("_id");

        // Extract  IDs
        const recipientIds = recipientUsers.map((user) => user._id);

        const decryptedUserDetails = userDetails
            ? {
                firstName:
                    userDetails.firstName === "N/A"
                        ? userDetails.firstName
                        : decrypt(userDetails.firstName),
                lastName:
                    userDetails.lastName === "N/A"
                        ? userDetails.lastName
                        : decrypt(userDetails.lastName),
            }
            : { firstName: "", lastName: "" };

        // Encrypt the title with the decrypted names
        const notificationTitle = `${decryptedUserDetails.firstName} ${decryptedUserDetails.lastName} made a medical leave request!`;
        const encryptedTitle = encrypt(notificationTitle);

        await Notification.create({
            userId: currentUser._id,
            title: encryptedTitle,
            documentId: newAppointment._id,
            documentType: "Medical Leave Form",
            recipientIds: recipientIds,
        });

        return res.status(200).json(newAppointment);
    } catch (err) {
        console.log("error: ", err);
    }
});

router.post("/medical-recordR", upload.single("image"), async (req, res) => {
    const currentUser = req.user;
    const { releaseMedRecordto, reason } = req.body;

    try {
        let imgUrl = "";
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "requestforms/medical",
            });
            imgUrl = result.secure_url;
        }

        const newAppointment = await RequestForm.create({
            userId: currentUser.sub,
            formName: "Medical Record Request",
            releaseMedRecordto,
            reason,
            supportingDoc: imgUrl || null,
        });

        const userDetails = await PersonalInfo.findOne({
            userId: currentUser.sub,
        }).select("firstName lastName");

        //fetched all userId with role admin/staff
        const recipientUsers = await User.find({
            role: { $in: ["admin", "staff"] },
        }).select("_id");

        // Extract  IDs
        const recipientIds = recipientUsers.map((user) => user._id);

        const decryptedUserDetails = userDetails
            ? {
                firstName:
                    userDetails.firstName === "N/A"
                        ? userDetails.firstName
                        : decrypt(userDetails.firstName),
                lastName:
                    userDetails.lastName === "N/A"
                        ? userDetails.lastName
                        : decrypt(userDetails.lastName),
            }
            : { firstName: "", lastName: "" };

        // Encrypt the title with the decrypted names
        const notificationTitle = `${decryptedUserDetails.firstName} ${decryptedUserDetails.lastName} made a medical record release request!`;
        const encryptedTitle = encrypt(notificationTitle);

        await Notification.create({
            userId: currentUser._id,
            title: encryptedTitle,
            documentId: newAppointment._id,
            documentType: "Medical Record Request",
            recipientIds: recipientIds,
        });

        return res.status(200).json(newAppointment);
    } catch (err) {
        console.log("error: ", err);
    }
});

// Parent Consent Form
router.post("/parental-consent", upload.single("image"), async (req, res) => {
    const currentUser = req.user;
    const { appointmentDate, guardianConsent } = req.body;

    const currentDate = new Date();
    const selectedDate = new Date(appointmentDate);

    // Check if the selected date is in the past
    if (selectedDate < currentDate) {
        return res
            .status(400)
            .json("Appointment must be 1 day ahead and not in the past");
    }

    if (currentUser.role !== "student") {
        return res.status(404).json({ error: "Not authorize" });
    }

    try {
        let imgUrl = "";
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "requestforms/parentalConsent",
            });
            imgUrl = result.secure_url;
        }

        const userDetails = await PersonalInfo.findOne({
            userId: currentUser._id,
        }).select("firstName lastName guardian");

        const ParentConsentRequest = await RequestForm.create({
            userId: currentUser._id,
            formName: "Parental Consent",
            guardianName: userDetails.guardian,
            guardianConsent,
            appointmentDate,
            eSignature: imgUrl,
        });

        //fetched all userId with role admin/staff
        const recipientUsers = await User.find({
            role: { $in: ["admin", "staff"] },
        }).select("_id");

        // Extract  IDs
        const recipientIds = recipientUsers.map((user) => user._id);

        const decryptedUserDetails = userDetails
            ? {
                firstName:
                    userDetails.firstName === "N/A"
                        ? userDetails.firstName
                        : decrypt(userDetails.firstName),
                lastName:
                    userDetails.lastName === "N/A"
                        ? userDetails.lastName
                        : decrypt(userDetails.lastName),
            }
            : { firstName: "", lastName: "" };

        // Encrypt the title with the decrypted names
        const notificationTitle = `${decryptedUserDetails.firstName} ${decryptedUserDetails.lastName} made a parental consent request!`;
        const encryptedTitle = encrypt(notificationTitle);

        await Notification.create({
            userId: currentUser._id,
            title: encryptedTitle,
            documentId: ParentConsentRequest._id,
            documentType: "Parental Consent",
            recipientIds: recipientIds,
        });

        return res.status(200).json(ParentConsentRequest);
    } catch (err) {
        console.log("error123: ", err);
    }
});

// Student Absence
router.post("/student-absence", upload.single("image"), async (req, res) => {
    const currentUser = req.user;
    const { dateOfAbsence, reason } = req.body;

    const currentDate = new Date();
    const selectedDate = new Date(dateOfAbsence);

    // Check if the selected date is in the past
    if (selectedDate < currentDate) {
        return res
            .status(400)
            .json("Appointment must be 1 day ahead and not in the past");
    }

    if (currentUser.role !== "student") {
        return res.status(404).json({ error: "Not authorize" });
    }

    try {
        let imgUrl = "";
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "requestforms/studentAbsence",
            });
            imgUrl = result.secure_url;
        }

        const newStudentAbsence = await RequestForm.create({
            userId: currentUser._id,
            formName: "Student Absence Form",
            dateOfAbsence,
            reason,
            supportingDoc: imgUrl || null,
        });

        const userDetails = await PersonalInfo.findOne({
            userId: currentUser._id,
        }).select("firstName lastName");

        //fetched all userId with role admin/staff
        const recipientUsers = await User.find({
            role: { $in: ["admin", "staff"] },
        }).select("_id");

        // Extract  IDs
        const recipientIds = recipientUsers.map((user) => user._id);

        const decryptedUserDetails = userDetails
            ? {
                firstName:
                    userDetails.firstName === "N/A"
                        ? userDetails.firstName
                        : decrypt(userDetails.firstName),
                lastName:
                    userDetails.lastName === "N/A"
                        ? userDetails.lastName
                        : decrypt(userDetails.lastName),
            }
            : { firstName: "", lastName: "" };

        // Encrypt the title with the decrypted names
        const notificationTitle = `${decryptedUserDetails.firstName} ${decryptedUserDetails.lastName} made a student absence request!`;
        const encryptedTitle = encrypt(notificationTitle);

        await Notification.create({
            userId: currentUser._id,
            title: encryptedTitle,
            documentId: newStudentAbsence._id,
            documentType: "Student Absence Form",
            recipientIds: recipientIds,
        });

        return res.status(200).json(newStudentAbsence);
    } catch (err) {
        console.log("error: ", err);
    }
});

// Special Leave Form
router.post("/special-leave", upload.none(), async (req, res) => {
    const currentUser = req.user;
    const { leave, reason, additionalReason } = req.body;


    // Validate that leave is provided and contains startDate and endDate
    if (!leave || !leave.startDate || !leave.endDate) {
        return res.status(400).json({
            message: "Please provide valid leave dates (startDate and endDate).",
        });
    }

    // Validate time
    const currentDate = new Date();
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);

    if (startDate < currentDate) {
        return res
            .status(400)
            .json({ message: "Start date cannot be in the past." });
    }

    if (startDate >= endDate) {
        return res
            .status(400)
            .json({ message: "Start time must be before end time." });
    }

    try {
        const newAppointment = await RequestForm.create({
            userId: currentUser.sub,
            formName: "Special Leave Form",
            reason,
            additionalReason,
            leave: { startDate, endDate },
        });

        const userDetails = await PersonalInfo.findOne({
            userId: currentUser.sub,
        }).select("firstName lastName");

        // Fetch all userId with role admin/staff
        const recipientUsers = await User.find({
            role: { $in: ["admin", "staff"] },
        }).select("_id");

        // Extract IDs
        const recipientIds = recipientUsers.map((user) => user._id);

        const decryptedUserDetails = userDetails
            ? {
                firstName:
                    userDetails.firstName === "N/A"
                        ? userDetails.firstName
                        : decrypt(userDetails.firstName),
                lastName:
                    userDetails.lastName === "N/A"
                        ? userDetails.lastName
                        : decrypt(userDetails.lastName),
            }
            : { firstName: "", lastName: "" };

        // Encrypt the title with the decrypted names
        const notificationTitle = `${decryptedUserDetails.firstName} ${decryptedUserDetails.lastName} made a special leave request!`;
        const encryptedTitle = encrypt(notificationTitle);

        await Notification.create({
            userId: currentUser.sub,
            title: encryptedTitle,
            documentId: newAppointment._id,
            documentType: "Special Leave Form",
            recipientIds: recipientIds,
        });

        return res.status(200).json(newAppointment);
    } catch (err) {
        console.log("error: ", err);
        return res.status(500).json({ message: "An error occurred." });
    }
});


router.post("/telehealth", upload.none(), async (req, res) => {
    const currentUser = req.user;
    const { appointmentDate, reason, telehealthType } = req.body;

    console.log('reason:', reason);  // Check if 'reason' is now present

    if (!reason) {
        return res.status(400).json({ error: 'Reason is required' });
    }


    try {
        const currentDate = new Date();
        const selectedDate = new Date(appointmentDate);

        // Check if the selected date is in the past
        if (selectedDate < currentDate) {
            return res
                .status(400)
                .json("Appointment must be 1 day ahead and not in the past");
        }

        const newAppointment = await RequestForm.create({
            userId: currentUser.sub,
            formName: "Telehealth",
            appointmentDate,
            telehealthType,
            reason,
        });

        const userDetails = await PersonalInfo.findOne({
            userId: currentUser.sub,
        }).select("firstName lastName");

        //fetched all userId with role admin/staff
        const recipientUsers = await User.find({
            role: { $in: ["admin", "staff"] },
        }).select("_id");

        // Extract  IDs
        const recipientIds = recipientUsers.map((user) => user._id);

        const decryptedUserDetails = userDetails
            ? {
                firstName:
                    userDetails.firstName === "N/A"
                        ? userDetails.firstName
                        : decrypt(userDetails.firstName),
                lastName:
                    userDetails.lastName === "N/A"
                        ? userDetails.lastName
                        : decrypt(userDetails.lastName),
            }
            : { firstName: "", lastName: "" };

        // Encrypt the title with the decrypted names
        const notificationTitle = `${decryptedUserDetails.firstName} ${decryptedUserDetails.lastName} made a telehealth request!`;
        const encryptedTitle = encrypt(notificationTitle);

        await Notification.create({
            userId: currentUser.sub,
            title: encryptedTitle,
            documentId: newAppointment._id,
            documentType: "Telehealth",
            recipientIds: recipientIds,
        });

        return res.status(200).json(newAppointment);
    } catch (err) {
        console.log("error33: ", err);
    }
});

module.exports = router;