const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const userFile = path.join(__dirname, '../../data/users.json');

function getUsers() {
    const data = fs.readFileSync(userFile, 'utf-8');

    if (!data.trim()) {
        return [];
    }

    return JSON.parse(data);
}

function saveUsers(users) {
    fs.writeFileSync(
        userFile,
        JSON.stringify(users, null, 2)
    );
}

//Register
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check missing fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email and password are required.'
            });
        }

        // Check password length
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long.'
            });
        }

        // Check email validity
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email Address Invalid, Please provide a valid Email Address.'
            });
        }

        const users = getUsers();

        // Check if username is taken
        const existingUser = users.find(
            user => user.username.toLowerCase() === username.trim().toLowerCase()
        );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Username is taken.'
            });
        }

        // Check duplicate email
        const existingEmail = users.find(
            user => user.email.toLowerCase() === email.trim().toLowerCase()
        );

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: 'Email is already in use.'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const newUser = {
            id: Date.now().toString(),
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        // Save user
        users.push(newUser);
        saveUsers(users);

        // Response
        return res.status(201).json({
            success: true,
            message: 'Registered successfully.',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);

        return res.status(500).json({
            success: false,
            message: 'An error occurred during registration.'
        });
    }
};

//Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        //Check for missing fields
        if(!email||!password){
        return res.status(400).json({
            success: false,
            message: 'Email and Password are required'
        });
    }
        const users = getUsers();
        
        //Find user
        const user = users.find(
            user => user.email.toLowerCase() === email.trim().toLowerCase()
        );

        //User doesn't exist
        if(!user){
            return res.status(400).json({
                success: false,
                message: 'Ivalid Credentials'
            });
        }
        
        //Check if password matches hashed password
        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        //Incorrect Password
        if (!passwordMatches){
            return res.status(400).json({
                success: false,
                message: "Incorrect Email or Password"
            });
        }

        //Succesful Login
        return res.status(200).json({
            success: true,
            message: 'Login Successful',
            id: user.id,
            username: user.username,
            email: user.email
        });

    }catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            success: false,
            message: 'An error occurred during login.'
        });
    }
};

module.exports = {
    register,
    login
};