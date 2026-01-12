const express = require("express");
const Class = require("../models/classSchema");
const Attendance = require("../models/attendanceSchema");
const authMiddleware = require("../middleware/auth");
const { requireTeacher, requireStudent } = require("../middleware/role");
const { startAttendanceSchema } = require("../validators/attendance.schema");
const {
  getActiveSession,
  setActiveSession,
} = require("../session/session");

const router = express.Router();

router.post(
  "/attendance/start",
  authMiddleware,
  requireTeacher,
  async (req, res) => {
    const parsed = startAttendanceSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request schema",
      });
    }

    const { classId } = parsed.data;

    const foundClass = await Class.findById(classId);
    if (!foundClass) {
      return res.status(404).json({
        success: false,
        error: "Class not found",
      });
    }

    if (foundClass.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden, not class teacher",
      });
    }

    const session = {
      classId,
      startedAt: new Date().toISOString(),
      attendance: {},
    };

    setActiveSession(session);

    return res.status(200).json({
      success: true,
      data: {
        classId,
        startedAt: session.startedAt,
      },
    });
  }
);

router.get(
  "/class/:id/my-attendance",
  authMiddleware,
  requireStudent,
  async (req, res) => {
    const classId = req.params.id;
    const studentId = req.user.userId;

    const foundClass = await Class.findById(classId);
    if (!foundClass) {
      return res.status(404).json({
        success: false,
        error: "Class not found",
      });
    }

    const isEnrolled = foundClass.studentIds.some(
      (id) => id.toString() === studentId
    );

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    const record = await Attendance.findOne({
      classId,
      studentId,
    });

    return res.status(200).json({
      success: true,
      data: {
        classId,
        status: record ? record.status : null,
      },
    });
  }
);

module.exports = router;
