var eb = new EventBus('/eventbus/');

function ebmsg(value) {
    var msg = {
        name: $("#player-name").val()
    };
    if (value !== undefined) {
        msg.value = value;
    }
    return msg;
}

eb.onopen = function () {
  eb.registerHandler('logs', function (err, msg) {
      showMessage(100, 300, msg.body);
  });
};

var Game = {
    player: undefined,
    allObjects: [],
    allTemplates: [],
    delta: 100,
    step: 10,
    gameLoop: undefined,
    screenWidth: 900,
    screenHeight: 600,
    ccs: [76, 69, 67, 72, 85, 67, 75],
    ccsi: -1,
    speedFactor: 1,
    seenContainers: false,
    seenScale: false,
    seenMonocle: false,
    seenFSCM: false,
    explainedHeat: false
};

function createMotion(x, y, dx, dy, ax, ay, behavior) {
	var motion = {
		x: x,
		y: y,
		dx: dx,
		dy: dy,
		ax: ax,
		ay: ay,
		move: function() {
			if (this.dx != 0) {
				this.x += this.dx * Game.delta / 1000;
			}
			if (this.dy != 0) {
				this.y += this.dy * Game.delta / 1000;
			}
			if (this.ax != 0) {
				this.dx += this.ax * Game.delta / 1000;
			}
			if (this.ay != 0) {
				this.dy += this.ay * Game.delta / 1000;
			}
			if (this.behavior && this.behavior.name == "y-sinuzoid") {
				if (this.dy > this.behavior.param) {
					this.ay = -this.ay;
					this.dy = this.behavior.param;
				}
				else if (this.dy < -this.behavior.param) {
					this.ay = -this.ay;
					this.dy = -this.behavior.param;
				}
			}
		}
	};

	if (behavior && behavior.name == "y-sinuzoid") {
		motion.behavior = {
			name: behavior.name,
			param: behavior.paramMin + (behavior.paramMax - behavior.paramMin) * Math.random()
		};
		motion.ay = motion.behavior.param;
	}
	return motion;
}

function createObject(x, y, dx, dy, ax, ay, objTpl) {
	var div = $(document.createElement('div'));
	div.css("background", "url('" + objTpl.background + "')");
	div.css("position", "absolute");
	div.css("width", objTpl.w);
	div.css("height", objTpl.h);
	div.css("top", y);
	div.css("left", x);
	var object = {
		type: objTpl.type,
		weight: objTpl.weight,
		div: div,
		motion: createMotion(x, y, dx, dy, ax, ay, objTpl.behavior),
		w: objTpl.w,
		h: objTpl.h,
		move: function() {
			this.motion.move();
			this.div.css("left", this.getX());
			this.div.css("top", this.getY());
		},
		moveTo: function(dx, dy) {
			this.motion.x += dx;
			this.motion.y += dy;
			this.div.css("left", this.getX());
			this.div.css("top", this.getY());
		},
		collide: function(otherObject) {
			return (Math.abs((otherObject.motion.x + otherObject.w/2) - (this.motion.x + this.w/2)) < (otherObject.w + this.w) / 2
				&& Math.abs((otherObject.motion.y + otherObject.h/2) - (this.motion.y + this.h/2)) < (otherObject.h + this.h) / 2);
		},
		getX: function() {
			return Math.floor(this.motion.x);
		},
		getY: function() {
			return Math.floor(this.motion.y);
		}
	};
	$("#game_container").append(div);
	return object;
}

function message_away(y, div) {
	if (y > -100) {
		div.css("top", y);
		setTimeout(function() { message_away(y-10, div); }, 100);
	} else {
		div.remove();
	}
}

function showMessage(x, y, msg) {
	var div = $(document.createElement('div'));
	div.css("position", "absolute");
	div.css("top", y);
	div.css("left", x);
	div.css("font-family", "courier");
	div.css("font-size", "8pt");
	div.html(msg);
	$("#game_container").append(div);
	setTimeout(function() { message_away(y-10, div); }, 2000);
}

function showMessages(x, y, messages) {
    if (messages.length == 0) {
        return;
    }
    showMessage(x, y, messages[0]);
    setTimeout(function() { showMessages(x, y, messages.slice(1)); }, 2200);
}

function displayHeat() {
	$("#heatgauge").html("" + Math.floor(Game.player.heatgauge) + " / " + (200*Game.player.nodes));
}

function takeWeight(toAdd) {
	var oldScoreLevel = Math.floor(Game.player.score / 200);
	Game.player.score += toAdd;
    eb.send("new-score", ebmsg(Game.player.score));
	Game.player.heatgauge += toAdd;
    eb.send("heat", ebmsg(Game.player.heatgauge));
	var newScoreLevel = Math.floor(Game.player.score / 200);
	if (oldScoreLevel != newScoreLevel) {
		showMessage(0, 100, "&nbsp;&nbsp;&nbsp;.d8888b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;d8b&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;d88P&nbsp;&nbsp;Y88b&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y8P&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;Y88b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;\"Y888b.&nbsp;&nbsp;&nbsp;88888b.&nbsp;&nbsp;&nbsp;.d88b.&nbsp;&nbsp;&nbsp;.d88b.&nbsp;&nbsp;&nbsp;.d88888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;88888b.&nbsp;&nbsp;&nbsp;.d8888b&nbsp;888d888&nbsp;.d88b.&nbsp;&nbsp;&nbsp;8888b.&nbsp;&nbsp;.d8888b&nbsp;&nbsp;&nbsp;.d88b.&nbsp;&nbsp;&nbsp;.d88888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"Y88b.&nbsp;888&nbsp;\"88b&nbsp;d8P&nbsp;&nbsp;Y8b&nbsp;d8P&nbsp;&nbsp;Y8b&nbsp;d88\"&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;\"88b&nbsp;d88P\"&nbsp;&nbsp;&nbsp;&nbsp;888P\"&nbsp;&nbsp;d8P&nbsp;&nbsp;Y8b&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"88b&nbsp;88K&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;d8P&nbsp;&nbsp;Y8b&nbsp;d88\"&nbsp;888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"888&nbsp;888&nbsp;&nbsp;888&nbsp;88888888&nbsp;88888888&nbsp;888&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;88888888&nbsp;.d888888&nbsp;\"Y8888b.&nbsp;88888888&nbsp;888&nbsp;&nbsp;888&nbsp;Y8P&nbsp;<br/>&nbsp;&nbsp;Y88b&nbsp;&nbsp;d88P&nbsp;888&nbsp;d88P&nbsp;Y8b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y8b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y88b&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;Y88b.&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;Y8b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;X88&nbsp;Y8b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y88b&nbsp;888&nbsp;&nbsp;\"&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;\"Y8888P\"&nbsp;&nbsp;88888P\"&nbsp;&nbsp;&nbsp;\"Y8888&nbsp;&nbsp;&nbsp;\"Y8888&nbsp;&nbsp;&nbsp;\"Y88888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;&nbsp;\"Y8888P&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"Y8888&nbsp;&nbsp;\"Y888888&nbsp;&nbsp;88888P'&nbsp;&nbsp;\"Y8888&nbsp;&nbsp;&nbsp;\"Y88888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>");
		Game.speedFactor++;
		eb.send("new-level", ebmsg(newScoreLevel));
		// Level up, new items may appear
		if (newScoreLevel == 2) {
		    // Enable cassandra & big apps
            for (i = 0; i < 5; i++) {
                Game.allTemplates.push({
                    w: 128,
                    h: 70,
                    background: "cassandra.png",
                    type: "scale"
                });
            }
            for (var i = 0; i < 2; i++) {
                Game.allTemplates.push({
                    w: 128,
                    h: 128,
                    background: "kubernetes.png",
                    type: "containers",
                    weight: 120,
                    behavior: {
                        name: "y-sinuzoid",
                        paramMin: 60,
                        paramMax: 110
                    }
                });
            }
            for (i = 0; i < 2; i++) {
                Game.allTemplates.push({
                    w: 128,
                    h: 128,
                    background: "openshift.png",
                    type: "containers",
                    weight: 250,
                    behavior: {
                        name: "y-sinuzoid",
                        paramMin: 80,
                        paramMax: 150
                    }
                });
            }
		}
		if (newScoreLevel == 3) {
		    // Enable victory (monocle)
            Game.allTemplates.push({
                w: 64,
                h: 64,
                background: "monocle.png",
                type: "goal",
                behavior: {
                    name: "y-sinuzoid",
                    paramMin: 60,
                    paramMax: 110
                }
            });
            Game.step += 5;
		}
		if (newScoreLevel == 4) {
		    // Enable flying spaghetti monster
            for (i = 0; i < 2; i++) {
                Game.allTemplates.push({
                    w: 128,
                    h: 116,
                    background: "fscm.png",
                    type: "fscm",
                    weight: 300,
                    behavior: {
                        name: "y-sinuzoid",
                        paramMin: 120,
                        paramMax: 190
                    }
                });
            }
		}
		if (newScoreLevel >= 6) {
		    // More and more monocles & monsters
            Game.allTemplates.push({
                w: 64,
                h: 64,
                background: "monocle.png",
                type: "goal",
                behavior: {
                    name: "y-sinuzoid",
                    paramMin: 60,
                    paramMax: 110
                }
            });
            Game.allTemplates.push({
                w: 128,
                h: 116,
                background: "fscm.png",
                type: "fscm",
                weight: 300,
                behavior: {
                    name: "y-sinuzoid",
                    paramMin: 120,
                    paramMax: 190
                }
            });
            Game.step += 5;
		}
	}
	$("#score").html(Game.player.score);
	displayHeat();
}

function cclccr_away(cclccrt) {
	if (cclccrt > -50) {
		$("#cclcq").css("top", cclccrt);
		setTimeout(function() { cclccr_away(cclccrt-5); }, 200);
	} else {
		$("#cclcq").remove();
		$("#cclc").remove();
	}
}

var cclccrok = false;
function cclccr() {
	if (cclccrok) {
		return;
	}
	var said = $(":input[name=cclcr]")[0].value;
	if (said == "How appropriate. You fight like a cow.") {
		cclccrok = true;
		var listToDelete = [];
		for (var i in Game.allObjects) {
			var obj = Game.allObjects[i];
			if (obj.type == "app") {
				explode(obj.getX() + obj.w/2, obj.getY() + obj.h/2);
				obj.div.remove();
				listToDelete[listToDelete.length] = i;
				takeWeight(obj.weight);
			}
		}
		for (var i = listToDelete.length - 1; i >= 0; i--) {
			Game.allObjects.splice(listToDelete[i], 1);
		}
		$("#cclcq").html("Ah, there's nothing like the hot winds of Hell blowing in your face!");
		setTimeout(function() { cclccr_away(95); }, 200);
	}
}

function cclcq() {
	var div = $(document.createElement('div'));
	div.css("position", "absolute");
	div.css("top", 100);
	div.css("left", 450);
	div.attr("id", "cclcq");
	div.html("You fight like a dairy farmer!!<br/><input type=text name=cclcr onkeyup='cclccr()'>");
	$("#game_container").append(div);
}

function cclc_show(cclct) {
	$("#cclc").show();
	if (cclct - 10 > 0) {
		setTimeout(function() { cclc_hide(cclct - 10); }, 200 / cclct);
	} else {
		cclcq();
	}
}

function cclc_hide(cclct) {
	$("#cclc").hide();
	setTimeout(function() { cclc_show(cclct - 10); }, 20 * cclct);
}

function cclc() {
	var div = $(document.createElement('div'));
	div.css("background", "url('cclc.gif')");
	div.css("position", "absolute");
	div.css("width", 184);
	div.css("height", 330);
	div.css("top", 100);
	div.css("left", 300);
	div.css("display", "none");
	div.attr("id", "cclc");
	$("#game_container").append(div);
	setTimeout(function() { cclc_show(100); }, 1000);
}

stillUp = false;
stillDown = false;
stillLeft = false;
stillRight = false;
function userInput(event) {
	if (!Game.gameLoop) {
		return;
	}
	var intKeyCode = event.keyCode;
	var intAltKey = event.altKey;
	var intCtrlKey = event.ctrlKey;
	if (intAltKey || intCtrlKey) {
	} else {
		if (intKeyCode == 39 || stillRight) {
			// RIGHT
			Game.player.moveTo(Game.step, 0);
			stillRight = true;
		}
		else if (intKeyCode == 37 || stillLeft) {
			// LEFT
			Game.player.moveTo(-Game.step, 0);
			stillLeft = true;
		}
		if (intKeyCode == 38 || stillUp) {
			// UP
			Game.player.moveTo(0, -Game.step);
			stillUp = true;
		}
		else if (intKeyCode == 40 || stillDown) {
			// DOWN
			Game.player.moveTo(0, Game.step);
			stillDown = true;
		}
		if (Game.ccsi < 6 && Game.ccs[Game.ccsi+1] == intKeyCode) {
			if (++Game.ccsi == 6) {
				cclc();
			}
		} else if (Game.ccsi < 6) {
			Game.ccsi = -1;
		}
	}
}

function releaseKey(event) {
	if (event.keyCode == 39) {
		stillRight = false;
	}
	else if (event.keyCode == 37) {
		stillLeft = false;
	}
	else if (event.keyCode == 38) {
		stillUp = false;
	}
	else if (event.keyCode == 40) {
		stillDown = false;
	}
}

function init() {
	$("#game_container").css("width", Game.screenWidth);
	$("#game_container").css("height", Game.screenHeight);
	$("#game_container").css("border", "1px solid green");
    eb.send("init-session", ebmsg());

	Game.player = createObject(10, 300, 0, 0, 0, 0, {
		w: 92,
		h: 118,
		background: "falco-anim.gif",
		type: "player"
	});
	Game.player.score = 0;
	Game.player.heatgauge = 100;
	Game.player.nodes = 1;

	for (var i = 0; i < 5; i++) {
        Game.allTemplates.push({
            w: 40,
            h: 64,
            background: "dropwizard.png",
            type: "app",
            weight: 15
        });
	}
	for (var i = 0; i < 10; i++) {
        Game.allTemplates.push({
            w: 96,
            h: 96,
            background: "java.png",
            type: "app",
            weight: 30
        });
	}
	for (i = 0; i < 10; i++) {
        Game.allTemplates.push({
            w: 64,
            h: 64,
            background: "vertx.png",
            type: "app",
            weight: 30
        });
	}
	for (i = 0; i < 7; i++) {
        Game.allTemplates.push({
            w: 96,
            h: 96,
            background: "wildfly.png",
            type: "app",
            weight: 50
        });
	}

	document.onkeydown = userInput;
	document.onkeyup = releaseKey;
	Game.gameLoop = setInterval(update, Game.delta);
	showMessages(Game.player.getX(), Game.player.getY(), [
   	     "My vision is blurred, what's going on? All pixels around!",
	     "My monocle... I have to retrieve my monocle!"]);

    setTimeout(function() {
        showMessages(400, 200, [
             "Look all those fancy apps",
             "I can monitor them, let's catch'em!"]);
    }, 10000);

    Game.metRefresh = setInterval(function() {
        eb.send("nodes", ebmsg(Game.player.nodes));
    }, 1000);
}

function createRandomObject() {
	var rnd = Math.floor(Math.random() * Game.allTemplates.length);
    var objTpl = Game.allTemplates[rnd];
    var obj = createObject(900, Math.floor(600*Math.random()), Game.speedFactor * (-30 - Math.random() * 60), 0, 0, 0, objTpl);
    if (objTpl.type == "containers" && !Game.seenContainers) {
        Game.seenContainers = true;
        showMessages(400, obj.getY(), [
             "Hey, I know that! It's containers!",
             "I sure I can monitor them as well"]);
    }
    if (objTpl.type == "goal" && !Game.seenMonocle) {
        Game.seenMonocle = true;
        showMessages(400, obj.getY(), [
             "What's that little thing?",
             "Wait... It's my monocle! Grab it and I'll have the sharpest vision!"]);
    }
    if (objTpl.type == "scale" && !Game.seenScale) {
        Game.seenScale = true;
        showMessages(400, obj.getY(), [
             "I recognize that, it's a Cassandra node",
             "With that I'll be able to scale up."]);
    }
    if (objTpl.type == "fscm" && !Game.seenFSCM) {
        Game.seenFSCM = true;
        showMessages(400, obj.getY(), [
             "Gosh, it's the Flying Spaghetti Code Monster!",
             "It's probably going to spit tons of crappy exceptions",
             "But, no matter, I'll do my job with it."]);
    }
    Game.allObjects.push(obj);
}

function explode(x, y) {
	var div = $(document.createElement('div'));
	div.css("background", "url('explode.gif')");
	div.css("position", "absolute");
	div.css("width", 61);
	div.css("height", 50);
	div.css("top", y - 25);
	div.css("left", x - 30);
	$("#game_container").append(div);
	setTimeout(function() { div.remove(); }, 1000);
}

function showCleanImages() {
    $("#hawkular_logo")
        .fadeOut(1000, function() {
            $("#hawkular_logo").attr("src", "hawkular_logo-clean.png");
        })
        .fadeIn(1000);
    $("#title")
        .fadeOut(1000, function() {
            $("#title").attr("src", "title-clean.png");
        })
        .fadeIn(1000);
    Game.player.div.css("background", "url('falco-clean.png')");
}

function gotMonocle(monocle) {
    showMessage(0, 100, "YYYYYYY&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;YYYYYYY&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OOOOOOOOO&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;UUUUUUUU&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;UUUUUUUU&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;WWWWWWWW&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;WWWWWWWWIIIIIIIIIINNNNNNNN&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NNNNNNNN<br/>Y:::::Y&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y:::::Y&nbsp;&nbsp;&nbsp;OO:::::::::OO&nbsp;&nbsp;&nbsp;U::::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;U::::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W::::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W::::::WI::::::::IN:::::::N&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;N::::::N<br/>Y:::::Y&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y:::::Y&nbsp;OO:::::::::::::OO&nbsp;U::::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;U::::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W::::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W::::::WI::::::::IN::::::::N&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;N::::::N<br/>Y::::::Y&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y::::::YO:::::::OOO:::::::OUU:::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;U:::::UU&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W::::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W::::::WII::::::IIN:::::::::N&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;N::::::N<br/>YYY:::::Y&nbsp;&nbsp;&nbsp;Y:::::YYYO::::::O&nbsp;&nbsp;&nbsp;O::::::O&nbsp;U:::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;U:::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;WWWWW&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;I::::I&nbsp;&nbsp;N::::::::::N&nbsp;&nbsp;&nbsp;&nbsp;N::::::N<br/>&nbsp;&nbsp;&nbsp;Y:::::Y&nbsp;Y:::::Y&nbsp;&nbsp;&nbsp;O:::::O&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O:::::O&nbsp;U:::::D&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;D:::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;I::::I&nbsp;&nbsp;N:::::::::::N&nbsp;&nbsp;&nbsp;N::::::N<br/>&nbsp;&nbsp;&nbsp;&nbsp;Y:::::Y:::::Y&nbsp;&nbsp;&nbsp;&nbsp;O:::::O&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O:::::O&nbsp;U:::::D&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;D:::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I::::I&nbsp;&nbsp;N:::::::N::::N&nbsp;&nbsp;N::::::N<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y:::::::::Y&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O:::::O&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O:::::O&nbsp;U:::::D&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;D:::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I::::I&nbsp;&nbsp;N::::::N&nbsp;N::::N&nbsp;N::::::N<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y:::::::Y&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O:::::O&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O:::::O&nbsp;U:::::D&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;D:::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;W:::::W:::::W&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I::::I&nbsp;&nbsp;N::::::N&nbsp;&nbsp;N::::N:::::::N<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y:::::Y&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O:::::O&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O:::::O&nbsp;U:::::D&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;D:::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;W:::::W&nbsp;W:::::W&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I::::I&nbsp;&nbsp;N::::::N&nbsp;&nbsp;&nbsp;N:::::::::::N<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y:::::Y&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O:::::O&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O:::::O&nbsp;U:::::D&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;D:::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W:::::W&nbsp;&nbsp;&nbsp;W:::::W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I::::I&nbsp;&nbsp;N::::::N&nbsp;&nbsp;&nbsp;&nbsp;N::::::::::N<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y:::::Y&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O::::::O&nbsp;&nbsp;&nbsp;O::::::O&nbsp;U::::::U&nbsp;&nbsp;&nbsp;U::::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I::::I&nbsp;&nbsp;N::::::N&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;N:::::::::N<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y:::::Y&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O:::::::OOO:::::::O&nbsp;U:::::::UUU:::::::U&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;II::::::IIN::::::N&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;N::::::::N<br/>&nbsp;&nbsp;&nbsp;&nbsp;YYYY:::::YYYY&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OO:::::::::::::OO&nbsp;&nbsp;&nbsp;UU:::::::::::::UU&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I::::::::IN::::::N&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;N:::::::N<br/>&nbsp;&nbsp;&nbsp;&nbsp;Y:::::::::::Y&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OO:::::::::OO&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;UU:::::::::UU&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W:::W&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I::::::::IN::::::N&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;N::::::N<br/>&nbsp;&nbsp;&nbsp;&nbsp;YYYYYYYYYYYYY&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OOOOOOOOO&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;UUUUUUUUU&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;WWW&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;WWW&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;IIIIIIIIIINNNNNNNN&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NNNNNNN<br/>")
    showCleanImages();
	for (var i in Game.allObjects) {
		var obj = Game.allObjects[i];
		if (obj != monocle && obj.type != "player") {
            explode(obj.getX() + obj.w/2, obj.getY() + obj.h/2);
            obj.div.remove();
		}
    }
    Game.allObjects = [];
    clearInterval(Game.gameLoop);
    Game.gameLoop = undefined;
    clearInterval(Game.metRefresh);
    Game.metRefresh = undefined;
    eb.send("won", ebmsg());
}

function setDead() {
    showMessage(0, 100, "&nbsp;.----------------.&nbsp;&nbsp;.----------------.&nbsp;&nbsp;.----------------.&nbsp;&nbsp;.----------------.&nbsp;<br/>|&nbsp;.--------------.&nbsp;||&nbsp;.--------------.&nbsp;||&nbsp;.--------------.&nbsp;||&nbsp;.--------------.&nbsp;|<br/>|&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;______&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;__&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;____&nbsp;&nbsp;&nbsp;&nbsp;____&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;_________&nbsp;&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;&nbsp;.'&nbsp;___&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;\\&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;||_&nbsp;&nbsp;&nbsp;\\&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;_||&nbsp;||&nbsp;|&nbsp;|_&nbsp;&nbsp;&nbsp;___&nbsp;&nbsp;|&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;/&nbsp;.'&nbsp;&nbsp;&nbsp;\\_|&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;/\\&nbsp;\\&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;\\/&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;|&nbsp;|_&nbsp;&nbsp;\\_|&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;|&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;____&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;/&nbsp;____&nbsp;\\&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;|&nbsp;|\\&nbsp;&nbsp;/|&nbsp;|&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;_|&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;\\&nbsp;`.___]&nbsp;&nbsp;_|&nbsp;|&nbsp;||&nbsp;|&nbsp;_/&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;\\&nbsp;\\_&nbsp;|&nbsp;||&nbsp;|&nbsp;_|&nbsp;|_\\/_|&nbsp;|_&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;_|&nbsp;|___/&nbsp;|&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;&nbsp;`._____.'&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;||____|&nbsp;&nbsp;|____||&nbsp;||&nbsp;||_____||_____||&nbsp;||&nbsp;|&nbsp;|_________|&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;'--------------'&nbsp;||&nbsp;'--------------'&nbsp;||&nbsp;'--------------'&nbsp;||&nbsp;'--------------'&nbsp;|<br/>&nbsp;'----------------'&nbsp;&nbsp;'----------------'&nbsp;&nbsp;'----------------'&nbsp;&nbsp;'----------------'&nbsp;<br/>&nbsp;.----------------.&nbsp;&nbsp;.----------------.&nbsp;&nbsp;.----------------.&nbsp;&nbsp;.----------------.&nbsp;<br/>|&nbsp;.--------------.&nbsp;||&nbsp;.--------------.&nbsp;||&nbsp;.--------------.&nbsp;||&nbsp;.--------------.&nbsp;|<br/>|&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;____&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;____&nbsp;&nbsp;&nbsp;____&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;_________&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;_______&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;&nbsp;&nbsp;.'&nbsp;&nbsp;&nbsp;&nbsp;`.&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;||_&nbsp;&nbsp;_|&nbsp;|_&nbsp;&nbsp;_|&nbsp;|&nbsp;||&nbsp;|&nbsp;|_&nbsp;&nbsp;&nbsp;___&nbsp;&nbsp;|&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;|_&nbsp;&nbsp;&nbsp;__&nbsp;\\&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;&nbsp;/&nbsp;&nbsp;.--.&nbsp;&nbsp;\\&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;\\&nbsp;\\&nbsp;&nbsp;&nbsp;/&nbsp;/&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;|&nbsp;|_&nbsp;&nbsp;\\_|&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;|&nbsp;|__)&nbsp;|&nbsp;&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;&nbsp;|&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;|&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;\\&nbsp;\\&nbsp;/&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;_|&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;__&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;&nbsp;\\&nbsp;&nbsp;`--'&nbsp;&nbsp;/&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;\\&nbsp;'&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;_|&nbsp;|___/&nbsp;|&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;_|&nbsp;|&nbsp;&nbsp;\\&nbsp;\\_&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;&nbsp;&nbsp;`.____.'&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\\_/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;|_________|&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;|____|&nbsp;|___|&nbsp;|&nbsp;|<br/>|&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;||&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;|<br/>|&nbsp;'--------------'&nbsp;||&nbsp;'--------------'&nbsp;||&nbsp;'--------------'&nbsp;||&nbsp;'--------------'&nbsp;|<br/>&nbsp;'----------------'&nbsp;&nbsp;'----------------'&nbsp;&nbsp;'----------------'&nbsp;&nbsp;'----------------'&nbsp;")
    showCleanImages();
    Game.player.div.css("-webkit-transform", "rotate(180deg)");
    Game.player.div.css("transform", "rotate(180deg)");
    explode(Game.player.getX() + Game.player.w/2, Game.player.getY() + Game.player.h/2);
	for (var i in Game.allObjects) {
		var obj = Game.allObjects[i];
		if (obj.type != "player") {
            explode(obj.getX() + obj.w/2, obj.getY() + obj.h/2);
            obj.div.remove();
		}
    }
    Game.allObjects = [];
    clearInterval(Game.gameLoop);
    Game.gameLoop = undefined;
    clearInterval(Game.metRefresh);
    Game.metRefresh = undefined;
    eb.send("game-over", ebmsg());
}

function update() {
	var listToDelete = [];
	for (var i in Game.allObjects) {
		var obj = Game.allObjects[i];
		if (obj.type != "player") {
			obj.move();
			if (obj.collide(Game.player)) {
				listToDelete[listToDelete.length] = i;
				obj.div.remove();
        		if (obj.weight) {
                    // Is overheated?
                    if (Game.player.heatgauge > 200 * Game.player.nodes) {
                        if (!Game.explainedHeat) {
                            Game.explainedHeat = true;
                            showMessages(Game.player.getX(), Game.player.getY(), [
                                 "Errrr I can't do that. I'm full, see my heat gauge.",
                                 "I wonder if they're ways to scale up..."]);
                        }
                        eb.send("overheated", ebmsg());
                        explode(obj.getX() + obj.w/2, obj.getY() + obj.h/2);
                    } else {
        				takeWeight(obj.weight);
        				if (obj.type == "fscm") {
                            eb.send("fscm", ebmsg());
        				}
                    }
                } else if (obj.type == "scale") {
                    Game.player.nodes++;
	                $("#nodes").html(Game.player.nodes);
                    eb.send("nodes", ebmsg(Game.player.nodes));
                } else if (obj.type == "goal") {
                    gotMonocle(obj);
                }
			} else if (obj.x < -30) {
				listToDelete[listToDelete.length] = i;
				obj.div.remove();
			}
        }
	}
	for (var i = listToDelete.length - 1; i >= 0; i--) {
		Game.allObjects.splice(listToDelete[i], 1);
	}
	if (Math.random() < 0.05) {
		createRandomObject();
	}
	var coolDown = Game.speedFactor * 30 / Game.delta;
	Game.player.heatgauge -= coolDown;
	displayHeat();
    eb.send("heat", ebmsg(Game.player.heatgauge));
	if (Game.player.heatgauge <= 0) {
	    // DEATH!
	    setDead();
	}
}
