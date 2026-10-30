
(function () {
    var ns = Q.use("fish"), game = ns.game;

    var Bullet = ns.Bullet = function (props) {

        this.power = 0;

        this.speedX = 0;
        this.speedY = 0;

        Bullet.superClass.constructor.call(this, props);

        this.id = Q.UIDUtil.createUID("Bullet");

    };

    Q.inherit(Bullet, Q.Bitmap);

    // Update bullet position
    Bullet.prototype.update = function (timeInfo) {

        if (this.isOutOfScreen()) {

            this.destory();

        } else {

            this.x += this.speedX;
            this.y -= this.speedY;

            if (this.checkCollision()) {
                this.destory();
            }

        }

    };

    // Check collision between bullet and fish
    Bullet.prototype.checkCollision = function () {

        var fishes = game.fishManager.fishes;
        var len = fishes.length;

        var hitted = false;

        for (var i = 0; i < len; i++) {

            var fish = fishes[i];

            if (
                this.y - this.height * 0.5 >
                fish.y + fish.height * 0.5 ||

                this.y + this.height * 0.5 <
                fish.y - fish.height * 0.5 ||

                this.x - this.width * 0.5 >
                fish.x + fish.width * 0.5 ||

                this.x + this.width * 0.5 <
                fish.x - fish.width * 0.5
            ) {
                continue;
            }

            if (this.hitTestObject(fish, true)) {

                hitted = true;

                break;

            }

        }

        if (hitted === false) {
            return false;
        }

        // Create capture web
        var web = new Q.Bitmap(
            ns.R.webs[this.power - 1]
        );

        web.x = this.x;
        web.y = this.y;

        web.scaleX = web.scaleY = 0.8;

        web.eventEnabled = false;

        this.parent.addChild(web);

        // Animate web
        Q.Tween.to(
            web,
            {
                scaleX: 1.0,
                scaleY: 1.0
            },
            {
                time: 100,
                reverse: true,

                onComplete: function (tween) {

                    if (tween.reversing && web.parent) {
                        web.parent.removeChild(web);
                    }

                    tween.reversing = true;

                }
            }
        );

        // Check which fish can be captured
        for (var j = 0; j < len; j++) {

            var targetFish = fishes[j];

            if (
                web.y - web.height * 0.5 >
                targetFish.y + targetFish.height * 0.5 ||

                web.y + web.height * 0.5 <
                targetFish.y - targetFish.height * 0.5 ||

                web.x - web.width * 0.5 >
                targetFish.x + targetFish.width * 0.5 ||

                web.x + web.width * 0.5 <
                targetFish.x - targetFish.width * 0.5
            ) {
                continue;
            }

            if (
                !targetFish.captured &&
                web.hitTestObject(targetFish, true) &&
                targetFish.canBeCaptured(this.power - 1)
            ) {

                targetFish.moving = false;

                targetFish.captured = true;

                // Record which player captured this fish
                targetFish.capturePlayer = this.owner || game.player;

                targetFish.capturingCounter = game.fps >> 1;

                targetFish.gotoAndPlay("capture");

            }
        }

        return true;

    };

    // Remove bullet
    Bullet.prototype.destory = function () {

        if (this.parent) {
            this.parent.removeChild(this);
        }

    };

    // Detect whether bullet has left the screen
    Bullet.prototype.isOutOfScreen = function () {

        return (
            this.x < -50 ||
            this.x > game.width + 50 ||
            this.y < -50 ||
            this.y > game.height + 50
        );

    };
})();
