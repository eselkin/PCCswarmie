var express = require('express');
var router = express.Router();
var db = require('pg');
var Sequelize = require('sequelize');
var sequelize = new Sequelize("postgres://pccswarmies@localhost:5432/pccswarmies");
var QADB = sequelize.define('QA',
        {
            author: {
                type: Sequelize.STRING(75),
                field: 'author',
                allowNull: false
            },
            edited: {
                type: Sequelize.BOOLEAN,
                field: 'edited',
                allowNull: false
            },
            numresponses:{
                type: Sequelize.INTEGER,
                field: 'numresponses',
                allowNull: false
            },
            title:{
                type: Sequelize.STRING(100),
                field: 'title',
                allowNull: false
            },
            textbody:{
                type: Sequelize.STRING(750),
                field: 'textbody',
                allowNull: false
            },
            url:{
                type: Sequelize.STRING(300),
                field: 'url',
                allowNull: true
            },
            childof:{
                type: Sequelize.BIGINT,
                field: 'childof',
                allowNull: true // null means that the post is a new post without a parent
            }
        },
        {
            freezeTableName: true,
            tableName: "QA"
        });

// Make or set up tables for access from DB
sequelize.sync();


var isAuthenticated = function (req, res, next) {
    // if user is authenticated in the session, call the next() to call the next request handler
    // Passport adds this method to request object. A middleware is allowed to add properties to
    // request and response objects
    if (req.isAuthenticated())
        return next();
    // if the user is not authenticated then redirect him to the login page
    res.redirect('/');
}

module.exports = function(passport){

    /* GET login page. */
    router.get('/', function(req, res) {
        // Display the Login page with any flash message, if any
        // This will display all base bored boards without capacity to edit or post to them
        // No authentication for reading
        res.render('index', { message: req.flash('message') });
    });

    router.get('/login', function(req, res) {
        // Display the Login page with any flash message, if any
        res.render('login', { message: req.flash('message') });
    });

    /* Handle Login POST */
    router.post('/login', passport.authenticate('login', {
        successRedirect: '/post',
        failureRedirect: '/',
        failureFlash : true
    }));

    router.get('/QA', isAuthenticated, function(req, res, next) {
        res.redirect('/post');
    }); // backward compatibility

    
    router.get('/delete', isAuthenticated, function(req, res, next){
        if (req.query.id == undefined) {
            res.redirect('/QA')
        }
        QADB.findOne(
        {
            where: { id: req.query.id }
        }).then( function(postedit) {
            // user tried to edit forceably, but was not user who wrote post
            if (req.user.isAdmin == false) {
                res.redirect('/QA')
            }
            // Can edit, because you are who you say you are
            res.render('delete', {
                user: req.user,
                post: postedit,
            });
        },
        function(error) {
            myError = { status:404, message: "Could not find "};
            next( myError );
        })

    });


    router.post('/delete', isAuthenticated, function(req, res, next){
        if (req.query.id == undefined || req.user.isAdmin == false) {
            res.redirect('/QA');
        }
        // now we assume that the isAdmin is true and the id is a correct one
        QADB.findOne({
            where: { id: req.query.id }
        }).then(function(post) {
            post.destroy(); // delete the row now
            QADB.findAll({
                where: {childof: req.query.id}
            }).then(function(childpost){
                childpost.destroy(); // delete all the post's children
            });
        }, function(errorupdate){
            res.redirect('/QA');
        });
    });
    
    router.get('/edit', isAuthenticated, function(req, res, next){
        if (req.query.id == undefined) {
            res.redirect('/QA')
        }
        QADB.findOne(
        {
            where: { id: req.query.id }
        }).then( function(postedit) {
            // user tried to edit forceably, but was not user who wrote post
            if (postedit.author != req.user.username) {
                res.redirect('/QA')
            }
            // Can edit, because you are who you say you are
            res.render('edit', {
                user: req.user,
                post: postedit,
            });
        },
        function(error) {
            myError = { status:404, message: "Could not find "};
            next( myError );
        })

    });

    router.post('/edit', isAuthenticated, function(req, res, next){
        if (req.query.id == undefined) {
            res.redirect('/QA');
        }
        QADB.update(
        {
            title : req.body.title,
            textbody: req.body.textbody,
            url: req.body.links,
            edited: true
        }, {
            where: {
                id: req.query.id, // and verify authorship
                author: req.user.username
            }
        }).then(function(updated) {
            QADB.findAll({
                where: { childof: req.query.id },
                order: '"updatedAt" DESC',
                offset : off,
                limit  : lim
            }).then(function(childquestions){
                res.render('reply', {
                    user: req.user,
                    post: updated, // from query above
                    children: childquestions,
                    offset: off,
                    limit: lim
                    });
                });
        }, function(errorupdate){
            res.redirect('/QA');
        });
    });

    /* GET posts or a post's page to post reply to */
    router.get('/post', isAuthenticated, function(req, res, next){
        // This will allow for any child to be looked at as a parent for posting to
        // So we can navigate to the correct post this way with ?id=#id and then
        // post to it as a child
        off = (req.query.off == undefined)? 0: req.query.off; // offset to start returning
        lim = (req.query.lim == undefined)? 10: req.query.lim; // limit how many max

        if (req.query.id != undefined)
        {
            var parentPost = "";
            QADB.findOne({
                where  : { id : req.query.id }
            }).then(function(post){
                parentPost = post; // store this for second query, only show two levels of posts
            }, function(error) {
                myError = { status:404, message: "Could not find "};
                next( myError );
            }
            );

            QADB.findAll({
                where: { childof: req.query.id },
                order: '"updatedAt" DESC',
                offset : off,
                limit  : lim
            }).then(function(childposts){
                res.render('reply', {
                    user: req.user,
                    post: parentPost, // from query above
                    children: childposts,
                    offset: off,
                    limit: lim
                    });
                });
            // if looking for a specific to post to
        } else  {
           QADB.findAll({
                where:{childof:null},
                order: '"updatedAt" DESC',
                offset : off,
                limit  : lim
            }).then(function(posts) {
                    res.render('QA', {
                        user: req.user,
                        posts: posts,
                        offset: off,
                        limit: lim
                    }); // find all parent entries
                },
                function (err) {
                    myError = { status:404, message: err+"Could not find posts, something must be wrong with the server"};
                    next( myError );
                });
        } // end else, find all boreds
    });

    router.post('/post', isAuthenticated, function(req, res, next){
        off = (req.query.off == undefined)? 0: req.query.off; // offset to start returning
        lim = (req.query.lim == undefined)? 10: req.query.lim; // limit how many max

        var addingTo = "";
        if (req.query.id != undefined)
            addingTo = req.query.id;
        else
            addingTo = null;

        QADB.create({
            author: req.user.username,
            edited: false,
            numresponses: 0,
            title: req.body.title,
            textbody: req.body.textbody,
            url: req.body.links,
            image: req.body.image,
            childof: addingTo // autocreates id col and timestamps for updated and created times
        }).then( function(addedPost){
            if (addingTo == null) {
                QADB.findAll({
                    where:{childof:null},
                    order:'"updatedAt" DESC',
                    offset : off,
                    limit  : lim
                }).then(function(posts) {
                    res.render('repliedNull', {
                        user: req.user,
                        posts: posts,
                        offset : off,
                        limit  : lim
                    }); // find all parent entries
                },
                function (err) {
                    myError = { status:404, message: err+"Could not find posts, something must be wrong with the server"};
                    next( myError );
                });
            } else {
                parentsSubPosts = 0;
                QADB.findOne({where : { id : req.query.id } }).then(function(post){
                    parentsSubPosts = post.numresponses;
                    parentsSubPosts++;
                    QADB.update({ numresponses : parentsSubPosts }, {where: {id: req.query.id}});
                    QADB.findAll({where: { childof: req.query.id }, order: '"updatedAt" DESC' }).then(function(childposts){
                        res.render('repliedChild', {
                            user: req.user,
                            children: childposts,
                            offset: off,
                            limit: lim
                         });
                    });
                });
            }
       });
    });

    /* Handle Logout */
    router.get('/signout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    return router;
}
