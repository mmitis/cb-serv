function arrayContain(check, taskSteps) {
    for(let i = check.length; i--;) {
        if(!taskSteps.includes(check[i]))
            return false;
    }
    return true;
}

module.exports = {
    arrayContain
};