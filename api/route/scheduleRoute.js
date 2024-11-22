const router = require("express").Router();
const Event = require("../model/event/event");
const RequestForm = require("../model/requestModel");

// Default route = /schedule


router.get("/", async (req, res) => {
    const currentUser = req.user;
    console.log(currentUser);
    try {
        const currentDate = new Date();

        // Fetch events sorted by timestamp
        const events = await Event.find({
            'when.endTime': { $gte: currentDate } // Only fetch future events
        }).sort({ timestamp: -1 }).lean();

        // Normalize event start and end times
        const formattedEvents = events.map(event => ({
            ...event,
            start: event.when.startTime,
            end: event.when.endTime,
            type: "event"
        }));

        // Fetch request forms for the current user, sorted by timestamp
        const requestForms = await RequestForm.find({
            $or: [{ userId: currentUser.sub }, { handledBy: currentUser.sub }],
            appointmentDate: { $gte: currentDate } // Only fetch future request forms
        }).sort({ timestamp: -1 }).lean();

        console.log("Fetched Request Forms:", requestForms);

        // Format request forms to align with the calendar event structure
        const formattedRequests = requestForms
            .filter(form => form.status === "approved") // Filter for approved request forms
            .map(form => {
                let title = form.formName;
                let start = form.appointmentDate || form.leave?.startDate || form.dateOfAbsence;
                let end = form.leave?.endDate || form.appointmentDate || form.dateOfAbsence;

                // Ensure that start and end are valid date strings
                return start && end ? {
                    title,
                    start: new Date(start).toISOString(), // Format to ISO string
                    end: new Date(end).toISOString(), // Format to ISO string
                    type: "requestForm", // to differentiate request forms from events
                    formId: form._id,
                } : null;
            }).filter(event => event !== null); // Remove any null events

        // Combine events and formatted request forms
        const allScheduleItems = [...formattedEvents, ...formattedRequests];

        res.status(200).json({ scheduleItems: allScheduleItems });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ error: "No schedule items found" });
    }
});



module.exports = router;