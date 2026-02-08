const multer = require("multer");

const uploads = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 20 },
});

module.exports = { uploads };
