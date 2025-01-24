// admin.js
const bcrypt = require('bcrypt');

// Store admin details securely
const admin = {
    name: 'Rakesh Dey',
    addhar: '329448713056',
    password: '$2b$10$B/pyMD3OxlUD.6M7Gc3KPeTMD.POgO051jEM2TgK8Nv/eQQQ1XYri', // hashed password for "Rakesh@2004"
    email: 'admin_rd@gmail.com',
    mobile: '7063616775',
    username: '@RD',
    address: 'India',
};

// Function to verify admin login
async function verifyAdmin(addhar, password) {
    if (addhar === admin.addhar) {
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        return isPasswordValid;
    }
    return false;
}

module.exports = { admin, verifyAdmin };
