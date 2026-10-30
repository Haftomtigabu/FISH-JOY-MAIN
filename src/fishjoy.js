(function () {

    window.onload = function () {
        setTimeout(function () {
            game.load();
        }, 10);
    };

    var ns = Q.use("fish");

    var game = ns.game = {

        container: null,

        // Original logical game dimensions
        width: 980,
        height: 545,

        fps: 60,
        frames: 0,
        params: null,

        events: Q.supportTouch
            ? ["touchstart", "touchend"]
            : ["mousedown", "mouseup"],

        fireInterval: 30,
        fireCount: 0,

        scale: 1,

        // Keyboard state
        keys: {},

        // Prevent power changing every frame
        upPressed: false,
        downPressed: false,

        // Keyboard initialization
        initKeyboard: function () {

            var me = this;

            window.addEventListener("keydown", function (e) {

                var key = e.code;

                if (
                    key === "ArrowUp" ||
                    key === "ArrowDown" ||
                    key === "ArrowLeft" ||
                    key === "ArrowRight" ||
                    key === "Space"
                ) {
                    e.preventDefault();
                }

                me.keys[key] = true;

            });

            window.addEventListener("keyup", function (e) {

                me.keys[e.code] = false;

                if (e.code === "ArrowUp") {
                    me.upPressed = false;
                }

                if (e.code === "ArrowDown") {
                    me.downPressed = false;
                }

            });

            // Stop movement and firing if the browser loses focus
            window.addEventListener("blur", function () {

                me.keys = {};
                me.upPressed = false;
                me.downPressed = false;

            });

        }

    };


    // Automatically fit the game to the available screen
    game.resize = function () {

        if (!this.container) return;

        var screenWidth = window.innerWidth;
        var screenHeight = window.innerHeight;

        if (!screenWidth || !screenHeight) return;

        var scaleX = screenWidth / this.width;
        var scaleY = screenHeight / this.height;

        // Preserve original proportions
        var scale = Math.min(scaleX, scaleY);

        this.scale = scale;

        var scaledWidth = this.width * scale;
        var scaledHeight = this.height * scale;

        this.container.style.position = "absolute";

        this.container.style.width = this.width + "px";
        this.container.style.height = this.height + "px";

        this.container.style.left =
            ((screenWidth - scaledWidth) / 2) + "px";

        this.container.style.top =
            ((screenHeight - scaledHeight) / 2) + "px";

        this.container.style.transformOrigin = "top left";

        this.container.style.transform =
            "scale(" + scale + ")";

    };


    game.load = function (container) {

        var params = this.params = Q.getUrlParams();

        if (params.mode == undefined) params.mode = 2;

        if (params.fps) this.fps = params.fps;

        this.fireInterval = this.fps * 0.5;

        // Consistent logical dimensions
        this.width = 980;
        this.height = 545;

        Q.addMeta({
            name: "viewport",
            content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        });

        if (params.width) {
            this.width = Number(params.width) || this.width;
        }

        if (params.height) {
            this.height = Number(params.height) || this.height;
        }

        this.container = container || Q.getDOM("container");

        this.container.style.overflow = "hidden";

        this.container.style.width = this.width + "px";
        this.container.style.height = this.height + "px";

        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;

        this.resize();

        // Handle window resizing
        window.addEventListener("resize", function () {
            game.resize();

            if (game.stage && game.stage.updatePosition) {
                game.stage.updatePosition();
            }

        });

        // Handle orientation changes
        window.addEventListener("orientationchange", function () {

            setTimeout(function () {

                game.resize();

                if (game.stage && game.stage.updatePosition) {
                    game.stage.updatePosition();
                }

            }, 100);

        });

        // Loading message
        var div = Q.createDOM("div", {

            innerHTML: "Game loading, please wait...<br>",

            style: {

                id: "loader",
                position: "absolute",
                width: this.width + "px",
                left: "0px",
                top: (this.height >> 1) + "px",
                textAlign: "center",
                color: "#fff",

                font: Q.isMobile
                    ? "bold 16px Arial"
                    : "bold 16px Times New Roman",

                textShadow: "0 2px 2px #111"

            }

        });

        this.container.appendChild(div);

        this.loader = div;

        this.hideNavBar();

        // Load images
        var imgLoader = new Q.ImageLoader();

        imgLoader.addEventListener(
            "loaded",
            Q.delegate(this.onLoadLoaded, this)
        );

        imgLoader.addEventListener(
            "complete",
            Q.delegate(this.onLoadComplete, this)
        );

        imgLoader.load(ns.R.sources);

    };


    game.onLoadLoaded = function (e) {

        var content =
            "Game loading, please wait...<br>(" +
            Math.round(
                e.target.getLoadedSize() /
                e.target.getTotalSize() * 100
            ) +
            "%)";

        this.loader.innerHTML = content;

    };


    game.onLoadComplete = function (e) {

        e.target.removeAllEventListeners();

        this.init(e.images);

    };


    game.init = function (images) {

        ns.R.init(images);

        this.startup();

    };


    game.startup = function () {

        if (this.loader && this.loader.parentNode) {
            this.container.removeChild(this.loader);
        }

        this.loader = null;

        if (Q.isWebKit && !Q.supportTouch) {

            document.body.style.webkitTouchCallout = "none";
            document.body.style.webkitUserSelect = "none";
            document.body.style.webkitTextSizeAdjust = "none";
            document.body.style.webkitTapHighlightColor =
                "rgba(0,0,0,0)";

        }

        // Initialize rendering context
        if (this.params.mode == 1) {

            var canvas = Q.createDOM("canvas", {

                id: "canvas",

                width: this.width,
                height: this.height,

                style: {
                    position: "absolute"
                }

            });

            this.container.appendChild(canvas);

            this.context = new Q.CanvasContext({
                canvas: canvas
            });

        } else {

            this.context = new Q.DOMContext({
                canvas: this.container
            });

        }

        // Create stage
        this.stage = new Q.Stage({

            width: this.width,
            height: this.height,

            context: this.context,

            update: Q.delegate(this.update, this)

        });

        // Register mouse/touch events
        var em = this.evtManager = new Q.EventManager();

        em.registerStage(
            this.stage,
            this.events,
            true,
            true
        );

        // Initialize game objects
        this.initUI();

        this.initPlayer();

        // Enable keyboard
        this.initKeyboard();

        // Initialize fish
        this.fishManager = new ns.FishManager(
            this.fishContainer
        );

        this.fishManager.makeFish();

        // Start game timer
        var timer = this.timer = new Q.Timer(
            1000 / this.fps
        );

        timer.addListener(this.stage);
        timer.addListener(Q.Tween);

        timer.start();

        this.showFPS();

        this.resize();

    };


    game.initUI = function () {

        this.bg = new Q.Bitmap({

            id: "bg",

            image: ns.R.mainbg,

            transformEnabled: false

        });

        this.fishContainer = new Q.DisplayObjectContainer({

            id: "fishContainer",

            width: this.width,
            height: this.height,

            eventChildren: false,

            transformEnabled: false

        });

        // Mouse/touch shooting
        this.fishContainer.onEvent = function (e) {

            if (
                e.type == game.events[0] &&
                game.fireCount >= game.fireInterval
            ) {

                game.fireCount = 0;

                // Convert screen coordinates to game coordinates
                var rect = game.container.getBoundingClientRect();

                var scaleX = rect.width / game.width;
                var scaleY = rect.height / game.height;

                var targetX = (
                    e.pageX !== undefined
                        ? e.pageX - window.pageXOffset
                        : e.clientX
                ) - rect.left;

                var targetY = (
                    e.pageY !== undefined
                        ? e.pageY - window.pageYOffset
                        : e.clientY
                ) - rect.top;

                targetX = targetX / scaleX;
                targetY = targetY / scaleY;

                // Mouse/touch controls Player 1
                game.player.fire({

                    x: targetX,
                    y: targetY

                });

            }

        };

        // Bottom bar
        this.bottom = new Q.Bitmap(ns.R.bottombar);

        this.bottom.id = "bottom";

        this.bottom.x =
            (this.width - this.bottom.width) >> 1;

        this.bottom.y =
            this.height - this.bottom.height + 2;

        this.bottom.transformEnabled = false;

        this.stage.addChild(
            this.bg,
            this.fishContainer,
            this.bottom
        );

    };


    // Update the score when a player's coins change.
    game.updatePlayerScoreboard = function (player) {

        if (!this.scoreboardElements || !player) return;

        var score = this.scoreboardElements[player.id];

        if (score) {
            score.innerHTML = player.coin;
        }
    };

    // Create six independent players
    game.initPlayer = function () {

        var coin = Number(this.params.coin) || 10000;

        this.players = [];

        var positions = [

            // Player 1: Bottom-left
            {
                id: "1",
                x: this.width * 0.25,
                y: this.height - 20,
                startRotation: 0,
                minRotation: -80,
                maxRotation: 80,
                coinX: this.width * 0.25 - 120,
                coinY: this.height - 40,
                controls: {
                    left: "KeyA",
                    right: "KeyD",
                    up: "KeyW",
                    down: "KeyS",
                    fire: "KeyF"
                }
            },

            // Player 2: Bottom-right
            {
                id: "2",
                x: this.width * 0.75,
                y: this.height - 20,
                startRotation: 0,
                minRotation: -80,
                maxRotation: 80,
                coinX: this.width * 0.75 - 40,
                coinY: this.height - 75,
                controls: {
                    left: "KeyJ",
                    right: "KeyL",
                    up: "KeyI",
                    down: "KeyK",
                    fire: "KeyH"
                }
            },

            // Player 3: Top-left
            {
                id: "3",
                x: this.width * 0.25,
                y: 20,
                startRotation: 180,
                minRotation: 100,
                maxRotation: 260,
                coinX: this.width * 0.25 - 40,
                coinY: 45,
                controls: {
                    left: "ArrowLeft",
                    right: "ArrowRight",
                    up: "ArrowUp",
                    down: "ArrowDown",
                    fire: "Enter"
                }
            },
            // Player 4: Top-right
            {
                id: "4",
                x: this.width * 0.75,
                y: 20,
                startRotation: 180,
                minRotation: 100,
                maxRotation: 260,
                coinX: this.width * 0.75 - 40,
                coinY: 45,
                controls: {
                    left: "Digit4",
                    right: "Digit6",
                    up: "Digit8",
                    down: "Digit5",
                    fire: "Digit0"
                }
            },

            // Player 5: Left side, facing right
            {
                id: "5",
                x: 20,
                y: this.height * 0.50,
                startRotation: 90,
                minRotation: 10,
                maxRotation: 170,
                coinX: 35,
                coinY: this.height * 0.50 + 35,
                controls: {
                    left: "KeyT",
                    right: "KeyG",
                    up: "KeyR",
                    down: "KeyB",
                    fire: "KeyY"
                }
            },

            // Player 6: Right side, facing left
            {
                id: "6",
                x: this.width - 20,
                y: this.height * 0.50,
                startRotation: -90,
                minRotation: -170,
                maxRotation: -10,
                coinX: this.width - 130,
                coinY: this.height * 0.50 + 35,
                controls: {
                    left: "Numpad4",
                    right: "Numpad6",
                    up: "Numpad8",
                    down: "Numpad5",
                    fire: "Numpad0"
                }
            }

        ];

        for (var i = 0; i < positions.length; i++) {

            var settings = positions[i];

            settings.coin = coin;

            var player = new ns.Player(settings);

            this.players.push(player);
            this.updatePlayerScoreboard(player);
        }
    };


    // Main game loop and keyboard controls
    game.update = function (timeInfo) {

        this.frames++;
        this.fireCount++;

        if (this.fishManager) {
            this.fishManager.update();
        }

        if (!this.players) return;

        var keys = this.keys || {};

        for (var i = 0; i < this.players.length; i++) {

            var player = this.players[i];
            var controls = player.controls;

            if (!player.cannon) continue;

            // Rotate left
            if (keys[controls.left]) {
                player.rotateCannon(-1);
            }

            // Rotate right
            if (keys[controls.right]) {
                player.rotateCannon(1);
            }

            // Increase power once per key press
            if (keys[controls.up] && !player.powerUpWasDown) {

                player.changePower(1);
                player.powerUpWasDown = true;

            }

            if (!keys[controls.up]) {
                player.powerUpWasDown = false;
            }

            // Decrease power once per key press
            if (keys[controls.down] && !player.powerDownWasDown) {

                player.changePower(-1);
                player.powerDownWasDown = true;

            }

            if (!keys[controls.down]) {
                player.powerDownWasDown = false;
            }

            // Independent shooting cooldown for every player
            player.fireCounter++;

            if (
                keys[controls.fire] &&
                player.fireCounter >= this.fireInterval
            ) {

                player.fireCounter = 0;

                player.fire(null);

            }

        }

    };


    game.testFish = function () {

        var num = this.params.num || 50;

        var len = ns.R.fishTypes.length;

        for (var i = 0; i < num; i++) {

            var chance =
                Math.random() * (len - 1) >> 0;

            var index =
                Math.random() * chance + 1 >> 0;

            var type = ns.R.fishTypes[index];

            var fish = new ns.Fish(type);

            fish.x = Math.random() * this.width >> 0;

            fish.y = Math.random() * this.height >> 0;

            fish.moving = true;

            fish.rotation = Math.random() * 360 >> 0;

            fish.init();

            this.fishContainer.addChild(fish);

        }

    };


    game.testFishDirection = function () {

        var dirs = [
            0, 45, 90, 135,
            180, 225, 270, 315
        ];

        for (var i = 0; i < 8; i++) {

            var fish = new ns.Fish(
                ns.R.fishTypes[1]
            );

            fish.x = this.width >> 1;

            fish.y = this.height >> 1;

            fish.speed = 0.5;

            fish.setDirection(dirs[i]);

            fish.moving = true;

            this.stage.addChild(fish);

        }

    };


    game.testFishALL = function () {

        var sx = 100;
        var sy = 50;
        var y = 0;

        var len = ns.R.fishTypes.length;

        for (var i = 0; i < len - 1; i++) {

            var type = ns.R.fishTypes[i + 1];

            var fish = new ns.Fish(type);

            if (i == 9) {

                fish.x = sx;

            } else {

                fish.x = sx + Math.floor(i / 5) * 200;

            }

            if (i == 9) {

                y = sy + 320;

            } else if (i % 5 == 0) {

                y = sy;

            }

            fish.y = y + (i % 5) * 20;

            y += fish.height;

            fish.update = function () { };

            this.stage.addChild(fish);

        }

    };


    game.showFPS = function () {

        var me = this;

        var fpsContainer = Quark.getDOM("fps");

        if (fpsContainer) {

            setInterval(function () {

                fpsContainer.innerHTML =
                    "FPS: " + me.frames;

                me.frames = 0;

            }, 1000);

        }

    };


    game.hideNavBar = function () {

        if (Q.isMobile) {
            window.scrollTo(0, 1);
        }

    };

})();
