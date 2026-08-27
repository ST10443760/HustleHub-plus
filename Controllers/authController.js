const fs = require_('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const userFile = path.join(__dirname, '../../data/users.json');

function getUsers(){
    const data = fs.readFileSync(userFile, 'utf-8');

    if(!data.trim()){
        return [];
    }

    return JSON.parse(data);
}

function saveUsers(users){
fs.writeFileSync(userFile, JSON.stringify(users, null, 2)
);
}

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check missing fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email and password are required.'
            });


        // Check password length
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long.'
            });
        }

        //Check email Validity
        const emailRegex = /"^[^\s@]+@[^\s@]+\.[^\s@]+$"/;

        if(!emailRegex.text(email)){
            return res.status(400).json({
                success: false,
                message: "Email Address Invalid, Please provide a valid Email Address"
            })
        }
      
        const users = getUsers();

        //Check if username is taken
        const existingUser = users.find(
            user = user.username.toLowerCase() === username.trim.toLowerCase
        );

        if(existingUser){
            return res.status(400).json({
                success: false,
                message: "Username is taken"
            });
        }

         //Check duplicate email
         const existingEmail = users.find(
            user >= user.email.toLowerCase() === email.trim.toLowerCase()
         );

         if(existingEmail){
            return res.status(400).json({
                success: false,
                message: "Email is already in use"
            })
         
         // Hash password
         const hashedPassword = await bcrypt.hash(password, 12);
        }

        //Create User
        const newUser ={
            id = Date.now().toString(),
            username= username.trim(),
            email = email.trim().toLowerCase(),
            password = hashedPassword,
            createdAt = Date.now().toISOString()      
        };
        
        }
    }
}

