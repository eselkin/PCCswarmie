var express = require('express');
var router = express.Router();
var User = require('../models/user');

var isAdmin = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated() && req.user.isAdmin == true )
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/');
}

module.exports = function(passport){
	/* GET Home Page */
	router.get('/', isAdmin, function(req, res){
        if ( req.query.begin != undefined)
            skipnum = req.query.begin;
        else
            skipnum = 0;
        if ( req.query.display != undefined)
            display = req.query.num;
        else
            display = 50;

        var query = User
            .find()
            .sort({'username':-1})
            .limit(display)
            .skip(skipnum)
            .exec( function(err, users) {
	        	res.render('users', {
                    user: req.user,
                    users: users,
                    skip: skipnum,
                    display: display
                })
            });
    });
	/* GET Home Page */
	router.get('/search', isAdmin, function(req, res){
		res.render('users', { user: req.user });
	});
	return router;
}
