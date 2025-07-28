require('dotenv').config();
require("./config/passport");

const http = require("http");
const setupVideoCall = require("./videocall");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const authRoutes = require('./routes/authRoutes');
const userSpecificRoutes = require('./routes/userSpecificRoutes');
const { UsersModel } = require("./model/UsersModel");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const axios = require("axios");
const session = require("express-session");

const PORT = process.env.PORT || 3000;
const uri = process.env.MONGO_URL || 3000 || "mongodb://localhost:27017/mydb";

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Initialize Passport for session use
app.use(passport.initialize());
app.use(passport.session());

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use('/', authRoutes);
app.use('/', userSpecificRoutes);

// mongoose.connection.once('open', async () => {
//   try {
//     await mongoose.connection.db.collection('users').dropIndex('username_1');
//     console.log("✅ Dropped unique index on 'username'.");
//   } catch (err) {
//     if (err.codeName === 'IndexNotFound') {
//       console.log("ℹ️ No 'username_1' index found — already removed.");
//     } else {
//       console.error("❌ Error while dropping index:", err);
//     }
//   }
// });


async function startServer() {
  try {
    await mongoose.connect(uri);
    console.log("Database connected");

    const server = http.createServer(app);
    await setupVideoCall(server);

    server.listen(PORT, '0.0.0.0', () =>
      console.log(`🚀 Server ready → http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("Failed to connect to DB:", err);
  }
}

startServer();
