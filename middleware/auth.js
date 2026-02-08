const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ ok: false, message: "Access Denied: No token provided" });
  }

  try {
    const verify = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = verify;
  } catch (error) {
    return res.json({ ok: false, message: "Token is invalid or expired" });
  }

  next();
};

const adminAuth = (req, res, next) => {
  const { role } = req.user;
  if (role === "admin") return next();
  return res.json({ ok: false, message: "Only Admin can access this page" });
};

module.exports = { auth, adminAuth };
