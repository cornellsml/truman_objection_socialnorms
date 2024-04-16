const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const Script = require('./models/Script.js');
const User = require('./models/User.js');
const Actor = require('./models/Actor.js');
const mongoose = require('mongoose');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Console.log color shortcuts
const color_start = '\x1b[33m%s\x1b[0m'; // yellow
const color_success = '\x1b[32m%s\x1b[0m'; // green
const color_error = '\x1b[31m%s\x1b[0m'; // red

// establish initial Mongoose connection, if Research Site
mongoose.connect(process.env.MONGOLAB_URI, { useNewUrlParser: true });
// listen for errors after establishing initial connection
db = mongoose.connection;
db.on('error', (err) => {
    console.error(err);
    console.log(color_error, '%s MongoDB connection error.');
    process.exit(1);
});
console.log(color_success, `Successfully connected to db.`);

/*
  Gets the user models from the database specified in the .env file.
*/
async function getUserJsons() {
    const users = await User
        .find({ isAdmin: false })
        .populate('feedAction.post')
        .exec();
    return users;
}

/*
  Gets the mongoDB object id value of the first offense message.
*/
async function getOffenseOneId(interest) {
    const videoIndexes = {
        'Science': 1,
        'Education': 6,
        'Lifestyle': 11
    };

    const videoObj = await Script
        .find({ class: interest, postID: videoIndexes[interest] })
        .exec();

    let offenseObj = videoObj[0].comments.find(comment => comment.class == 'offense');

    return offenseObj.id;
}

/*
  Gets the mongoDB object id value of the second offense message.
*/
async function getOffenseTwoId(interest) {
    const videoIndexes = {
        'Science': 3,
        'Education': 8,
        'Lifestyle': 13
    };

    const commentIDs = {
        'Science': 25,
        'Education': 55,
        'Lifestyle': 85
    }

    const videoObj = await Script
        .find({ class: interest, postID: videoIndexes[interest] })
        .exec();

    let offenseObj = videoObj[0].comments.find(comment => comment.commentID == commentIDs[interest]);

    return offenseObj.id;
}

/*
  Gets the mongoDB object id value of the first objection message.
*/
async function getObjectionOneId(experimentalCondition, interest) {
    const msgs = experimentalCondition.split("&");
    const videoIndexes = {
        'Science': 1,
        'Education': 6,
        'Lifestyle': 11
    };

    const videoObj = await Script
        .find({ class: interest, postID: videoIndexes[interest] })
        .exec();

    let objectionObj = videoObj[0].comments.find(comment => comment.class == 'offense');
    objectionObj = objectionObj.subcomments.find(subcomment => subcomment.class == ("obj1=" + msgs[0]));

    return objectionObj.id;
}

/*
  Gets the mongoDB object id value of the second objection message. Returns a null value only if user does not receive a second.
*/
async function getObjectionTwoId(experimentalCondition, interest) {
    const msgs = experimentalCondition.split("&");
    if (msgs.length == 1) {
        return null;
    }
    const videoIndexes = {
        'Science': 1,
        'Education': 6,
        'Lifestyle': 11
    };

    const videoObj = await Script
        .find({ class: interest, postID: videoIndexes[interest] })
        .exec();

    let objectionObj = videoObj[0].comments.find(comment => comment.class == 'offense');
    objectionObj = objectionObj.subcomments.find(subcomment => subcomment.class == ("obj2=" + msgs[1]));

    return objectionObj.id;
}

async function getDataExport() {
    const users = await getUserJsons();

    console.log(color_start, `Starting the data export script...`);
    const currentDate = new Date();
    const outputFilename =
        `truman_Objections-formal-followup-dataExport` +
        `.${currentDate.getMonth()+1}-${currentDate.getDate()}-${currentDate.getFullYear()}` +
        `.${currentDate.getHours()}-${currentDate.getMinutes()}-${currentDate.getSeconds()}`;
    const outputFilepath = `./outputFiles/formal-followup_study/${outputFilename}.csv`;
    const csvWriter_header = [
        { id: 'id', title: "Qualtrics ID" },
        { id: 'username', title: "Username" },
        { id: 'Topic', title: 'Topic' },
        { id: 'Condition', title: 'Condition' },
        { id: 'CompletedStudy', title: 'CompletedStudy' },
        { id: 'NumberVideoCompleted', title: 'NumberVideoCompleted' },
        { id: 'V2_Completed', title: 'V2_Completed' },
        { id: 'V4_Completed', title: 'V4_Completed' },
        { id: 'GeneralTimeSpent', title: 'GeneralTimeSpent' },
        // { id: 'V1_timespent', title: 'V1_timespent' },
        // { id: 'V2_timespent', title: 'V2_timespent' },
        // { id: 'V3_timespent', title: 'V3_timespent' },
        // { id: 'V4_timespent', title: 'V4_timespent' },
        // { id: 'V5_timespent', title: 'V5_timespent' },
        // { id: 'AvgTimeVideo', title: 'AvgTimeVideo' },
        { id: 'PageLog', title: 'PageLog' },
        { id: 'VideoUpvoteNumber', title: 'VideoUpvoteNumber' },
        { id: 'VideoDownvoteNumber', title: 'VideoDownvoteNumber' },
        { id: 'VideoFlagNumber', title: 'VideoFlagNumber' },
        { id: 'CommentUpvoteNumber', title: 'CommentUpvoteNumber' },
        { id: 'V1_CommentUpvoteNumber', title: 'V1_CommentUpvoteNumber' },
        { id: 'V2_CommentUpvoteNumber', title: 'V2_CommentUpvoteNumber' },
        { id: 'V3_CommentUpvoteNumber', title: 'V3_CommentUpvoteNumber' },
        { id: 'V4_CommentUpvoteNumber', title: 'V4_CommentUpvoteNumber' },
        { id: 'V5_CommentUpvoteNumber', title: 'V5_CommentUpvoteNumber' },
        { id: 'CommentDownvoteNumber', title: 'CommentDownvoteNumber' },
        { id: 'V1_CommentDownvoteNumber', title: 'V1_CommentDownvoteNumber' },
        { id: 'V2_CommentDownvoteNumber', title: 'V2_CommentDownvoteNumber' },
        { id: 'V3_CommentDownvoteNumber', title: 'V3_CommentDownvoteNumber' },
        { id: 'V4_CommentDownvoteNumber', title: 'V4_CommentDownvoteNumber' },
        { id: 'V5_CommentDownvoteNumber', title: 'V5_CommentDownvoteNumber' },
        { id: 'CommentFlagNumber', title: 'CommentFlagNumber' },
        { id: 'V1_CommentFlagNumber', title: 'V1_CommentFlagNumber' },
        { id: 'V2_CommentFlagNumber', title: 'V2_CommentFlagNumber' },
        { id: 'V3_CommentFlagNumber', title: 'V3_CommentFlagNumber' },
        { id: 'V4_CommentFlagNumber', title: 'V4_CommentFlagNumber' },
        { id: 'V5_CommentFlagNumber', title: 'V5_CommentFlagNumber' },
        { id: 'GeneralPostComments', title: 'GeneralPostComments' },
        { id: 'V1_PostComments', title: 'V1_PostComments' },
        { id: 'V2_PostComments', title: 'V2_PostComments' },
        { id: 'V3_PostComments', title: 'V3_PostComments' },
        { id: 'V4_PostComments', title: 'V4_PostComments' },
        { id: 'V5_PostComments', title: 'V5_PostComments' },
        { id: 'Off1_Appear', title: 'Off1_Appear' },
        { id: 'Off1_Upvote', title: 'Off1_Upvote' },
        { id: 'Off1_Downvote', title: 'Off1_Downvote' },
        { id: 'Off1_Flag', title: 'Off1_Flag' },
        { id: 'Off1_Reply', title: 'Off1_Reply' },
        { id: 'Off1_ReplyBody', title: 'Off1_ReplyBody' },
        { id: 'Obj1_Appear', title: 'Obj1_Appear' },
        { id: 'Obj1_Upvote', title: 'Obj1_Upvote' },
        { id: 'Obj1_Downvote', title: 'Obj1_Downvote' },
        { id: 'Obj1_Flag', title: 'Obj1_Flag' },
        { id: 'Obj1_Reply', title: 'Obj1_Reply' },
        { id: 'Obj1_ReplyBody', title: 'Obj1_ReplyBody' },
        { id: 'Obj2_Appear', title: 'Obj2_Appear' },
        { id: 'Obj2_Upvote', title: 'Obj2_Upvote' },
        { id: 'Obj2_Downvote', title: 'Obj2_Downvote' },
        { id: 'Obj2_Flag', title: 'Obj2_Flag' },
        { id: 'Obj2_Reply', title: 'Obj2_Reply' },
        { id: 'Obj2_ReplyBody', title: 'Obj2_ReplyBody' },
        { id: 'V2_CommentBody', title: 'V2_CommentBody' },
        { id: 'Off2_Appear', title: 'Off2_Appear' },
        { id: 'Off2_Upvote', title: 'Off2_Upvote' },
        { id: 'Off2_Downvote', title: 'Off2_Downvote' },
        { id: 'Off2_Flag', title: 'Off2_Flag' },
        { id: 'Off2_Reply', title: 'Off2_Reply' },
        { id: 'Off2_ReplyBody', title: 'Off2_ReplyBody' },
        { id: 'V4_CommentBody', title: 'V4_CommentBody' },
    ];
    const csvWriter = createCsvWriter({
        path: outputFilepath,
        header: csvWriter_header
    });
    const records = [];
    // For each user
    for (const user of users) {
        const record = {}; // Record for the user
        record.id = user.mturkID;
        record.username = user.username;
        record.Topic = user.interest;
        record.Condition = user.group;
        if (!user.consent) {
            record.CompletedStudy = false;
            record.NumberVideoCompleted = 0;
            records.push(record);
            continue;
        }

        const offenseOneId = await getOffenseOneId(user.interest);
        const offenseTwoId = await getOffenseTwoId(user.interest);
        const objectionOneId = await getObjectionOneId(user.group, user.interest);
        const objectionTwoId = await getObjectionTwoId(user.group, user.interest);

        let NumberVideoCompleted = 0;
        let VideoUpvoteNumber = 0;
        let VideoDownvoteNumber = 0;
        let VideoFlagNumber = 0;

        // For each video (feedAction)
        for (const feedAction of user.feedAction) {
            if (feedAction.post.class != user.interest) {
                continue;
            }
            const video = (feedAction.post.postID % 5) + 1; //1, 2, 3, 4, 5
            const video_length = feedAction.post.length;
            if (feedAction.liked) {
                VideoUpvoteNumber++;
            }
            if (feedAction.unliked) {
                VideoDownvoteNumber++;
            }
            if (feedAction.flagged) {
                VideoFlagNumber++;
            }

            for (const element of feedAction.videoDuration) {
                if (element.find(vidDuration => vidDuration.startTime == 0 && vidDuration.endTime >= Math.floor(video_length * 100000) / 100000)) {
                    NumberVideoCompleted++;
                    if (video == 2) {
                        record.V2_Completed = true;
                    }
                    if (video == 4) {
                        record.V4_Completed = true;
                    }
                    break;
                }
            }

            const generalComments =
                feedAction.comments.filter(comment => objectionTwoId != null ?
                    !comment.new_comment &&
                    comment.comment.toString() != offenseOneId &&
                    comment.comment.toString() != objectionOneId &&
                    comment.comment.toString() != offenseTwoId :
                    !comment.new_comment &&
                    comment.comment.toString() != offenseOneId &&
                    comment.comment.toString() != objectionOneId &&
                    comment.comment.toString() != objectionTwoId &&
                    comment.comment.toString() != offenseTwoId);

            const numLikes = generalComments.filter(comment => comment.liked).length;
            const numDislikes = generalComments.filter(comment => comment.unliked).length;
            const numFlagged = generalComments.filter(comment => comment.flagged).length;
            const newComments = feedAction.comments.filter(comment =>
                comment.new_comment &&
                !(comment.reply_to >= 7 && comment.reply_to <= 17) &&
                (comment.reply_to != 25) &&
                !(comment.reply_to >= 37 && comment.reply_to <= 47) &&
                (comment.reply_to != 55) &&
                !(comment.reply_to >= 67 && comment.reply_to <= 77) &&
                (comment.reply_to != 85));
            const numNewComments = newComments.length;

            record[`V${video}_CommentUpvoteNumber`] = numLikes;
            record[`V${video}_CommentDownvoteNumber`] = numDislikes;
            record[`V${video}_CommentFlagNumber`] = numFlagged;
            record[`V${video}_PostComments`] = numNewComments;

            if (video == 2) {
                // Offense 1
                const off1Obj = feedAction.comments.find(comment => !comment.new_comment && comment.comment.toString() == offenseOneId);
                record.Off1_Upvote = (off1Obj != undefined) ? off1Obj.liked : false;
                record.Off1_Downvote = (off1Obj != undefined) ? off1Obj.unliked : false;
                record.Off1_Flag = (off1Obj != undefined) ? off1Obj.flagged : false;

                const replyToOffense = feedAction.comments.filter(comment => [7, 37, 67].includes(comment.reply_to));
                if (replyToOffense.length != 0) {
                    let string = "";
                    replyToOffense.forEach(comment => { string += comment.new_comment_id + (comment.reply_to ? " (is a reply to " + comment.reply_to + ")" : "") + ": " + comment.body + "\r\n" });
                    record.Off1_ReplyBody = string;
                    record.Off1_Reply = true;
                } else {
                    record.Off1_Reply = false;
                }

                // Objection 1
                const obj1Obj = feedAction.comments.find(comment => !comment.new_comment && comment.comment.toString() == objectionOneId);
                record.Obj1_Upvote = (obj1Obj != undefined) ? obj1Obj.liked : false;
                record.Obj1_Downvote = (obj1Obj != undefined) ? obj1Obj.unliked : false;
                record.Obj1_Flag = (obj1Obj != undefined) ? obj1Obj.flagged : false;

                const replyToObj1 = feedAction.comments.filter(comment =>
                    (comment.reply_to >= 8 && comment.reply_to <= 13) ||
                    (comment.reply_to >= 38 && comment.reply_to <= 43) ||
                    (comment.reply_to >= 68 && comment.reply_to <= 73));
                if (replyToObj1.length != 0) {
                    let string = "";
                    replyToObj1.forEach(comment => { string += comment.new_comment_id + (comment.reply_to ? " (is a reply to " + comment.reply_to + ")" : "") + ": " + comment.body + "\r\n" });
                    record.Obj1_ReplyBody = string;
                    record.Obj1_Reply = true;
                } else {
                    record.Obj1_Reply = false;
                }

                // Objection 2
                if (objectionTwoId) {
                    const obj2Obj = feedAction.comments.find(comment => !comment.new_comment && comment.comment.toString() == objectionTwoId);
                    record.Obj2_Upvote = (obj2Obj != undefined) ? obj2Obj.liked : false;
                    record.Obj2_Downvote = (obj2Obj != undefined) ? obj2Obj.unliked : false;
                    record.Obj2_Flag = (obj2Obj != undefined) ? obj2Obj.flagged : false;

                    const replyToObj2 = feedAction.comments.filter(comment =>
                        (comment.reply_to >= 14 && comment.reply_to <= 17) ||
                        (comment.reply_to >= 44 && comment.reply_to <= 47) ||
                        (comment.reply_to >= 74 && comment.reply_to <= 77));
                    if (replyToObj2.length != 0) {
                        let string = "";
                        replyToObj2.forEach(comment => { string += comment.new_comment_id + (comment.reply_to ? " (is a reply to " + comment.reply_to + ")" : "") + ": " + comment.body + "\r\n" });
                        record.Obj2_ReplyBody = string;
                        record.Obj2_Reply = true;
                    } else {
                        record.Obj2_Reply = false;
                    }
                }

                let string = "";
                newComments.forEach(comment => { string += comment.new_comment_id + (comment.reply_to ? " (is a reply to " + comment.reply_to + ")" : "") + ": " + comment.body + "\r\n" });
                record.V2_CommentBody = string;
            }

            if (video == 4) {
                // Offense 2
                const off2Obj = feedAction.comments.find(comment => !comment.new_comment && comment.comment.toString() == offenseTwoId);
                record.Off2_Upvote = (off2Obj != undefined) ? off2Obj.liked : false;
                record.Off2_Downvote = (off2Obj != undefined) ? off2Obj.unliked : false;
                record.Off2_Flag = (off2Obj != undefined) ? off2Obj.flagged : false;

                const replyToOffense = feedAction.comments.filter(comment => [7, 37, 67].includes(comment.reply_to));
                if (replyToOffense.length != 0) {
                    let string = "";
                    replyToOffense.forEach(comment => { string += comment.new_comment_id + (comment.reply_to ? " (is a reply to " + comment.reply_to + ")" : "") + ": " + comment.body + "\r\n" });
                    record.Off2_ReplyBody = string;
                    record.Off2_Reply = true;
                } else {
                    record.Off2_Reply = false;
                }

                let string = "";
                newComments.forEach(comment => { string += comment.new_comment_id + (comment.reply_to ? " (is a reply to " + comment.reply_to + ")" : "") + ": " + comment.body + "\r\n" });
                record.V4_CommentBody = string;
            }
        }

        let string = "";
        user.pageLog.forEach(page => { string += page.page + "\r\n" });
        record.PageLog = string;

        record.CompletedStudy = (NumberVideoCompleted == 5) ? true : false;
        record.NumberVideoCompleted = NumberVideoCompleted;
        record.VideoUpvoteNumber = VideoUpvoteNumber;
        record.VideoDownvoteNumber = VideoDownvoteNumber;
        record.VideoFlagNumber = VideoFlagNumber;

        record.CommentUpvoteNumber =
            (record.V1_CommentUpvoteNumber || 0) +
            (record.V2_CommentUpvoteNumber || 0) +
            (record.V3_CommentUpvoteNumber || 0) +
            (record.V4_CommentUpvoteNumber || 0) +
            (record.V5_CommentUpvoteNumber || 0);

        record.CommentDownvoteNumber =
            (record.V1_CommentDownvoteNumber || 0) +
            (record.V2_CommentDownvoteNumber || 0) +
            (record.V3_CommentDownvoteNumber || 0) +
            (record.V4_CommentDownvoteNumber || 0) +
            (record.V5_CommentDownvoteNumber || 0);

        record.CommentFlagNumber =
            (record.V1_CommentFlagNumber || 0) +
            (record.V2_CommentFlagNumber || 0) +
            (record.V3_CommentFlagNumber || 0) +
            (record.V4_CommentFlagNumber || 0) +
            (record.V5_CommentFlagNumber || 0);

        record.GeneralPostComments =
            (record.V1_PostComments || 0) +
            (record.V2_PostComments || 0) +
            (record.V3_PostComments || 0) +
            (record.V4_PostComments || 0) +
            (record.V5_PostComments || 0);


        record.Off1_Appear = user.offense1Message_Seen.seen;
        record.Obj1_Appear = user.objection1Message_Seen.seen;
        record.Obj2_Appear = user.objection2Message_Seen.seen;
        record.Off2_Appear = user.offense2Message_Seen.seen;

        // let pageTimes = {
        //     1: 0,
        //     2: 0,
        //     3: 0,
        //     4: 0,
        //     5: 0
        // }
        let sumOnSite = 0;
        for (const pageLog of user.pageTimes) {
            // Begin at v=1, v=2, v=3, v=4, v=5
            // if (pageLog.page.startsWith("/?v=")) {
            //     let page = parseInt((pageLog.page.replace(/\D/g, '') % 5));
            //     if (page == 0) {
            //         page = 5;
            //     }
            //     console.log(pageLog);
            //     console.log(page);
            //     pageTimes[page] = pageTimes[page] + pageLog.time;
            // }
            sumOnSite += pageLog.time;
        }
        record.GeneralTimeSpent = sumOnSite / 1000;

        // let sumOnVideos = 0;
        // let numVideos = 0;
        // for (let key in pageTimes) {
        //     if (pageTimes[key] > 1500) {
        //         numVideos++;
        //         sumOnVideos += pageTimes[key];
        //     }
        //     record[`V${key}_timespent`] = pageTimes[key] / 1000;
        // }

        // record.AvgTimeVideo = (sumOnVideos / 1000) / numVideos;
        // console.log(record);
        records.push(record);
    }

    await csvWriter.writeRecords(records);
    console.log(color_success, `...Data export completed.\nFile exported to: ${outputFilepath} with ${records.length} records.`);
    console.log(color_success, `...Finished reading from the db.`);
    db.close();
    console.log(color_start, 'Closed db connection.');
}

getDataExport();