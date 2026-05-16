const path = require('path');
const multer = require('multer');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safeName = file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
        cb(null, safeName);
    }
});

module.exports = multer({ storage });
