const express = require("express");
const Class = require("../models/classSchema");
const User = require("../models/userSchema");
const authMiddleware = require("../middleware/auth");
const { requireTeacher } = require("../middleware/role");
const {
  createClassSchema,
  addStudentSchema,
} = require("../validators/class.schema");

const router = express.Router();

router.post("/", authMiddleware, requireTeacher, async (req, res) => {
  const parsed = createClassSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request schema",
    });
  }

  const { className } = parsed.data;

  const newClass = await Class.create({
    className,
    teacherId: req.user.userId,
    studentIds: [],
  });

  return res.status(201).json({
    success: true,
    data: newClass,
  });
});

router.post(
  "/:id/add-student",
  authMiddleware,
  requireTeacher,
  async (req, res) => {
    const parsed = addStudentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request schema",
      });
    }

    const { studentId } = parsed.data;
    const classId = req.params.id;

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

    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        error: "Student not found",
      });
    }

    if (foundClass.studentIds.includes(studentId)) {
      return res.status(200).json({
        success: true,
        data: foundClass,
      });
    }

    foundClass.studentIds.push(studentId);
    await foundClass.save();

    return res.status(200).json({
      success: true,
      data: foundClass,
    });
  }
);

router.get("/:id", authMiddleware, async (req, res) => {
  const classId = req.params.id;

  const foundClass = await Class.findById(classId).populate(
    "studentIds",
    "_id name email"
  );

  if (!foundClass) {
    return res.status(404).json({
      success: false,
      error: "Class not found",
    });
  }

  const isTeacher =
    req.user.role === "teacher" &&
    foundClass.teacherId.toString() === req.user.userId;

  const isStudent =
    req.user.role === "student" &&
    foundClass.studentIds.some(
      (s) => s._id.toString() === req.user.userId
    );

  if (!isTeacher && !isStudent) {
    return res.status(403).json({
      success: false,
      error: "Forbidden",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      _id: foundClass._id,
      className: foundClass.className,
      teacherId: foundClass.teacherId,
      students: foundClass.studentIds,
    },
  });
});



module.exports = router;