require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')

const app = express()

//Database setup
mongoose.connect(process.env.DB_URI)
const db = mongoose.connection
db.on('error',e=>console.error(e))
db.once('open',()=>console.log('database connected'))



app.listen(3000,()=>{
    console.log('Server is running')
})