const express = require('express');
const app = express();

const path = require('path');
const userModel = require('./models/user');
const Candidate = require('./models/candidate');
const { admin, verifyAdmin } = require('./models/admin');

const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');


app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')))
app.use(cookieParser());


app.get('/sign', (req, res) => {
    res.render('sign');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/voting_page', async (req, res) => {
    const token = req.cookies.token;
    let userLoggedIn = false;
    let username = '';
    let candidates = [];


    if (token) {
        try {
            const decoded = jwt.verify(token, 'shhhhhh');
            userLoggedIn = true; // User is logged in
            username = decoded.username;
            // console.log('Decoded token:', decoded);
            candidates = await Candidate.find();
        } catch (err) {
            console.error('Token verification failed:', err);
        }
    }
    res.render('voting_page', { userLoggedIn, username, candidates });
});


// app.post('/vote/:candidateId', async (req, res) => {
//     const token = req.cookies.token;

//     if (!token) {
//         return res.status(401).json({ message: 'Unauthorized: Please log in to vote.' });
//     }

//     try {
//         const decoded = jwt.verify(token, 'shhhhhh');
//         const userId = decoded.userId;

//         console.log(userId)
//         console.log('Decoded token:', decoded);

//         // Check if the user has already voted
//         const hasVoted = await Candidate.findOne({ 'votes.user': userId });
//         if (hasVoted) {
//             console.log('User has already voted.');
//             return res.status(403).json({ message: 'You have already voted.' });
//         }

//         // Increment vote count and add user to votes array
//         const candidate = await Candidate.findById(req.params.candidateId);
//         if (!candidate) {
//             console.log('Candidate not found.');
//             return res.status(404).json({ message: 'Candidate not found.' });
//         }

//         console.log('Candidate found:', candidate);

//         candidate.votes.push({ user: userId });
//         candidate.voteCount += 1;
//         await candidate.save();

//         console.log('Vote saved successfully.');

//         res.json({ message: 'Vote cast successfully.' });
//     } catch (err) {
//         console.error('Error while voting:', err);
//         res.status(500).json({ message: 'Internal server error.' });
//     }
// });



// index route


app.post('/vote/:candidateId', async (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Please log in to vote.' });
    }

    try {
        const decoded = jwt.verify(token, 'shhhhhh');
        const userId = decoded.userid; // Ensure the correct field is used here

        console.log(userId);
        console.log('Decoded token:', decoded);

        // Check if the user has already voted
        const hasVoted = await Candidate.findOne({ 'votes.user': userId });
        if (hasVoted) {
            console.log('User has already voted.');
            return res.status(403).json({ message: 'You have already voted.' });
        }

        // Find the candidate by ID
        const candidate = await Candidate.findById(req.params.candidateId);
        if (!candidate) {
            console.log('Candidate not found.');
            return res.status(404).json({ message: 'Candidate not found.' });
        }

        console.log('Candidate found:', candidate);

        // Add the user's vote
        candidate.votes.push({ user: userId });
        candidate.voteCount += 1;
        await candidate.save();

        console.log('Vote saved successfully.');

        res.json({ message: 'Vote cast successfully.' });
    } catch (err) {
        console.error('Error while voting:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
});




app.get('/', (req, res) => {
    // const token = req.cookies.token;
    // let userLoggedIn = false;
    // let username = '';

    // if (token) {
    //     try {
    //         const decoded = jwt.verify(token, 'shhhhhh');
    //         userLoggedIn = true; // User is logged in
    //         username = decoded.username;
    //         // console.log('Decoded token:', decoded);
    //     } catch (err) {
    //         console.error('Token verification failed:', err);
    //     }
    // }

    res.render('index'); // Pass userLoggedIn to the view
});


// Register route
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, username, age, address, addhar, mobile, role } = req.body;

        // Validate required fields
        if (!name || !username || !age || !address || !addhar || !password) {
            return res.status(400).send('All required fields must be provided.');
        }

        // Ensure addhar is not null or undefined
        if (!addhar || isNaN(addhar)) {
            return res.status(400).send('A valid Addhar Card Number must be provided.');
        }

        // Check if user already exists by Aadhar number
        const existingUser = await userModel.findOne({ addhar });
        if (existingUser) {
            return res.status(409).render('extra');
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user
        const user = await userModel.create({
            name,
            username,
            age,
            email,
            mobile,
            address,
            addhar,
            password: hashedPassword,
            role,
        });

        console.log('New user created:', user);

        // Generate JWT token
        const token = jwt.sign({ userid: user._id, addhar, username: user.username }, 'shhhhhhh');

        // Set cookie and redirect to login
        res.cookie('token', token);
        res.redirect('/login');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/login', async (req, res) => {
    try {
        const { addhar, password } = req.body;

        // Validate input
        if (!addhar || !password) {
            return res.status(400).send('Aadhar number and password are required');
        }

        // Check if admin is trying to login
        if (addhar === admin.addhar) {
            const isAdminValid = await verifyAdmin(addhar, password);
            if (isAdminValid) {
                // Generate a token for admin
                const token = jwt.sign({ role: 'admin', username: admin.username }, 'shhhhhh');
                res.cookie('token', token, { httpOnly: true });
                return res.redirect('/admin-dashboard'); // Redirect to admin dashboard
            } else {
                return res.redirect('/login'); // Redirect back to login if invalid
            }
        }

        // Check if user is trying to login
        const user = await userModel.findOne({ addhar });
        if (!user) {
            return res.status(400).send('Invalid Aadhar number or user does not exist');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send('Invalid password');
        }

        // Generate token for user
        const token = jwt.sign({ addhar, userid: user._id, username: user.username }, 'shhhhhh');
        res.cookie('token', token, { httpOnly: true });
        return res.redirect('/voting_page'); // Redirect to home for users
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/admin-dashboard/users', async (req, res) => {
    try {
        const users = await userModel.find();
        res.render('user', { users });
    } catch (error) {
        res.status(500).send('Error fetching user data: ' + error.message);
    }
});



// For convert the admin password to hash
// (async () => {
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash('Rakesh@2004', salt);
//     console.log('Hashed Password:', hashedPassword);
// })();




// Logout route
app.get('/logout', (req, res) => {
    res.clearCookie('token'); // Clear the token cookie
    res.redirect('/'); // Redirect to home
});


// Profile route
app.get('/profile', async (req, res) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.redirect('/login'); // Redirect to login if not logged in
        }

        // Verify and decode the token
        const decoded = jwt.verify(token, 'shhhhhh');
        const { addhar } = decoded;

        // Retrieve user data using addhar number
        const user = await userModel.findOne({ addhar });

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Pass user data to the profile page
        res.render('profile', { user });
    } catch (error) {
        console.error('Error in profile route:', error);
        res.status(500).send('Internal Server Error');
    }
});



// Admin Dashboard Code Start --->
// app.get('/admin-dashboard', (req, res) => {
//     const token = req.cookies.token;
//     try {
//         const decoded = jwt.verify(token, 'shhhhhh');
//         if (decoded.role === 'admin') {
//             return res.render('admin-dashboard', { admin });
//         } else {
//             return res.redirect('/login'); // If not admin, redirect to login
//         }
//     } catch (err) {
//         console.error('Invalid admin token:', err);
//         return res.redirect('/login');
//     }
// });



app.get('/admin-dashboard', async (req, res) => {
    const token = req.cookies.token;

    try {
        // Verify the token
        const decoded = jwt.verify(token, 'shhhhhh');

        // Check if the user is an admin
        if (decoded.role === 'admin') {
            // return res.render('admin-dashboard', { admin });
            // Fetch candidates from the database
            const candidates = await Candidate.find();

            // Pass the candidates to the view
            return res.render('admin-dashboard', { candidates, admin });
        } else {
            // Redirect to login if not an admin
            return res.redirect('/login');
        }
    } catch (err) {
        console.error('Invalid admin token:', err);
        return res.redirect('/login');
    }
});





// Define Candidate routes ---->
// Code of Candidate route ---->
// Create Candidate ---->

// app.get('/admin-dashboard', async (req, res) => {
//     try {
//         // Fetch candidates from the database
//         const candidates = await Candidate.find();

//         // Pass the candidates to the view
//         res.render("admin-dashboard", { candidates });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Error fetching candidates');
//     }
// });

app.post('/candidate-register', async (req, res) => {
    try {
        const { name, party, image, gender, power } = req.body;

        // Validate input fields
        // if (!candidateName || !clanName || !image || !gender || !power) {
        //     return res.status(400).send('All fields are required');
        // }

        const createdCandidate = await Candidate.create({
            name,
            party,
            image,
            gender,
            power,
        });

        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating candidate');
    }
});


app.get('/delete/:id', async (req, res) => {
    try {
        const deletedCandidate = await Candidate.findByIdAndDelete(req.params.id);
        if (!deletedCandidate) {
            return res.status(404).send('Candidate not found');
        }
        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting candidate');
    }
});


app.get('/edit/:userid', async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.userid);
        if (!candidate) {
            return res.status(404).send('Candidate not found');
        }
        res.render('edit', { candidate });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching candidate');
    }
});


app.post('/update/:userid', async (req, res) => {
    try {
        const { image, name, party, gender, power } = req.body;

        // Validate input fields
        // if (!name || !party || !image || !gender || !power) {
        //     return res.status(400).send('All fields are required');
        // }

        const updatedCandidate = await Candidate.findByIdAndUpdate(
            req.params.userid,
            {
                image,
                name,
                party,
                gender,
                power
            },
            { new: true } // Ensures the updated document is returned
        );

        if (!updatedCandidate) {
            return res.status(404).send('Candidate not found');
        }

        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating candidate');
    }
});




const port = 3000;
const hostname = '127.0.0.1';
app.listen(port, hostname, function () {
    console.log(`Server is running at http://${hostname}:${port}/`)
});