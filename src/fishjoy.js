
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

		scale: 1
	};

	// Automatically fit the game to the available screen.
	game.resize = function () {
		if (!this.container) return;

		var screenWidth = window.innerWidth;
		var screenHeight = window.innerHeight;

		if (!screenWidth || !screenHeight) return;

		var scaleX = screenWidth / this.width;
		var scaleY = screenHeight / this.height;

		// Preserve the original game proportions.
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
		this.container.style.transform = "scale(" + scale + ")";
	};

	game.load = function (container) {

		var params = this.params = Q.getUrlParams();

		if (params.mode == undefined) params.mode = 2;
		if (params.fps) this.fps = params.fps;

		this.fireInterval = this.fps * 0.5;

		// Use consistent logical dimensions on every device.
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

		// Initial automatic scaling.
		this.resize();

		// Recalculate whenever the window size changes.
		window.addEventListener("resize", function () {
			game.resize();

			if (game.stage && game.stage.updatePosition) {
				game.stage.updatePosition();
			}
		});

		// Handle TV/browser orientation changes.
		window.addEventListener("orientationchange", function () {
			setTimeout(function () {
				game.resize();

				if (game.stage && game.stage.updatePosition) {
					game.stage.updatePosition();
				}
			}, 100);
		});

		// Loading message.
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

		// Load game images.
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
		var me = this;

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

		var context = null;

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

		this.stage = new Q.Stage({
			width: this.width,
			height: this.height,
			context: this.context,
			update: Q.delegate(this.update, this)
		});

		var em = this.evtManager = new Q.EventManager();

		em.registerStage(
			this.stage,
			this.events,
			true,
			true
		);

		this.initUI();
		this.initPlayer();

		this.fishManager = new ns.FishManager(
			this.fishContainer
		);

		this.fishManager.makeFish();

		var timer = this.timer = new Q.Timer(1000 / this.fps);

		timer.addListener(this.stage);
		timer.addListener(Q.Tween);
		timer.start();

		this.showFPS();

		// Apply scaling again after initialization.
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

		this.fishContainer.onEvent = function (e) {
			if (
				e.type == game.events[0] &&
				game.fireCount >= game.fireInterval
			) {
				game.fireCount = 0;

				// Convert screen coordinates to original game coordinates.
				var rect = game.container.getBoundingClientRect();

				var scaleX = rect.width / game.width;
				var scaleY = rect.height / game.height;

				var targetX = (e.pageX !== undefined
					? e.pageX - window.pageXOffset
					: e.clientX) - rect.left;

				var targetY = (e.pageY !== undefined
					? e.pageY - window.pageYOffset
					: e.clientY) - rect.top;

				targetX = targetX / scaleX;
				targetY = targetY / scaleY;

				game.player.fire({
					x: targetX,
					y: targetY
				});
			}
		};

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

	game.initPlayer = function () {
		var coin = Number(this.params.coin) || 10000;

		this.player = new ns.Player({
			id: "quark",
			coin: coin
		});
	};

	game.update = function (timeInfo) {
		this.frames++;
		this.fireCount++;

		this.fishManager.update();
	};

	game.testFish = function () {
		var num = this.params.num || 50;
		var len = ns.R.fishTypes.length;

		for (var i = 0; i < num; i++) {
			var chance = Math.random() * (len - 1) >> 0;
			var index = Math.random() * chance + 1 >> 0;
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
			var fish = new ns.Fish(ns.R.fishTypes[1]);

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
				fpsContainer.innerHTML = "FPS: " + me.frames;
				me.frames = 0;
			}, 1000);
		}
	};

	game.hideNavBar = function () {
		// Avoid scrolling the game page.
		if (Q.isMobile) {
			window.scrollTo(0, 1);
		}
	};

})();
