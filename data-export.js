const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const Script = require('./models/Script.js');
const User = require('./models/User.js');
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
  Gets the mongoDB object id value of the offense message.
*/
async function getOffenseId(interest) {
    const videoIndexes = {
        'Science': 8,
        'Education': 17,
        'Lifestyle': 26
    };

    const commentIDs = {
        'Science': 29,
        'Education': 61,
        'Lifestyle': 93
    }

    const videoObj = await Script
        .find({ class: interest, postID: videoIndexes[interest] })
        .exec();

    let offenseObj = videoObj[0].comments.find(comment => comment.commentID == commentIDs[interest]);
    return offenseObj.id;
}

async function getDataExport() {
    const users = await getUserJsons();

    console.log(color_start, `Starting the data export script...`);
    const currentDate = new Date();
    const outputFilename =
        `truman_Objections-SocialNorms-preTest-dataExport` +
        `.${currentDate.getMonth()+1}-${currentDate.getDate()}-${currentDate.getFullYear()}` +
        `.${currentDate.getHours()}-${currentDate.getMinutes()}-${currentDate.getSeconds()}`;
    const outputFilepath = `./outputFiles/pretest/${outputFilename}.csv`;
    const csvWriter_header = [
        { id: 'id', title: "Qualtrics ID" },
        { id: 'username', title: "Username" },
        { id: 'Topic', title: 'Topic' },
        { id: 'Condition', title: 'Condition' },
        { id: 'GeneralTimeSpent', title: 'GeneralTimeSpent (in sec)' },
        { id: 'V1_timespent', title: 'V1_timespent (in sec)' },
        { id: 'V2_timespent', title: 'V2_timespent (in sec)' },
        { id: 'V3_timespent', title: 'V3_timespent (in sec)' },
        { id: 'V4_timespent', title: 'V4_timespent (in sec)' },
        { id: 'V5_timespent', title: 'V5_timespent (in sec)' },
        { id: 'V6_timespent', title: 'V6_timespent (in sec)' },
        { id: 'V7_timespent', title: 'V7_timespent (in sec)' },
        { id: 'V8_timespent', title: 'V8_timespent (in sec)' },
        { id: 'V9_timespent', title: 'V9_timespent (in sec)' },
        { id: 'AvgTimeVideo', title: 'AvgTimeVideo (in sec)' },
        { id: 'PageLog', title: 'PageLog' },
        { id: 'NumVideosCompleted_Tutorial', title: 'NumVideosCompleted_Tutorial' },
        { id: 'NumVideosCompleted_Behavioral', title: 'NumVideosCompleted_Behavioral' },
        { id: '#Off_appear', title: '#Off_appear' },
        { id: '#Obj_appear', title: '#Obj_appear' },
        { id: 'VideoUpvoteNumber', title: 'VideoUpvoteNumber' },
        { id: 'VideoDownvoteNumber', title: 'VideoDownvoteNumber' },
        { id: 'VideoFlagNumber', title: 'VideoFlagNumber' },
        { id: 'CommentUpvoteNumber', title: 'CommentUpvoteNumber (excluding stimuli msg)' },
        { id: 'V7_CommentUpvoteNumber', title: 'V7_CommentUpvoteNumber' },
        { id: 'V8_CommentUpvoteNumber', title: 'V8_CommentUpvoteNumber' },
        { id: 'V9_CommentUpvoteNumber', title: 'V9_CommentUpvoteNumber' },
        { id: 'CommentDownvoteNumber', title: 'CommentDownvoteNumber (excluding stimuli msg)' },
        { id: 'V7_CommentDownvoteNumber', title: 'V7_CommentDownvoteNumber' },
        { id: 'V8_CommentDownvoteNumber', title: 'V8_CommentDownvoteNumber' },
        { id: 'V9_CommentDownvoteNumber', title: 'V9_CommentDownvoteNumber' },
        { id: 'CommentFlagNumber', title: 'CommentFlagNumber (excluding stimuli msg)' },
        { id: 'V7_CommentFlagNumber', title: 'V7_CommentFlagNumber' },
        { id: 'V8_CommentFlagNumber', title: 'V8_CommentFlagNumber' },
        { id: 'V9_CommentFlagNumber', title: 'V9_CommentFlagNumber' },
        { id: 'GeneralPostComments', title: 'GeneralPostComments (excluding replies to the stimuli msg)' },
        { id: 'V7_PostComments', title: 'V7_PostComments' },
        { id: 'V8_PostComments', title: 'V8_PostComments' },
        { id: 'V9_PostComments', title: 'V9_PostComments' },
        { id: 'Off7_Appear', title: 'Off7_Appear' },
        { id: 'Off7_Upvote', title: 'Off7_Upvote' },
        { id: 'Off7_Downvote', title: 'Off7_Downvote' },
        { id: 'Off7_Flag', title: 'Off7_Flag' },
        { id: 'Off7_Reply', title: 'Off7_Reply' },
        { id: 'Off7_ReplyBody', title: 'Off7_ReplyBody' },
        { id: 'V9_CommentBody', title: 'V9_CommentBody' },
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
            record.NumberVideoCompleted = 0;
            records.push(record);
            continue;
        }

        // Extract time spent on the website
        let sumOnSite = 0;
        let pageTimes = {};
        for (const pageLog of user.pageTimes) {
            // Begin at v = 0, 1, 2, 3, 4, 5, 6, 7, 8
            if (pageLog.page.startsWith("/?v=") || pageLog.page.startsWith("/tutorial?v=")) {
                let page = parseInt((pageLog.page.replace(/\D/g, '') % 9) + 1);
                pageTimes[page] = (pageTimes[page] || 0) + pageLog.time;
            }
            sumOnSite += pageLog.time;
        }
        record.GeneralTimeSpent = sumOnSite / 1000;

        let sumOnVideos = 0;
        let numVideos = 0;
        for (let key in pageTimes) {
            if (pageTimes[key] > 1500) {
                numVideos++;
                sumOnVideos += pageTimes[key];
            }
            record[`V${key}_timespent`] = pageTimes[key] / 1000;
        }

        record.AvgTimeVideo = (sumOnVideos / 1000) / numVideos;

        // How many offense & objection messages did the user see? 
        let offenseMessagesSeen = 0;
        for (let key in user.offenseMessagesSeen) {
            if (user.offenseMessagesSeen[key]["seen"] && key != "offense7") {
                offenseMessagesSeen++;
            }
        }
        record["#Off_appear"] = offenseMessagesSeen;

        let objectionMessagesSeen = 0;
        for (let key in user.objectionMessagesSeen) {
            if (user.objectionMessagesSeen[key]["seen"]) {
                objectionMessagesSeen++;
            }
        }
        record["#Obj_appear"] = objectionMessagesSeen;

        let NumVideosCompleted_Tutorial = 0;
        let NumVideosCompleted_Behavioral = 0;

        let VideoUpvoteNumber = 0;
        let VideoDownvoteNumber = 0;
        let VideoFlagNumber = 0;

        let CommentUpvoteNumber = 0;
        let CommentDownvoteNumber = 0;
        let CommentFlagNumber = 0;
        let GeneralPostComments = 0;

        const offenseId = await getOffenseId(user.interest);

        // For each video (feedAction)
        for (const feedAction of user.feedAction) {
            if (!feedAction.post.class.startsWith(user.interest)) {
                continue;
            }
            const video = (feedAction.post.postID % 9) + 1; // 1, 2, 3, 4, 5, 6, 7, 8, 9
            const video_length = feedAction.post.length;
            const section = video <= 6 ? "Tutorial" : "Behavioral";

            for (const element of feedAction.videoDuration) {
                if (element.find(vidDuration => vidDuration.startTime == 0 && vidDuration.endTime >= video_length - 1)) {
                    if (section == "Tutorial") {
                        NumVideosCompleted_Tutorial++;
                    } else {
                        NumVideosCompleted_Behavioral++;
                    }
                    break;
                }
            }

            if (section == "Behavioral") {
                if (feedAction.liked) {
                    VideoUpvoteNumber++;
                }
                if (feedAction.unliked) {
                    VideoDownvoteNumber++;
                }
                if (feedAction.flagged) {
                    VideoFlagNumber++;
                }
                const generalComments = user.interest != "None-True" ?
                    feedAction.comments.filter(comment =>
                        !comment.new_comment &&
                        comment.comment.toString() != offenseId) :
                    feedAction.comments.filter(comment =>
                        !comment.new_comment);

                const numLikes = generalComments.filter(comment => comment.liked).length;
                const numDislikes = generalComments.filter(comment => comment.unliked).length;
                const numFlagged = generalComments.filter(comment => comment.flagged).length;
                const newComments = user.interest != "None-True" ?
                    feedAction.comments.filter(comment =>
                        comment.new_comment &&
                        comment.reply_to != 29 &&
                        comment.reply_to != 61 &&
                        comment.reply_to != 93) :
                    feedAction.comments.filter(comment =>
                        comment.new_comment);
                const numNewComments = newComments.length;

                CommentUpvoteNumber += numLikes;
                CommentDownvoteNumber += numDislikes;
                CommentFlagNumber += numFlagged;
                GeneralPostComments += numNewComments;

                record[`V${video}_CommentUpvoteNumber`] = numLikes;
                record[`V${video}_CommentDownvoteNumber`] = numDislikes;
                record[`V${video}_CommentFlagNumber`] = numFlagged;
                record[`V${video}_PostComments`] = numNewComments;

                if (video == 9 && user.interest != "None-True") {
                    // Offense 
                    const offObj = feedAction.comments.find(comment => !comment.new_comment && comment.comment.toString() == offenseId);
                    record.Off7_Upvote = (offObj != undefined) ? offObj.liked : false;
                    record.Off7_Downvote = (offObj != undefined) ? offObj.unliked : false;
                    record.Off7_Flag = (offObj != undefined) ? offObj.flagged : false;

                    const replyToOffense = feedAction.comments.filter(comment => [29, 61, 93].includes(comment.reply_to));
                    if (replyToOffense.length != 0) {
                        let string = "";
                        replyToOffense.forEach(comment => { string += comment.new_comment_id + (comment.reply_to ? " (is a reply to " + comment.reply_to + ")" : "") + ": " + comment.body + "\r\n" });
                        record.Off7_ReplyBody = string;
                        record.Off7_Reply = true;
                    } else {
                        record.Off7_Reply = false;
                    }

                    record.Off7_Appear = user.offenseMessagesSeen.offense7.seen;

                    // Other comments
                    let string = "";
                    newComments.forEach(comment => { string += comment.new_comment_id + (comment.reply_to ? " (is a reply to " + comment.reply_to + ")" : "") + ": " + comment.body + "\r\n" });
                    record.V9_CommentBody = string;
                }
            }
        }

        let string = "";
        const newPageLog = user.pageLog.filter(page => page.page != "/tutorial");
        newPageLog.forEach(page => { string += page.page + "\r\n" });
        record.PageLog = string;

        record.NumVideosCompleted_Tutorial = NumVideosCompleted_Tutorial;
        record.NumVideosCompleted_Behavioral = NumVideosCompleted_Behavioral;
        record.VideoUpvoteNumber = VideoUpvoteNumber;
        record.VideoDownvoteNumber = VideoDownvoteNumber;
        record.VideoFlagNumber = VideoFlagNumber;
        record.CommentUpvoteNumber = CommentUpvoteNumber;
        record.CommentDownvoteNumber = CommentDownvoteNumber;
        record.CommentFlagNumber = CommentFlagNumber;
        record.GeneralPostComments = GeneralPostComments;

        console.log(record);
        records.push(record);
    }

    await csvWriter.writeRecords(records);
    console.log(color_success, `...Data export completed.\nFile exported to: ${outputFilepath} with ${records.length} records.`);
    console.log(color_success, `...Finished reading from the db.`);
    db.close();
    console.log(color_start, 'Closed db connection.');
}

getDataExport();