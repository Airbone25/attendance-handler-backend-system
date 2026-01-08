const { z } = require("zod");

const createClassSchema = z.object({
  className: z.string().min(1),
});

const addStudentSchema = z.object({
  studentId: z.string(),
});

module.exports = {
  createClassSchema,
  addStudentSchema,
};
