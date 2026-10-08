const Validator = require('validator');

const clean = (s) => Validator.escape(Validator.trim(String(s)));

function parseGigInput(body,partial=false) {
    const errors = [];
    const out = {};

    
}