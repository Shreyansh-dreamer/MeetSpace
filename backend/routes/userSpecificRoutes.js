const express = require("express");
const {verifyToken} = require('../auth/jwt');
const {verifyUser} = require("../Middlewares/verifyUser");
const mongoose = require('mongoose');
const { UsersModel} = require("../model/UsersModel");
const router = express.Router();
const {MeetingsModel} = require("../model/MeetingsModel");
const {RecordsModel} = require("../model/RecordsModel");

router.get("/user", verifyUser, async (req, res) => {
  try {
    const user = await UsersModel.findById(req.user);
    return res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user", err);
    res.status(500).send("Server error finding user");
  }
});

router.post("/meetingSave",verifyUser,async (req,res)=>{
  const {name,day,time} = req.body;
  const userId= req.user;
  try{
    const newMeeting = new MeetingsModel({
      name,
      day,
      time,
      user: userId,
    })
    await newMeeting.save();
    const saved = await newMeeting.save();
    res.status(200).json(saved);
  } catch (err) {
    console.error("Error saving meeting:", err);
    res.status(500).json({ message: "Failed to save meetings" });
  }
})

router.get("/allMeetings", verifyUser, async (req, res) => {
  try {
    const meetings = await MeetingsModel.find({ user: req.user }).sort({ day: 1 });
    res.status(200).json(meetings);
  } catch (err) {
    console.error("Error fetching meetings", err);
    res.status(500).json({ message: "Failed to fetch meetings" });
  }
});

router.post("/logout",verifyUser, (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
        });
        res.status(200).json({ message: 'Logged out', status: 'logout' });
    } catch (err) {
        res.status(500).json({ message: "Logout failed", error: err.message });
    }
});

module.exports = router;