// Function copied directly from the MDN web docs:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
// The maximum is exclusive and the minimum is inclusive
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function canContinue() {
    const hasUsername = $('button.ui.button.green').length > 0;
    const hasPicture = $('.image.green').length > 0;
    if (hasUsername && hasPicture) {
        $(".ui.big.labeled.icon.button").addClass("green")[0].scrollIntoView({ behavior: "smooth" });
    } else {
        if (hasUsername && !hasPicture) {
            $(".ui.form .images")[0].scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
        $(".ui.big.labeled.icon.button").removeClass("green");
    }
}

$(window).on("load", async function() {
    let actorUserNames;
    await $.getJSON("/actors", function(json) {
        actorUserNames = json["usernames"];
    });

    let timeout;
    $('.ui.dropdown').dropdown({
        // Choose an initial
        onChange: function(value, text, $selectedItem) {
            // clear any usernames waiting to be loaded
            clearTimeout(timeout);
            $("h2.username").empty();
            $('button.ui.button').removeClass("green");

            const firstInitial = $('select[name="firstInitial"]').val();
            const lastInitial = $('select[name="lastInitial"]').val();

            if (firstInitial !== '' && lastInitial !== '') {
                $('button.ui.button').addClass("loading");
                const randomNames = [];
                while (randomNames.length < 3) {
                    const randomNumber = String(getRandomInt(1, 999)).padStart(3, '0');
                    const randomName = `${firstInitial.toLowerCase()}${lastInitial.toLowerCase()}${randomNumber}`;
                    if (!randomNames.includes(randomName) && !actorUserNames.includes(randomName)) {
                        randomNames.push(randomName);
                    }
                }
                timeout = setTimeout(function() {
                    $('button.ui.button').removeClass("loading");
                    for (var i = 0; i < 3; i++) {
                        $(`h2.username_${i+1}`).text(randomNames[i]);
                    }
                }, 750);
            }
            canContinue();
        }
    });

    // Choose a full username
    $('button.ui.button').on('click', function() {
        // only allow selection if there are values loaded into the buttons
        if ($(this).find("h2") && $(this).find("h2").text().trim() == '') {
            return;
        }
        // clear any usernames selected
        $('button.ui.button').removeClass("green");
        $('button.ui.button h2 i.check.icon.green').remove();

        $(this).addClass("green");
        $(this).find("h2").prepend('<i class="check icon green hidden"></i>');
        $(this).find("h2").append('<i class="check icon green"></i>');

        canContinue();

        if ($('.ui.warning.message.username').is(":visible")) {
            $('.ui.warning.message.username').hide();
        }
    })

    // Click a photo
    $('a.avatar').on('click', function() {
        // clear any photos selected 
        $('.image').removeClass("green");
        $(".image i.icon.green.check").addClass("hidden");

        $(this).parent('.image').addClass("green");
        $(this).siblings('i.icon').removeClass("hidden");

        canContinue();

        if ($('.ui.warning.message.photo').is(":visible")) {
            $('.ui.warning.message.photo').hide();
        }
    })

    $(".ui.big.labeled.icon.button").on('click', function() {
        const username = $('button.ui.button.green h2').text();
        const src = $('.image.green a.avatar img').attr('src');
        if ($(this).hasClass("green")) {
            $(this).addClass('loading disabled');
            $.post(`/signup${window.location.search}`, {
                username: username,
                photo: src,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            }).done(function(json) {
                if (json["result"] === "success") {
                    window.location.href = '/account/interest';
                }
            });;
        } else {
            if (username === undefined || username.trim() === '') {
                if ($('.ui.warning.message.username').is(":hidden")) {
                    $('.ui.warning.message.username').show();
                    $('.ui.warning.message.username').removeClass("hidden");
                }
            }
            if (src === undefined || src.trim() === '') {
                if ($('.ui.warning.message.photo').is(":hidden")) {
                    $('.ui.warning.message.photo').show();
                    $('.ui.warning.message.photo').removeClass("hidden");
                }
            }
            $('.ui.warning.message')[0].scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    });

    $('.message .close')
        .on('click', function() {
            $(this)
                .closest('.message')
                .transition('fade');
        });
});