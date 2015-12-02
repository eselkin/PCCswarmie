var mongoose = require('mongoose');

module.exports = mongoose.model('User',{
    id: String,
    username: String,
    email: String,
    password: String,
    fNameInput: String,
    lNameInput: String,
    secretQ: String,
    secretA: String,
    secretH: String,
    isAdmin: Boolean,
    dateC: Date,
    dateU: Date
});
