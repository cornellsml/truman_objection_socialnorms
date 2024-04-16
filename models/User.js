const bcrypt = require('@node-rs/bcrypt');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new mongoose.Schema({
    username: String,
    active: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },

    numComments: { type: Number, default: -1 }, // # of comments on posts (user and actor), it is used for indexing and commentID of uesr comments on posts (user and actor)

    createdAt: Date, // Absolute Time user was created
    consent: { type: Boolean, default: false }, //Indicates if user has proceeded through welcome signup pages

    mturkID: { type: String, unique: true },

    group: String, // [frequency of harassing comments]: [frequency of addressed harassment comments]

    harassmentOrder: [Number], // Values correspond to which harassment comment. Order of list indicates the order in which they appear.
    harassmentToObjectToOrder: [Number], // Values correspond to which harassment comment objection belongs to.
    objectionOrder: [Number], // Values correspond to which objection comment. 

    interest: String, //'Science', 'Lifestyle', 'Education'

    offenseMessagesSeen: {
        offense1: {
            seen: { type: Boolean, default: false },
            time: Date,
        },
        offense2: {
            seen: { type: Boolean, default: false },
            time: Date,
        },
        offense3: {
            seen: { type: Boolean, default: false },
            time: Date,
        },
        offense4: {
            seen: { type: Boolean, default: false },
            time: Date,
        },
        offense5: {
            seen: { type: Boolean, default: false },
            time: Date,
        },
        offense6: {
            seen: { type: Boolean, default: false },
            time: Date,
        },
        offense7: {
            seen: { type: Boolean, default: false },
            time: Date,
        }
    },

    objectionMessagesSeen: {
        objection1: {
            seen: { type: Boolean, default: false },
            time: Date,
        },
        objection2: {
            seen: { type: Boolean, default: false },
            time: Date,
        },
        objection3: {
            seen: { type: Boolean, default: false },
            time: Date,
        },
        objection4: {
            seen: { type: Boolean, default: false },
            time: Date,
        }
    },

    log: [new Schema({ //Logins
        time: Date,
        userAgent: String,
        ipAddress: String
    })],

    pageLog: [new Schema({ //Page visits
        time: Date,
        page: String //URL
    })],

    pageTimes: [new Schema({ //how much time the user spent on a page
        //values are added when page (page or video) changes, when user is inactive for 1 minute, or when user logs out
        time: Number, //in millliseconds
        page: String //URL
    })],

    postStats: {
        SiteVisits: Number, //Total number of times the user has logged into the website
        Day1_visit: Number, //Number of times the user has logged into the website on Day 1
        Day2_visit: Number, //Number of times the user has logged into the website on Day 2
        GeneralTimeSpent: Number, //Time spent on website
        Day1_timespent: Number, //Time spent on website on Day 1
        Day2_timespent: Number, //Time spent on website on Day 2
        GeneralPostNumber: Number, //# of posts made by user
        Day1_posts: Number, //# of posts made by user on Day 1
        Day2_posts: Number, //# of posts made by user on Day 2
        GeneralPostLikes: Number, //# of posts liked
        GeneralCommentLikes: Number, //# of likes on comments
        GeneralPostComments: Number, //# of comments left on normal posts
    },

    feedAction: [new Schema({
        post: { type: Schema.ObjectId, ref: 'Script' },

        liked: { type: Boolean, default: false }, //has the user liked it?
        unliked: { type: Boolean, default: false }, //has the user disliked it?
        flagged: { type: Boolean, default: false }, // has the user flagged it?
        shared: { type: Boolean, default: false }, //has the user shared it?
        likeTime: [Date], //absoluteTimes of times user has liked the post
        unlikeTime: [Date], //absoluteTimes of times user has unliked the post
        flagTime: [Date], //absoluteTimes of times user has flagged the post
        shareTime: [Date], //absoluteTimes of times user has shared the post
        // readTime: [Number], //in milliseconds, how long the user spent looking at the post (we do not record times less than 1.5 seconds and more than 24 hrs)

        videoAction: [{
            action: String, //Type of action (play, pause, seeking, seeked, volumeChange, ended) https: //developer.mozilla.org/en-US/docs/Web/HTML/Element/video#events
            absTime: Date, //Exact time action was taken
            videoTime: Number, //in milliseconds (play: time in video they clicked play, pause: time in video they clicked pause, seeking + seeked: time in video they seeked to)
            volume: Number //number from 0-1, indicating new volume.
        }],

        videoDuration: [
            [{
                startTime: Number,
                endTime: Number
            }]
        ],

        comments: [new Schema({
            comment: { type: Schema.ObjectId }, //ID Reference for Script post comment
            liked: { type: Boolean, default: false }, //has the user liked it?
            unliked: { type: Boolean, default: false }, //has the user unliked it?
            flagged: { type: Boolean, default: false }, //has the user flagged it?
            shared: { type: Boolean, default: false }, //has the user shared it?
            likeTime: [Date], //absoluteTimes of times user has liked the comment
            unlikeTime: [Date], //absoluteTimes of times user has unliked the comment
            flagTime: [Date], //absoluteTimes of times user has flagged the comment
            shareTime: [Date], //absoluteTimes of times user has shared the comment
            new_comment: { type: Boolean, default: false }, //is this a comment from user?
            new_comment_id: Number, //ID for comment, begins at 90
            reply_to: Number, // CommentID/index if comment is a reply
            parent_comment: Number, //CommentID/index of parent comment (used for identifying subcommenting)
            body: String, //Body of comment
            absTime: Date, //Exact time comment was made
            relativeTime: Number, //in milliseconds, relative time comment was made to when the user created their account
            videoTime: Number, //in milliseconds, for new comments, indicates when comment was made
        }, { _id: true, versionKey: false })]
    }, { _id: true, versionKey: false })],

    profile: {
        name: String,
        location: String,
        bio: String,
        color: String,
        picture: String
    }
}, { timestamps: true, versionKey: false });

/**
 * Password hash middleware.
 */
userSchema.pre('save', async function save(next) {
    const user = this;
    if (!user.isModified('password')) { return next(); }
    try {
        user.password = await bcrypt.hash(user.password, 10);
        next();
    } catch (err) {
        next(err);
    }
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = async function comparePassword(candidatePassword, cb) {
    try {
        cb(null, await bcrypt.verify(candidatePassword, this.password));
    } catch (err) {
        cb(err);
    }
};

/**
 * Add login instance to user.log
 */
userSchema.methods.logUser = async function logUser(time, agent, ip) {
    try {
        this.log.push({
            time: time,
            userAgent: agent,
            ipAddress: ip
        });
        await this.save();
    } catch (err) {
        console.log(err);
    }
};

/**
 * Add page visit instance to user.pageLog
 */
userSchema.methods.logPage = async function logPage(time, page) {
    try {
        this.pageLog.push({
            time: time,
            page: page
        });
        await this.save();
    } catch (err) {
        console.log(err);
    }
};

/** 
 * Calculate stats: Basic user statistics (not comprehensive) 
 * Also displayed in /completed (Admin Dashboard) for admin accounts.
 */
userSchema.methods.logPostStats = function logPage() {
    const counts = this.feedAction.reduce(function(newCount, feedAction) {
            const numLikes = feedAction.comments.filter(comment => comment.liked && !comment.new_comment).length;
            const numNewComments = feedAction.comments.filter(comment => comment.new_comment).length;

            newCount[0] += numLikes;
            newCount[1] += numNewComments;
            return newCount;
        }, [0, 0], //[actorCommentLikes, newComments]
    );

    const log = {
        SiteVisits: this.log.length,
        GeneralTimeSpent: this.pageTimes.reduce((partialSum, a) => partialSum + a, 0),
        GeneralPostNumber: this.numPosts + 1,
        GeneralPostLikes: this.feedAction.filter(feedAction => feedAction.liked).length,
        GeneralCommentLikes: counts[0],
        GeneralPostComments: counts[1]
    }
    this.postStats = log;
};

/**
 * Helper method for getting all User Posts.
 */
userSchema.methods.getPosts = function getPosts() {
    let ret = this.posts;
    ret.sort(function(a, b) {
        return b.relativeTime - a.relativeTime;
    });
    for (const post of ret) {
        post.comments.sort(function(a, b) {
            return a.relativeTime - b.relativeTime;
        });
    }
    return ret;
};

// Return the user post from its ID
userSchema.methods.getUserPostByID = function(postID) {
    return this.posts.find(x => x.postID == postID);
};

// Get user posts within the min/max time period
userSchema.methods.getPostInPeriod = function(min, max) {
    return this.posts.filter(function(post) {
        return post.relativeTime >= min && post.relativeTime <= max;
    });
}

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function gravatar(size) {
    if (!size) {
        size = 200;
    }
    if (!this.email) {
        return `https://gravatar.com/avatar/?s=${size}&d=retro`;
    }
    const md5 = crypto.createHash('md5').update(this.email).digest('hex');
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

const User = mongoose.model('User', userSchema);
module.exports = User;