const { z } = require("zod");

const startAttendanceSchema = z.object({
  classId: z.string(),
});

module.exports = {
  startAttendanceSchema,
};
