const Script = require('../models/Script.js');
const User = require('../models/User');
const Actor = require('../models/Actor');
const Notification = require('../models/Notification');
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

        //Get the newsfeed
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

        //Final array of all posts to go in the feed
        let finalfeed = [];

        // While there are regular posts to add to the final feed
        while (script_feed.length) {
            let replyDictionary = {}; // where Key = parent comment reply falls under, value = the list of comment objects

            //Looking at the post in script_feed[0] now.
            //For this post, check if there is a user feedAction matching this post's ID and get its index.
            const feedIndex = _.findIndex(user.feedAction, function(o) { return o.post == script_feed[0].id; });

            if (feedIndex != -1) {
                //User performed an action with this post
                //Check to see if there are comment-type actions.
                if (Array.isArray(user.feedAction[feedIndex].comments) && user.feedAction[feedIndex].comments) {
                    //There are comment-type actions on this post.
                    //For each comment on this post, add likes, flags, etc.
                    for (const commentObject of user.feedAction[feedIndex].comments) {
                        if (commentObject.new_comment) {
                            // This is a new, user-made comment. Add it to the comments list for this post.
                            const cat = {
                                commentID: commentObject.new_comment_id,
                                body: commentObject.body,
                                likes: commentObject.liked ? 1 : 0,
                                unlikes: commentObject.unliked ? 1 : 0,
                                time: commentObject.videoTime,

                                new_comment: commentObject.new_comment,
                                liked: commentObject.liked,
                                unliked: commentObject.unliked
                            };

                            if (commentObject.reply_to != null) {
                                cat.reply_to = commentObject.reply_to;
                                cat.parent_comment = commentObject.parent_comment;
                                if (replyDictionary[commentObject.parent_comment]) {
                                    replyDictionary[commentObject.parent_comment].push(cat)
                                } else {
                                    replyDictionary[commentObject.parent_comment] = [cat];
                                }
                            } else {
                                script_feed[0].comments.push(cat);
                            }
                        } else {
                            // This is not a new, user-created comment.
                            // Get the comment index that corresponds to the correct comment
                            const commentIndex = _.findIndex(script_feed[0].comments, function(o) { return o.id == commentObject.comment; });
                            // If this comment's ID is found in script_feed, it is a parent comment; add likes, flags, etc.
                            if (commentIndex != -1) {
                                // Check if there is a like recorded for this comment.
                                if (commentObject.liked) {
                                    // Update the comment in script_feed.
                                    script_feed[0].comments[commentIndex].liked = true;
                                    script_feed[0].comments[commentIndex].likes++;
                                }
                                if (commentObject.unliked) {
                                    // Update the comment in script_feed.
                                    script_feed[0].comments[commentIndex].unliked = true;
                                    script_feed[0].comments[commentIndex].unlikes++;
                                }
                                // Check if there is a flag recorded for this comment.
                                if (commentObject.flagged) {
                                    script_feed[0].comments[commentIndex].flagged = true;
                                }
                            } else {
                                // Check if user conducted any actions on subcomments
                                script_feed[0].comments.forEach(function(comment, index) {
                                    const subcommentIndex = _.findIndex(comment.subcomments, function(o) { return o.id == commentObject.comment; });
                                    if (subcommentIndex != -1) {
                                        // Check if there is a like recorded for this subcomment.
                                        if (commentObject.liked) {
                                            // Update the comment in script_feed.
                                            script_feed[0].comments[index].subcomments[subcommentIndex].liked = true;
                                            script_feed[0].comments[index].subcomments[subcommentIndex].likes++;
                                        }
                                        if (commentObject.unliked) {
                                            // Update the subcomment in script_feed.
                                            script_feed[0].comments[index].subcomments[subcommentIndex].unliked = true;
                                            script_feed[0].comments[index].subcomments[subcommentIndex].unlikes++;
                                        }
                                        // Check if there is a flag recorded for this subcomment.
                                        if (commentObject.flagged) {
                                            script_feed[0].comments[index].subcomments[subcommentIndex].flagged = true;
                                        }
                                    }
                                })
                            }
                        }
                    }
                }
                script_feed[0].comments.sort(function(a, b) {
                    return b.time - a.time; // in descending order.
                });

                for (const [key, value] of Object.entries(replyDictionary)) {
                    const commentIndex = _.findIndex(script_feed[0].comments, function(o) { return o.commentID == key; });
                    script_feed[0].comments[commentIndex]["subcomments"] =
                        script_feed[0].comments[commentIndex]["subcomments"].concat(value)
                        .sort(function(a, b) {
                            return a.time - b.time; // in descending order.
                        });
                }

                // Check if there is a like recorded for this post.
                if (user.feedAction[feedIndex].liked) {
                    script_feed[0].like = true;
                    script_feed[0].likes++;
                }
                // Check if there is a unlike recorded for this post. 
                if (user.feedAction[feedIndex].unliked) {
                    script_feed[0].unlike = true;
                    script_feed[0].unlikes++;
                }
                //Check if there is a flag recorded for this post.
                if (user.feedAction[feedIndex].flagged) {
                    script_feed[0].flag = true;
                }

                finalfeed.push(script_feed[0]);
                script_feed.splice(0, 1);
            } //user did not interact with this post
            else {
                script_feed[0].comments.sort(function(a, b) {
                    return b.time - a.time;
                });
                finalfeed.push(script_feed[0]);
                script_feed.splice(0, 1);
            }
        }
        await user.save();
        //sort the feed
        finalfeed.sort(function(a, b) {
            return a.postID - b.postID;
        });
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