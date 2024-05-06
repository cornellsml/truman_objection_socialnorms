const User = require('../models/User');
const Notification = require('../models/Notification.js');
const Script = require('../models/Script.js');

// From https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    let currentIndex = array.length,
        randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }
    return array;
}

// create random id for guest accounts
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    res.render('account/login', {
        title: 'Login'
    });
};

/**
 * POST /login
 * Sign in using email and password.
 */
// exports.postLogin = (req, res, next) => {
//     req.assert('email', 'Email is not valid.').isEmail();
//     req.assert('password', 'Password cannot be blank.').notEmpty();
//     req.sanitize('email').normalizeEmail({ remove_dots: false });

//     const errors = req.validationErrors();

//     if (errors) {
//         req.flash('errors', errors);
//         console.log(errors);
//         return res.redirect('/login');
//     }

//     passport.authenticate('local', (err, user, info) => {
//         const two_days = 172800000; //Milliseconds in 2 days
//         const time_diff = Date.now() - user.createdAt; //Time difference between now and account creation.
//         if (err) { return next(err); }
//         if (!user) {
//             req.flash('errors', info);
//             return res.redirect('/login');
//         }
//         if (!(user.active) || ((time_diff >= two_days) && !user.isAdmin)) {
//             // var post_url = user.endSurveyLink;
//             req.flash('final');
//             return res.redirect('/login');
//         }
//         req.logIn(user, (err) => {
//             if (err) { return next(err); }

//             var temp = req.session.passport; // {user: 1}
//             var returnTo = req.session.returnTo;
//             req.session.regenerate(function(err) {
//                 //req.session.passport is now undefined
//                 req.session.passport = temp;
//                 req.session.save(function(err) {
//                     const time_now = Date.now();
//                     const userAgent = req.headers['user-agent'];
//                     const user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
//                     user.logUser(time_now, userAgent, user_ip);
//                     if (user.consent) {
//                         return res.redirect(returnTo || '/');
//                     } else {
//                         return res.redirect(returnTo || '/account/signup_info');
//                     }
//                 });
//             });
//         });
//     })(req, res, next);
// };

/**
 * GET /logout
 * Handles user log out.
 */
exports.logout = async(req, res) => {
    const user = await User.findById(req.user.id).exec();
    user.logPage(Date.now(), '/thankyou');
    req.logout((err) => {
        if (err) console.log('Error : Failed to logout.', err);
        req.session.destroy((err) => {
            if (err) console.log('Error : Failed to destroy the session during logout.', err);
            req.user = null;
            res.redirect('/thankyou');
        });
    });
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    res.render('account/signup', {
        title: 'Create Account'
    });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = async(req, res, next) => {
    // (1) If given r_id from Qualtrics: If user instance exists, go to profile page. If doens't exist, create a user instance. 
    // (2) If not given r_id from Qualtrics: Generate a random username, not used yet, and save user instance.
    if (req.query.r_id == 'null' || !req.query.r_id || req.query.r_id == 'undefined') {
        req.query.r_id = makeid(10);
    }

    let experimentalCondition;
    if (!req.query.c_id || req.query.c_id == 'null' || req.query.c_id == 'undefined') {
        const conditionMessages = [
            'None', 'None-True', 'Few:None', 'Few:Few', 'Few:Many', 'Many:None', 'Many:Few', 'Many:Many'
        ];
        experimentalCondition = conditionMessages[(Math.floor(Math.random() * 8))];
    } else {
        experimentalCondition = req.query.c_id;
    }
    // ---- Conditions: 8 possible conditions: 6 experimentals & 2 controls ------//
    // "None": No Harassment Comments
    // "None-True": No Harassment Comments, including in behavioral data collection

    // "Few:None": 3 online harassments: none addressed
    // "Few:Few" 3 online harassments: 1 addressed
    // "Few:Many" 3 online harassments: 2 addressed

    // "Many:None": 6 online harassments: none addressed
    // "Many:Few": 6 online harassments: 2 addressed
    // "Many:Many": 6 online harassments: 4 addressed

    let harassmentOrder;
    let harassmentToObjectToOrder;
    let objectionOrder;

    const conditions = experimentalCondition.split(":");

    let harassmentComments;
    switch (conditions[0]) {
        case "None":
        case "None-True":
            harassmentOrder = [];
            break;
        case "Few":
            // 3 online harassments
            harassmentOrder = [];
            harassmentOrder.push(shuffle([0, 3])[0]);
            harassmentOrder.push(shuffle([1, 4])[0]);
            harassmentOrder.push(shuffle([2, 5])[0]);
            break;
        case "Many":
            harassmentComments = [0, 1, 2, 3, 4, 5]; // 6 online harassments
            harassmentOrder = shuffle(harassmentComments);
        default:
            break;
    }

    let objectionComments = shuffle([0, 1, 2, 3]);
    switch (conditions[1]) {
        case undefined:
        case "None":
            harassmentToObjectToOrder = [];
            objectionOrder = [];
            break;
        case "Few":
            indexes = conditions[0] == "Few" ? [0, 1, 2] : [0, 1, 2, 3, 4, 5];
            indexes = shuffle(indexes);
            harassmentToObjectToOrder = conditions[0] == "Few" ? indexes.slice(0, 1) : indexes.slice(0, 2);

            objectionOrder = conditions[0] == "Few" ? objectionComments.slice(0, 1) : objectionComments.slice(0, 2);
            break;
        case "Many":
            indexes = conditions[0] == "Few" ? [0, 1, 2] : [0, 1, 2, 3, 4, 5];
            indexes = shuffle(indexes);
            harassmentToObjectToOrder = conditions[0] == "Few" ? indexes.slice(0, 2) : indexes.slice(0, 4);

            objectionOrder = conditions[0] == "Few" ? objectionComments.slice(0, 2) : objectionComments.slice(0, 4);
            break;
        default:
            break;
    }

    try {
        const existingUser = await User.findOne({ mturkID: req.query.r_id }).exec();
        if (existingUser) {
            existingUser.username = req.body.username;
            existingUser.profile.picture = req.body.photo;
            existingUser.profile.name = req.body.username;
            user = existingUser;
        } else {
            user = new User({
                mturkID: req.query.r_id,
                username: req.body.username,
                profile: {
                    name: req.body.username,
                    color: '#a6a488',
                    picture: req.body.photo
                },
                group: experimentalCondition,
                harassmentOrder: harassmentOrder,
                harassmentToObjectToOrder: harassmentToObjectToOrder,
                objectionOrder: objectionOrder,
                active: true,
                lastNotifyVisit: (Date.now()),
                createdAt: (Date.now())
            });
        }

        await user.save();
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            const currDate = Date.now();
            const userAgent = req.headers['user-agent'];
            const user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            user.logUser(currDate, userAgent, user_ip);
            res.set('Content-Type', 'application/json; charset=UTF-8');
            res.send({ result: "success" });
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /account/profile
 * Update profile information.
 */
// exports.postSignupInfo = (req, res, next) => {
//     User.findById(req.user.id, (err, user) => {
//         if (err) { return next(err); }
//         user.profile.name = req.body.name.trim() || '';
//         user.profile.location = req.body.location.trim() || '';
//         user.profile.bio = req.body.bio.trim() || '';

//         if (req.file) {
//             console.log("Changing Picture now to: " + req.file.filename);
//             user.profile.picture = req.file.filename;
//         }

//         user.save((err) => {
//             if (err) {
//                 if (err.code === 11000) {
//                     return res.redirect('/account/signup_info');
//                 }
//                 return next(err);
//             }
//             req.flash('success', { msg: 'Profile information has been updated.' });
//             return res.redirect('/com');
//         });
//     });
// };

/**
 * POST /account/interest
 * Update interest information.
 */
exports.postInterestInfo = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        user.interest = req.body.interest;
        user.consent = true;
        await user.save();
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
};


/**
 * GET /account
 * Profile page.
 */
// exports.getAccount = (req, res) => {
//     res.render('account/profile', {
//         title: 'Account Management'
//     });
// };

/**
 * GET /me
 * Profile page.
 */
// exports.getMe = (req, res) => {
//     User.findById(req.user.id)
//         .populate({
//             path: 'posts.comments.actor',
//             model: 'Actor'
//         })
//         .exec(function(err, user) {
//             if (err) { return next(err); }
//             var allPosts = user.getPosts();
//             res.render('me', { posts: allPosts, title: user.profile.name || user.email || user.id });
//         });
// };

/**
 * POST /account/profile
 * Update profile information.
 */
// exports.postUpdateProfile = (req, res, next) => {
//     req.assert('email', 'Please enter a valid email address.').isEmail();
//     req.sanitize('email').normalizeEmail({ remove_dots: false });

//     const errors = req.validationErrors();

//     if (errors) {
//         req.flash('errors', errors);
//         return res.redirect('/account');
//     }

//     User.findById(req.user.id, (err, user) => {
//         if (err) { return next(err); }
//         user.email = req.body.email || '';
//         user.profile.name = req.body.name || '';
//         user.profile.location = req.body.location || '';
//         user.profile.bio = req.body.bio || '';

//         if (req.file) {
//             console.log("Changing Picture now to: " + req.file.filename);
//             user.profile.picture = req.file.filename;
//         }

//         user.save((err) => {
//             if (err) {
//                 if (err.code === 11000) {
//                     req.flash('errors', { msg: 'The email address you have entered is already associated with an account.' });
//                     return res.redirect('/account');
//                 }
//                 return next(err);
//             }
//             req.flash('success', { msg: 'Profile information has been updated.' });
//             res.redirect('/account');
//         });
//     });
// };

/**
 * POST /account/password
 * Update current password.
 */
// exports.postUpdatePassword = (req, res, next) => {
//     req.assert('password', 'Password must be at least 4 characters long').len(4);
//     req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

//     const errors = req.validationErrors();

//     if (errors) {
//         req.flash('errors', errors);
//         return res.redirect('/account');
//     }

//     User.findById(req.user.id, (err, user) => {
//         if (err) { return next(err); }
//         user.password = req.body.password;
//         user.save((err) => {
//             if (err) { return next(err); }
//             req.flash('success', { msg: 'Password has been changed.' });
//             res.redirect('/account');
//         });
//     });
// };

/**
 * POST /pageLog
 * Record user's page visit to pageLog.
 */
exports.postPageLog = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        user.logPage(Date.now(), req.body.path);
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /pageTimes
 * Record user's time on site to pageTimes.
 */
exports.postPageTime = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        // What day in the study is the user in? 
        const log = {
            time: req.body.time,
            page: req.body.pathname,
        };
        user.pageTimes.push(log);
        await user.save();
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('account/forgot', {
        title: 'Forgot Password'
    });
};


/**
 * GET /userInfo
 * Get user profile and number of user comments
 */
exports.getUserProfile = async(req, res) => {
    try {
        const user = await User.findById(req.user.id).exec();
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({
            userProfile: user.profile,
            numComments: user.numComments
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Deactivate accounts who are completed with the study, except for admin accounts. Called 3 times a day. Scheduled via CRON jobs in app.js
 */
exports.stillActive = async() => {
    try {
        const activeUsers = await User.find().where('active').equals(true).exec();
        console.log(activeUsers);
        for (const user of activeUsers) {
            const study_length = 86400000 * 1; // Milliseconds in NUM_DAYS days
            const time_diff = Date.now() - user.createdAt; // Time difference between now and account creation.
            if ((time_diff >= study_length) && !user.isAdmin) {
                user.active = false;
                user.logPostStats();
                await user.save();
            }
        }
    } catch (err) {
        next(err);
    }
};


/**
 * GET /completed
 * Render Admin Dashboard: Basic information on users currrently in the study
 */
exports.userTestResults = async(req, res) => {
    if (!req.user.isAdmin) {
        res.redirect('/');
    } else {
        try {
            const users = await User.find().where('isAdmin').equals(false).exec();
            for (const user of users) {
                const study_length = 86400000 * 1; // Milliseconds in NUM_DAYS days
                const time_diff = Date.now() - user.createdAt; // Time difference between now and account creation.
                if ((time_diff >= study_length) && !user.isAdmin) {
                    user.active = false;
                    user.logPostStats();
                    await user.save();
                }
            }
            res.render('completed', { users: users });
        } catch (err) {
            next(err);
        }
    }
};