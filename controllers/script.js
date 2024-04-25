const Script = require('../models/Script.js');
const User = require('../models/User');
const Actor = require('../models/Actor');
const Notification = require('../models/Notification');
const helpers = require('./helpers');
const _ = require('lodash');

/**
 * GET /tutorial
 * Get list of posts for feed (tutorial section where postFunctionalities is disabled)
 */
exports.getScriptTutorial = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        // If the user is no longer active, sign the user out.
        if (!user.active) {
            req.logout((err) => {
                if (err) console.log('Error : Failed to logout.', err);
                req.session.destroy((err) => {
                    if (err) console.log('Error : Failed to destroy the session during logout.', err);
                    req.user = null;
                    req.flash('errors', { msg: 'Account is no longer active. Study is over.' });
                    res.redirect('/signup');
                });
            });
        }

        // Get the newsfeed
        let script_feed = await Script.find()
            .where('class').equals(user.interest + "-Tutorial")
            .sort('postID')
            .populate('actor')
            .populate('comments.actor')
            .populate('comments.subcomments.actor')
            .exec();
        // Counter to track which objection actor to use
        let counter = 0;
        // Get objection actors
        const objectionActors = await Actor.find().where('class').equals("objection").exec();
        // Objection comment ID index
        let commentID = 96;

        // Harassment Comments
        const harassmentComments = {
            0: "LOL, did you even preview this before sharing? No one is interested in this crap. Save your time and ours.",
            1: "Looks like the person who made this video must be dumb. Whoever posted this should be embarrassed.",
            2: "This sucks! 🤮",
            3: "Seriously, how can you be so clueless about what's worth sharing? Your stuff is a total waste of space!",
            4: "Honestly, every time I think I've seen the worst content online, someone like you comes along and sets a new low.",
            5: "This gives me ick!! 🤢"
        };

        // Objection Comments
        const objectionComments = {
            0: "This is wrong. Let's support each other's creative efforts rather than tear each other down!",
            1: "We should treat each other's efforts respectfully and kindly. So try to appreciate the work, dude.",
            2: "Hey, stop! A supportive vibe is key. It's important to encourage and inspire one another.",
            3: "Please remember to stay respectful to each other here. Insulting others isn't cool."
        };

        // For each interest, a list of harassment comments' locations is provided. 
        // Each element in the list gives a harassment location information: [Video Index, Comment Index, Objection time]. 
        // These locations are to be replaced with harassments & accompanying objections.
        const videoIndexCommentIndex_HarassmentComments = {
            "Science": [
                [1, 0],
                [4, 0],
                [4, 3],
                [2, 3],
                [2, 4],
                [3, 2]
            ],
            "Education": [
                [1, 0],
                [4, 0],
                [4, 3],
                [2, 3],
                [2, 4],
                [3, 2]
            ],
            "Lifestyle": [
                [1, 0],
                [4, 0],
                [4, 3],
                [2, 3],
                [2, 4],
                [3, 2]
            ]
        };

        for (const harassmentNum in user.harassmentOrder) {
            const locationToReplace = videoIndexCommentIndex_HarassmentComments[user.interest][harassmentNum];
            script_feed[locationToReplace[0]].comments[locationToReplace[1]].body = harassmentComments[user.harassmentOrder[harassmentNum]];
            script_feed[locationToReplace[0]].comments[locationToReplace[1]].class = `offense${parseInt(harassmentNum)+1}`;
            script_feed[locationToReplace[0]].comments[locationToReplace[1]].likes = 1;
            script_feed[locationToReplace[0]].comments[locationToReplace[1]].unlikes = 1;
        }

        for (const index in user.harassmentToObjectToOrder) {
            const harassmentNum = user.harassmentToObjectToOrder[index];
            const locationToReplace = videoIndexCommentIndex_HarassmentComments[user.interest][harassmentNum];

            const subcomment = {
                commentID: commentID,
                body: objectionComments[user.objectionOrder[index]],
                likes: 0,
                unlikes: 0,
                actor: objectionActors[counter],
                time: script_feed[locationToReplace[0]].comments[locationToReplace[1]].objectionTime,
                class: `objection${counter+1}`,

                new_comment: false,
                liked: false,
                unliked: false
            };

            script_feed[locationToReplace[0]].comments[locationToReplace[1]].subcomments.push(subcomment);
            commentID++;
            counter++;
        }
        script_feed = script_feed.map(function(post) {
            post.comments.sort(function(a, b) {
                return b.time - a.time;
            })
            return post;
        });

        res.render('script', { script: script_feed, title: 'Feed', disabledFunctionalitiies: true });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /
 * Get list of posts for feed
 */
exports.getScript = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        // If the user is no longer active, sign the user out.
        if (!user.active) {
            req.logout((err) => {
                if (err) console.log('Error : Failed to logout.', err);
                req.session.destroy((err) => {
                    if (err) console.log('Error : Failed to destroy the session during logout.', err);
                    req.user = null;
                    req.flash('errors', { msg: 'Account is no longer active. Study is over.' });
                    res.redirect('/signup');
                });
            });
        }

        // Get the newsfeed
        let script_feed = await Script.find()
            .where('class').equals(user.interest)
            .sort('postID')
            .populate('actor')
            .populate('comments.actor')
            .populate('comments.subcomments.actor')
            .exec();

        if (user.group != "None-True") {
            script_feed[2].comments[0].body = "Another pointless video. Ever consider that no one cares?";
            script_feed[2].comments[0].likes = 1;
            script_feed[2].comments[0].unlikes = 1;
            script_feed[2].comments[0].class = 'offense7';
        }

        const finalfeed = await helpers.getFeed(script_feed, user);

        console.log("Script Size is: " + finalfeed.length);
        res.render('script', { script: finalfeed, title: 'Feed' });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /feed
 * Update user's actions on ACTOR posts. 
 */
exports.postUpdateFeedAction = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        // Find the object from the right post in feed
        let feedIndex = _.findIndex(user.feedAction, function(o) { return o.post == req.body.postID; });

        if (feedIndex == -1) {
            const cat = {
                post: req.body.postID,
                postClass: req.body.postClass,
            };
            // Add new post into correct location
            feedIndex = user.feedAction.push(cat) - 1;
        }
        // Create a new Comment
        if (req.body.new_comment) {
            user.numComments = user.numComments + 1;
            const cat = {
                new_comment: true,
                new_comment_id: user.numComments + 100,
                body: req.body.comment_text,
                relativeTime: req.body.new_comment - user.createdAt,
                absTime: req.body.new_comment,
                videoTime: req.body.videoTime,
                liked: false,
                unliked: false,
                flagged: false,
                shared: false,
                reply_to: req.body.reply_to,
                parent_comment: req.body.parent_comment
            }
            user.feedAction[feedIndex].comments.push(cat);
        }

        // Are we doing anything with a comment?
        else if (req.body.commentID) {
            const isUserComment = (req.body.isUserComment == 'true');
            let commentIndex = (isUserComment) ?
                _.findIndex(user.feedAction[feedIndex].comments, function(o) {
                    return o.new_comment_id == req.body.commentID && o.new_comment == isUserComment
                }) :
                _.findIndex(user.feedAction[feedIndex].comments, function(o) {
                    return o.comment == req.body.commentID && o.new_comment == isUserComment
                });
            //no comment in this post-actions yet
            if (commentIndex == -1) {
                const cat = {
                    comment: req.body.commentID
                };
                user.feedAction[feedIndex].comments.push(cat);
                commentIndex = user.feedAction[feedIndex].comments.length - 1;
            }

            // LIKE A COMMENT
            if (req.body.like) {
                let like = req.body.like;
                if (user.feedAction[feedIndex].comments[commentIndex].likeTime) {
                    user.feedAction[feedIndex].comments[commentIndex].likeTime.push(like);

                } else {
                    user.feedAction[feedIndex].comments[commentIndex].likeTime = [like];
                }
                user.feedAction[feedIndex].comments[commentIndex].liked = !user.feedAction[feedIndex].comments[commentIndex].liked;
                if (req.body.isUserComment != 'true') user.numCommentLikes++;
            }

            // UNLIKE A COMMENT
            if (req.body.unlike) {
                let unlike = req.body.unlike;
                if (user.feedAction[feedIndex].comments[commentIndex].unlikeTime) {
                    user.feedAction[feedIndex].comments[commentIndex].unlikeTime.push(unlike);
                } else {
                    user.feedAction[feedIndex].comments[commentIndex].unlikeTime = [unlike];
                }
                user.feedAction[feedIndex].comments[commentIndex].unliked = !user.feedAction[feedIndex].comments[commentIndex].unliked;
                if (req.body.isUserComment != 'true') user.numCommentLikes--;
            }

            // FLAG A COMMENT
            else if (req.body.flag) {
                let flag = req.body.flag;
                if (user.feedAction[feedIndex].comments[commentIndex].flagTime) {
                    user.feedAction[feedIndex].comments[commentIndex].flagTime.push(flag);

                } else {
                    user.feedAction[feedIndex].comments[commentIndex].flagTime = [flag];
                }
                user.feedAction[feedIndex].comments[commentIndex].flagged = true;
            }

            // UNFLAG A COMMENT
            else if (req.body.unflag) {
                let unflag = req.body.unflag;
                if (user.feedAction[feedIndex].comments[commentIndex].flagTime) {
                    user.feedAction[feedIndex].comments[commentIndex].flagTime.push(unflag);

                } else {
                    user.feedAction[feedIndex].comments[commentIndex].flagTime = [unflag];
                }
                user.feedAction[feedIndex].comments[commentIndex].flagged = false;
            }

            // SHARE A COMMENT 
            else if (req.body.share) {
                console.log()
                let share = req.body.share;
                if (user.feedAction[feedIndex].comments[commentIndex].shareTime) {
                    user.feedAction[feedIndex].comments[commentIndex].shareTime.push(share);

                } else {
                    user.feedAction[feedIndex].comments[commentIndex].shareTime = [share];
                }
                user.feedAction[feedIndex].comments[commentIndex].shared = true;
            }
        } // Not a comment-- Are we doing anything with the post?
        else {
            // Flag event
            if (req.body.flag) {
                let flag = req.body.flag;
                if (!user.feedAction[feedIndex].flagTime) {
                    user.feedAction[feedIndex].flagTime = [flag];
                } else {
                    user.feedAction[feedIndex].flagTime.push(flag);
                }
                user.feedAction[feedIndex].flagged = !user.feedAction[feedIndex].flagged;
            } // Like event
            else if (req.body.like) {
                let like = req.body.like;
                if (!user.feedAction[feedIndex].likeTime) {
                    user.feedAction[feedIndex].likeTime = [like];
                } else {
                    user.feedAction[feedIndex].likeTime.push(like);
                }
                user.feedAction[feedIndex].liked = !user.feedAction[feedIndex].liked;
            } // Unlike event
            else if (req.body.unlike) {
                let unlike = req.body.unlike;
                if (!user.feedAction[feedIndex].unlikeTime) {
                    user.feedAction[feedIndex].unlikeTime = [unlike];
                } else {
                    user.feedAction[feedIndex].unlikeTime.push(unlike);
                }
                user.feedAction[feedIndex].unliked = !user.feedAction[feedIndex].unliked;
            } // Share event 
            else if (req.body.share) {
                let share = req.body.share;
                if (!user.feedAction[feedIndex].shareTime) {
                    user.feedAction[feedIndex].shareTime = [share];
                } else {
                    user.feedAction[feedIndex].shareTime.push(share);
                }
                user.feedAction[feedIndex].shared = true;
            } // Read event: Not used.
            else if (req.body.viewed) {
                let view = req.body.viewed;
                if (!user.feedAction[feedIndex].readTime) {
                    user.feedAction[feedIndex].readTime = [view];
                } else {
                    user.feedAction[feedIndex].readTime.push(view);
                }
                user.feedAction[feedIndex].rereadTimes++;
                user.feedAction[feedIndex].mostRecentTime = Date.now();
            } // Video action (play, pause, seeking, seeked) 
            else if (req.body.videoAction) {
                user.feedAction[feedIndex].videoAction.push(req.body.videoAction);
            } // Video duration (array of time durations user viewed the video) 
            else if (req.body.videoDuration) {
                user.feedAction[feedIndex].videoDuration.push(req.body.videoDuration);
            } else {
                console.log(req.body);
                console.log('Something in feedAction went crazy. You should never see this.');
            }
        }
        await user.save();
        res.send({ result: "success", numComments: user.numComments });
    } catch (err) {
        next(err);
    }

};

/**
 * POST /messageSeen
 * Post whether offense or objection message is seen
 */
exports.postMessageSeen = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        const date = Date.now();
        if (req.body.type.startsWith("offense")) {
            user.offenseMessagesSeen[req.body.type].seen = true;
            user.offenseMessagesSeen[req.body.type].time = date;
        }
        if (req.body.type.startsWith("objection")) {
            user.objectionMessagesSeen[req.body.type].seen = true;
            user.objectionMessagesSeen[req.body.type].time = date;
        }

        await user.save();
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /postTimeStamps
 * Get a list & a dictionary of timestamps and commentIDs for specified post.
 */
exports.getPostTimeStamps = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        const posts = await Script.find()
            .where('postID').equals(req.query.postID)
            .exec(); // list of length 1

        const post = await helpers.getFeed(posts, user);

        const postTimeStampsDict = post[0].comments.reduce(function(dict, commentObj) {
            dict[commentObj.time] ? dict[commentObj.time].push(commentObj.commentID) : dict[commentObj.time] = [commentObj.commentID];
            commentObj.subcomments.length > 0 ? commentObj.subcomments.forEach(function(subcomment) { dict[subcomment.time] ? dict[subcomment.time].push(subcomment.commentID) : dict[subcomment.time] = [subcomment.commentID]; }) : null;
            return dict;
        }, {});
        const postTimeStamps = Object.keys(postTimeStampsDict).map(Number).sort((a, b) => a - b);

        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({ postTimeStampsDict: postTimeStampsDict, postTimeStamps: postTimeStamps });
    } catch (err) {
        next(err);
    }
};