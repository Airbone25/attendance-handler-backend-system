require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')

const app = express()

//Database setup
mongoose.connect(process.env.DB_URI)
const db = mongoose.connection
db.on('error',e=>console.error(e))
db.once('open',()=>console.log('database connected'))

app.use(express.json())

const authRoutes = require('./routes/auth')
app.use('/auth',authRoutes)

const classRoutes = require('./routes/class')
app.use('/class',classRoutes)

const User = require("./models/userSchema");
const authMiddleware = require("./middleware/auth");
const { requireTeacher } = require("./middleware/role");
app.get(
  "/students",
  authMiddleware,
  requireTeacher,
  async (req, res) => {
    const students = await User.find({ role: "student" }).select(
      "_id name email"
    );

    return res.status(200).json({
      success: true,
      data: students,
    });
  }
);

const attendanceRoutes = require("./routes/attendance");
app.use("/", attendanceRoutes);


app.listen(3000,()=>{
    console.log('Server is running')
})