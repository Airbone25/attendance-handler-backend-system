const requireTeacher = (req, res, next) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({
      success: false,
      error: "Forbidden, teacher access required",
    });
  }
  next();
};

const requireStudent = (req, res, next) => {
  if (req.user.role !== "student") {
    return res.status(403).json({
      success: false,
      error: "Forbidden, student access required",
    });
  }
  next();
};

module.exports = {
  requireTeacher,
  requireStudent,
};
