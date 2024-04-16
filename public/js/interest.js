function canContinue() {
    const chosePicture = $('.image.green').length == 1;
    if (chosePicture) {
        $(".ui.big.labeled.icon.button").addClass("green");
        $(".ui.big.labeled.icon.button")[0].scrollIntoView({ behavior: "smooth" });
    } else {
        $(".ui.big.labeled.icon.button").removeClass("green");
    }
}

$(window).on("load", async function() {
    $('.ui.big.labeled.icon.button').removeClass('loading disabled');
    // Click a photo
    $('.image').on('click', function() {
        // Unselecting
        if ($(this).hasClass("green")) {
            $(this).removeClass("green");
            $(this).find(`i.icon.green.check`).addClass("hidden");
        } else { // Selecting
            if ($('.image.green').length == 1) {
                // clear any photos selected 
                $(`.image.green i.icon.green.check`).addClass("hidden");
                $(`.image.green`).removeClass("green");
            }

            $(this).closest('.image').addClass("green");
            $(this).find('i.icon').removeClass("hidden");
        }

        canContinue();

        if ($('.ui.warning.message').is(":visible")) {
            $('.ui.warning.message').hide();
        }
    })

    $(".ui.big.labeled.icon.button").on('click', function() {
        const chosePicture = $('.image.green').length == 1;
        if (chosePicture) {
            $(this).addClass('loading disabled');
            const interest = $('.image.green').attr('id');
            $.post('/account/interest', {
                    interest: interest,
                    _csrf: $('meta[name="csrf-token"]').attr('content')
                })
                .done(function(json) {
                    if (json["result"] === "success") {
                        window.location.href = '/tutorial';
                    }
                });
        } else {
            $('.ui.warning.message').removeClass("hidden");
            $('.ui.warning.message').transition('jiggle');
        }
    });
});