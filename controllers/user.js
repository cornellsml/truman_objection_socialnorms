const User = require('../models/User');

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

// create random comment time (between -86400 and -60 seconds, i.e. one day and 1 minute)
function getRandomCommentTime() {
    // Math.floor(Math.random() * (max - min + 1)) + min
    return Math.floor((Math.random() * (86400 - 60 + 1) + 60)) * -1000;
}

// create random subcomment time (between -commentTime and -60 seconds, i.e. after the parent comment time and 1 minute)
function getRandomSubCommentTime(commentTime) {
    const maxCommentTime = (commentTime / -1000) - 60; // Indicates the subcomment must come at least 1 minute after original comment
    return Math.floor((Math.random() * (maxCommentTime - 60 + 1) + 60)) * -1000;
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

    const numComments = [3, 3, 5, 3, 5, 3];
    let commentTimes = [];
    let subcommentTimes = [];

    for (const video in numComments) {
        let video_commentTimes = [];
        for (let i = 1; i <= numComments[video]; i++) {
            video_commentTimes.push(getRandomCommentTime());
        }
        commentTimes.push(video_commentTimes);
    }

    const videoIndexCommentIndex_HarassmentComments = [
        [1, 0],
        [4, 0],
        [4, 3],
        [2, 3],
        [2, 4],
        [3, 2]
    ];

    for (const harassmentComment of videoIndexCommentIndex_HarassmentComments) {
        const video = harassmentComment[0];
        const comment = harassmentComment[1];
        const subcommentTime = getRandomSubCommentTime(commentTimes[video][comment]);
        subcommentTimes.push(subcommentTime);
    }

    const firstVideo_subcommentTime = getRandomSubCommentTime(commentTimes[0][0]);
    subcommentTimes.push(firstVideo_subcommentTime);

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
                commentTimes: commentTimes,
                subcommentTimes: subcommentTimes,
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