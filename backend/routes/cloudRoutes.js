const express = require('express');
const multer = require('multer');
const {verifyUser} = require("../Middlewares/verifyUser");
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const Record = require('./models/Record');

cloudinary.config({
  cloud_name: 'YOUR_CLOUD_NAME',
  api_key: 'YOUR_API_KEY',
  api_secret: 'YOUR_API_SECRET',
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'screen-recordings',
    resource_type: 'video',
    format: 'webm',
  },
});
const upload = multer({ storage });

const router = express.Router();

router.post('/upload',verifyUser, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });
    const userId= req.user;
    // Assume user id is in req.user._id from auth middleware
    const record = new Record({
      name: file.originalname,
      duration: "unknown",  
      link: file.path,
      size: file.size.toString(),
      user: userId,
    });

    await record.save();
    res.json({ message: "Uploaded successfully", link: record.link, recordId: userId });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Uploading failed" });
  }
});

module.exports = router;
