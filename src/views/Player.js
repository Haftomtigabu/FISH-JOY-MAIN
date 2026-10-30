(function () {

    var ns = Q.use("fish"), game = ns.game;

    var Player = ns.Player = function (props) {

        this.id = null;
        this.coin = 10000;
        this.numCapturedFishes = 0;
        this.cannon = null;
        this.coinNum = null;

        this.x = 0;
        this.y = 0;

        this.startRotation = 0;
        this.minRotation = -80;
        this.maxRotation = 80;
        this.rotationSpeed = 2;

        this.coinX = 0;
        this.coinY = 0;
        this.controls = {};

        this.powerUpWasDown = false;
        this.powerDownWasDown = false;
        this.fireCounter = 0;

        props = props || {};

        Q.merge(this, props, true);

        this.init();

    };


    // Initialize this player's cannon and coin display.
    Player.prototype.init = function () {

        this.cannon = new ns.Cannon(ns.R.cannonTypes[1]);

        this.cannon.id = "cannon_" + this.id;

        this.cannon.setPower(1, false);

        this.cannon.x = this.x;
        this.cannon.y = this.y;

        this.cannon.rotation = this.startRotation;


        // Original numeric coin display.
        this.coinNum = new ns.Num({

            id: "coinNum_" + this.id,
            src: ns.R.coinText,
            max: 5,
            gap: 0,
            autoAddZero: true,

        });


        this.coinNum.x = this.coinX - 5;
        this.coinNum.y = this.coinY + 2;

        this.coinNum.setValue(this.coin);

        this.coinNumBG = new Q.Bitmap({ image: ns.R.scoreBoards[this.id].image, rect: ns.R.scoreBoards[this.id].rect, scaleX: .3, scaleY: .3 });
        this.coinNumBG.x = this.coinX - 70;
        this.coinNumBG.y = this.coinY - 22;

        // Add the cannon and coin display to the game.
        game.stage.addChild(
            this.cannon,
            this.coinNumBG,
            this.coinNum,
        );

    };


    // Change cannon power.
    Player.prototype.changePower = function (direction) {

        if (this.cannon) {
            this.cannon.setPower(direction, true);
        }

    };


    // Rotate this player's cannon.
    Player.prototype.rotateCannon = function (direction) {

        if (!this.cannon) return;

        var rotation =
            (this.cannon.rotation || 0) +
            direction * this.rotationSpeed;

        if (rotation < this.minRotation) {
            rotation = this.minRotation;
        }

        if (rotation > this.maxRotation) {
            rotation = this.maxRotation;
        }

        this.cannon.rotation = rotation;

    };


    // Fire a bullet.
    Player.prototype.fire = function (targetPoint) {

        var cannon = this.cannon;

        if (!cannon) return;

        var power = cannon.power;

        // Cannot shoot without enough coins.
        if (this.coin < power) return;

        var degree;

        if (targetPoint) {

            var dir = ns.Utils.calcDirection(
                cannon,
                targetPoint
            );

            degree = dir.degree;

            if (degree == -90) {

                degree = 0;

            } else if (degree < 0 && degree > -90) {

                degree = -degree;

            } else if (degree >= 180 && degree <= 270) {

                degree = 180 - degree;

            }

        } else {

            degree = cannon.rotation || 0;

        }


        // Play the cannon animation.
        cannon.fire(degree);

        var rad = degree * Q.DEG_TO_RAD;

        var sin = Math.sin(rad);
        var cos = Math.cos(rad);


        // Create the bullet.
        var bullet = new ns.Bullet(
            ns.R.bullets[power - 1]
        );

        bullet.x =
            cannon.x +
            (cannon.regY + 20) * sin;

        bullet.y =
            cannon.y -
            (cannon.regY + 20) * cos;

        bullet.rotation = degree;

        bullet.power = power;

        bullet.speedX = 5 * sin;
        bullet.speedY = 5 * cos;


        // IMPORTANT:
        // Remember which player fired this bullet.
        bullet.owner = this;


        game.stage.addChild(bullet);


        // Deduct the shooting cost from this player only.
        this.updateCoin(-power, true);

    };


    // Reward this player when their bullet captures a fish.
    Player.prototype.captureFish = function (fish) {

        if (!fish) return;

        this.updateCoin(fish.coin, true);
        this.numCapturedFishes++;

    };


    // Update this player's balance and scoreboard.
    Player.prototype.updateCoin = function (coin, increase) {

        if (increase) {

            this.coin += coin;

        } else {

            this.coin = coin;

        }


        // Keep the balance within the supported range.
        if (this.coin > 999999) {
            this.coin = 999999;
        }

        if (this.coin < 0) {
            this.coin = 0;
        }


        // Update the original in-game coin number.
        if (this.coinNum) {

            this.coinNum.setValue(this.coin);

        }


        // Update this player's scoreboard.
        if (game.updatePlayerScoreboard) {

            game.updatePlayerScoreboard(this);

        }

    };

})();
