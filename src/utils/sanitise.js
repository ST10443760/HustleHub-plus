const Validator = require('validator');

const clean = (s) => Validator.escape(Validator.trim(String(s)));

function parseGigInput(body,partial=false) {
    const errors = [];
    const out = {};

    if(!partial || body.title !== undefined) {
        if(typeof body.title !=='string' || body.title.trim().length <3 || body.title.length>100)
            errors.push('Title must be a string between 3 and 100 characters');
        else
            out.title = clean(body.title);
    }

}