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
fs.writeFileSync(userFile, JSON.stringify(users, null, 2));
}