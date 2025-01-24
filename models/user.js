const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/voting_app') // Fixed naming convention in the database name
    .then(() => {
        console.log('Database connected successfully');
    })
    .catch((err) => {
        console.error('Database connection error:', err);
    });

// Connect to MongoDB and drop the index
// mongoose.connection.collection('users').dropIndex('addharCardNumber_1', (err, result) => {
//     if (err) {
//         console.error('Error dropping index:', err);
//     } else {
//         console.log('Index dropped:', result);
//     }
// });

const userSchema = mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String },
    mobile: { type: Number },
    address: { type: String, required: true },
    addhar: { type: Number, required: true, unique: true }, // Ensure unique constraint
    password: { type: String, required: true },
    role: { type: String, enum: ['voter', 'admin'], default: 'voter' },
});


const User = mongoose.model('User', userSchema);
module.exports = User;