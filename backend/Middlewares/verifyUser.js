const jwt = require("jsonwebtoken");
const { verifyToken } = require('../auth/jwt');

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Auth token not found" });
  try {
    const decoded = verifyToken(token);
    req.user = decoded.id; 
    console.log(" Decoded ID:", req.user);
    next();
  } catch (err) {
    console.log(" Invalid token");
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = {verifyUser};