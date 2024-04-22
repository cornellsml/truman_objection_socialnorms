// JavaScript that handles functionalities related to script (newsfeed) videos 
$(window).on("load", function() {
    function showComment(commentElement) {
        if (!commentElement.is(":visible")) {
            if (commentElement.parent(".subcomments").length) {
                if (!commentElement.parent(".subcomments").is(":visible")) {
                    commentElement.parent(".subcomments").transition("fade up");
                }
            }
            commentElement.addClass("glowBorder", 1000).transition("fade up");
            commentElement[0].scrollIntoView({
                behavior: "smooth", // or "auto" or "instant"
                block: "start" // or "end"
            });
            setTimeout(function() {
                commentElement.removeClass("glowBorder", 1000);
            }, 2500);

            if (commentElement.attr("commentClass") && commentElement.attr("commentClass") != "R" &&
                !seenMessages[commentElement.attr("commentClass")]) {
                $.post("/messageSeen", {
                    type: commentElement.attr("commentClass"),
                    _csrf: $("meta[name='csrf-token']").attr("content")
                });
                seenMessages[commentElement.attr("commentClass")] = true;
            }
        }
    }

    const numVideos = $("video").length;
    const firstVideoIndex = parseInt($(`.ui.fluid.card:visible`).attr("index"));

    let seenMessages = {
        offense1: false,
        offense2: false,
        offense3: false,
        offense4: false,
        offense5: false,
        offense6: false,
        offense7: false,
        objection1: false,
        objection2: false,
        objection3: false,
        objection4: false
    }

    $.post("/pageLog", {
        path: window.location.pathname + `?v=${$(".ui.fluid.card:visible").attr("index")}`,
        _csrf: $("meta[name='csrf-token']").attr("content")
    });
    $(`.ui.fluid.card:visible video`)[0].play();

    $("video").on("timeupdate", function() {
        const post = $(this).parents(".ui.fluid.card");
        const postTimeStamps = JSON.parse(post.attr("postTimeStamps"));
        const postTimeStampsDictionary = JSON.parse(post.attr("postTimeStampsDict"));
        for (const timestamp of postTimeStamps) {
            if (this.currentTime * 1000 > timestamp) {
                const comments = postTimeStampsDictionary[timestamp];
                for (const comment of comments) {
                    const commentElement = $(`.comment[index=${comment}]`);
                    showComment(commentElement);
                }
            }
        };
    });

    $("video").on("ended", function() {
        const post = $(this).parents(".ui.fluid.card");
        const postID = post.attr("postID");

        // At the end of the video, ensure all the comments appear.
        for (const comment of post.find(".comment.hidden")) {
            const commentElement = $(comment);
            showComment(commentElement);
        }

        $.post("/feed", {
            postID: postID,
            videoAction: {
                action: "ended",
                absTime: Date.now(),
            },
            _csrf: $("meta[name='csrf-token']").attr("content")
        });
    });

    $("video").on("play seeked seeking volumechange", function(event) {
        const eventType = event.type;
        const post = $(this).parents(".ui.fluid.card");
        const postID = post.attr("postID");

        let videoAction = {
            action: eventType,
            absTime: Date.now(),
            videoTime: this.currentTime
        };
        if (eventType == "volumechange") {
            videoAction.volume = (this.muted) ? 0 : this.volume;
        }
        $.post("/feed", {
            postID: postID,
            videoAction: videoAction,
            _csrf: $("meta[name='csrf-token']").attr("content")
        })
    });

    $("video").on("pause", async function(event) {
        // When a user switches to another video while it is still playing, the "pause" is triggered programatically by .trigger("pause").
        // But for some reason, programatically triggering the pause calls the .on("pause") event handler twice. 
        // So, ignore one of these triggers.
        if (event.isTrigger) {
            return;
        }

        const post = $(this).parents(".ui.fluid.card");
        const postID = post.attr("postID");
        if (!this.seeking) {
            await $.post("/feed", {
                postID: postID,
                videoAction: {
                    action: "pause",
                    absTime: Date.now(),
                    videoTime: this.currentTime,
                },
                _csrf: $("meta[name='csrf-token']").attr("content")
            });
        }

        const videoElement = post.find("video")[0];
        const videoDuration = [];
        for (let i = 0; i < videoElement.played.length; i++) {
            videoDuration.push({
                startTime: videoElement.played.start(i),
                endTime: videoElement.played.end(i)
            });
        }

        if (videoDuration.length != 0) {
            await $.post("/feed", {
                postID: postID,
                videoDuration: videoDuration,
                _csrf: $("meta[name='csrf-token']").attr("content")
            });
        }
    })

    // Buttons to switch videos
    $(".lastVid-button").popup(); // Enables tooltip
    $("button.circular.ui.icon.button.blue.centered").on("click", async function() {
        const currentCard = $(".ui.fluid.card:visible");
        // If current video is not paused, pause video.
        if (!currentCard.find("video")[0].paused) {
            currentCard.find("video").trigger("pause");
        }
        // Record the time spent on current video "page".
        await resetActiveTimer(false, false);

        // Transition to next video and play the video.
        const nextVid = parseInt($(this).attr("nextVid"));
        const index = nextVid - firstVideoIndex;
        $(".ui.fluid.card:visible").transition("hide");
        $(`.ui.fluid.card[index=${nextVid}]`).transition();
        $(`.ui.fluid.card[index=${nextVid}] video`)[0].play();

        // Hide buttons accordingly and change button nextVid attribute
        if (index % numVideos == 0) {
            $("button.left").addClass("hidden");
        } else {
            $("button.left").removeClass("hidden");
            $("button.left").attr("nextVid", nextVid - 1);
        }

        if (index % numVideos == numVideos - 1) {
            $("button.right:not(.disabled)").addClass("hidden");
            $(".lastVid-button").removeClass("hidden");
        } else {
            $("button.right:not(.disabled)").removeClass("hidden");
            $(".lastVid-button").addClass("hidden");
            $("button.right:not(.disabled)").attr("nextVid", nextVid + 1);
        }

        // Log new page
        await $.post("/pageLog", {
            path: window.location.pathname + `?v=${nextVid}`,
            _csrf: $("meta[name='csrf-token']").attr("content")
        });
    });

    // Buttons to next page
    $(".ui.large.button.green.lastVid-button").on("click", async function() {
        $(this).addClass("loading disabled");
        if (window.location.pathname == "/tutorial") {
            window.location.href = "/trans";
        } else {
            await resetActiveTimer(true, false);
        }
    })
});