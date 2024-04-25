const _ = require('lodash');

/**
 * This is a helper function. It takes in a list of posts and a User document. 
 * Function processes and returns a final feed of posts that accounts for the user's interactions with posts.
 * Parameters: 
 *  - script_feed: list of posts, typically from a call to the database: Script.find(...)
 *  - user: a User document
 * Returns: 
 *  - finalfeed: the processed final feed of posts for the user
 */
exports.getFeed = async function(script_feed, user) {
    // Final array of all posts to go in the feed
    let finalfeed = [];

    // While there are regular posts to add to the final feed
    while (script_feed.length) {
        let replyDictionary = {}; // where Key = parent comment reply falls under, value = the list of comment objects

        // Looking at the post in script_feed[0] now.
        // For this post, check if there is a user feedAction matching this post's ID and get its index.
        const feedIndex = _.findIndex(user.feedAction, function(o) { return o.post == script_feed[0].id; });

        if (feedIndex != -1) {
            // User performed an action with this post
            // Check to see if there are comment-type actions.
            if (Array.isArray(user.feedAction[feedIndex].comments) && user.feedAction[feedIndex].comments) {
                // There are comment-type actions on this post.
                // For each comment on this post, add likes, flags, etc.
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
            // Check if there is a flag recorded for this post.
            if (user.feedAction[feedIndex].flagged) {
                script_feed[0].flag = true;
            }

            finalfeed.push(script_feed[0]);
            script_feed.splice(0, 1);
        } // user did not interact with this post
        else {
            script_feed[0].comments.sort(function(a, b) {
                return b.time - a.time;
            });
            finalfeed.push(script_feed[0]);
            script_feed.splice(0, 1);
        }
    }
    finalfeed.sort(function(a, b) {
        return a.postID - b.postID;
    });

    console.log(finalfeed);
    return finalfeed;
}