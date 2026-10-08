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

    if(!partial || body.description !== undefined) {
        if(typeof body.description !== 'string' || body.description.length>1000)
            errors.push('Description must be a string with at most 1000 characters');
        else
            out.description = clean(body.description);
    }

    if(!partial || body.price !== undefined) {
        const price = Number(body.price);
        if(!Number.isFinite(price) || price<0 || price>1000000)
            errors.push("Price must be a positive number that is less than 1 000 000");
        else out.price = Math.round(price*100)/100;
  }

}