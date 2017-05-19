var eb = new EventBus('/eventbus/');

eb.onopen = function () {
  eb.registerHandler('feed', function (err, msg) {
      $('#log').html('<div>' + msg.body.now + '</div>');
  });
};

player = undefined;
allObjects = [];
allTemplates = [];
delta = 100;
step = 10;
gameLoop = undefined;
screenWidth = 900;
screenHeight = 600;
reloadTime = 0;
ccs = [76, 69, 67, 72, 85, 67, 75];
ccsi = -1;
speedFactor = 1;

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
				this.x += this.dx * delta / 1000;
			}
			if (this.dy != 0) {
				this.y += this.dy * delta / 1000;
			}
			if (this.ax != 0) {
				this.dx += this.ax * delta / 1000;
			}
			if (this.ay != 0) {
				this.dy += this.ay * delta / 1000;
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
		hp: objTpl.hp,
		score: objTpl.score,
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
			if (Math.abs((otherObject.motion.x + otherObject.w/2) - (this.motion.x + this.w/2)) < (otherObject.w + this.w) / 2
				&& Math.abs((otherObject.motion.y + otherObject.h/2) - (this.motion.y + this.h/2)) < (otherObject.h + this.h) / 2)
			{
				return true;
			} else {
				return false;
			}
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

function addScore(toAdd) {
	var oldScoreLevel = Math.floor(player.score / 200);
	player.score += toAdd;
	var newScoreLevel = Math.floor(player.score / 200);
	if (oldScoreLevel != newScoreLevel) {
		showMessage(0, 100, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;d8888&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888b&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;d888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;d88888&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;8888b&nbsp;&nbsp;&nbsp;d8888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;d88P888&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;88888b.d88888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;d88P&nbsp;888&nbsp;88888b.&nbsp;&nbsp;&nbsp;.d88b.&nbsp;&nbsp;888&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888Y88888P888&nbsp;&nbsp;8888b.&nbsp;&nbsp;888888&nbsp;.d88b.&nbsp;&nbsp;888&nbsp;&nbsp;888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;d88P&nbsp;&nbsp;888&nbsp;888&nbsp;\"88b&nbsp;d88\"\"88b&nbsp;888&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;Y888P&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"88b&nbsp;888&nbsp;&nbsp;&nbsp;d8P&nbsp;&nbsp;Y8b&nbsp;888&nbsp;&nbsp;888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;d88P&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;Y8P&nbsp;&nbsp;888&nbsp;.d888888&nbsp;888&nbsp;&nbsp;&nbsp;88888888&nbsp;888&nbsp;&nbsp;888&nbsp;Y8P&nbsp;<br/>&nbsp;d8888888888&nbsp;888&nbsp;&nbsp;888&nbsp;Y88..88P&nbsp;Y88b&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;\"&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;Y88b.&nbsp;Y8b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y88b&nbsp;888&nbsp;&nbsp;\"&nbsp;&nbsp;<br/>d88P&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;&nbsp;\"Y88P\"&nbsp;&nbsp;&nbsp;\"Y88888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;\"Y888888&nbsp;&nbsp;\"Y888&nbsp;\"Y8888&nbsp;&nbsp;&nbsp;\"Y88888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y8b&nbsp;d88P&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y8b&nbsp;d88P&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"Y88P\"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"Y88P\"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/><br/>&nbsp;.d8888b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;d8b&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;<br/>d88P&nbsp;&nbsp;Y88b&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y8P&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;<br/>Y88b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;<br/>&nbsp;\"Y888b.&nbsp;&nbsp;&nbsp;88888b.&nbsp;&nbsp;&nbsp;.d88b.&nbsp;&nbsp;&nbsp;.d88b.&nbsp;&nbsp;&nbsp;.d88888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;88888b.&nbsp;&nbsp;&nbsp;.d8888b&nbsp;888d888&nbsp;.d88b.&nbsp;&nbsp;&nbsp;8888b.&nbsp;&nbsp;.d8888b&nbsp;&nbsp;&nbsp;.d88b.&nbsp;&nbsp;&nbsp;.d88888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;\"Y88b.&nbsp;888&nbsp;\"88b&nbsp;d8P&nbsp;&nbsp;Y8b&nbsp;d8P&nbsp;&nbsp;Y8b&nbsp;d88\"&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;\"88b&nbsp;d88P\"&nbsp;&nbsp;&nbsp;&nbsp;888P\"&nbsp;&nbsp;d8P&nbsp;&nbsp;Y8b&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"88b&nbsp;88K&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;d8P&nbsp;&nbsp;Y8b&nbsp;d88\"&nbsp;888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"888&nbsp;888&nbsp;&nbsp;888&nbsp;88888888&nbsp;88888888&nbsp;888&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;88888888&nbsp;.d888888&nbsp;\"Y8888b.&nbsp;88888888&nbsp;888&nbsp;&nbsp;888&nbsp;Y8P&nbsp;<br/>Y88b&nbsp;&nbsp;d88P&nbsp;888&nbsp;d88P&nbsp;Y8b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y8b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y88b&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;Y88b.&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;Y8b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;X88&nbsp;Y8b.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Y88b&nbsp;888&nbsp;&nbsp;\"&nbsp;&nbsp;<br/>&nbsp;\"Y8888P\"&nbsp;&nbsp;88888P\"&nbsp;&nbsp;&nbsp;\"Y8888&nbsp;&nbsp;&nbsp;\"Y8888&nbsp;&nbsp;&nbsp;\"Y88888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;&nbsp;\"Y8888P&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"Y8888&nbsp;&nbsp;\"Y888888&nbsp;&nbsp;88888P'&nbsp;&nbsp;\"Y8888&nbsp;&nbsp;&nbsp;\"Y88888&nbsp;888&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>");
		speedFactor++;
	}
	$("#score").html(player.score);
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
		for (var i in allObjects) {
			var obj = allObjects[i];
			if (obj.type == "foe") {
				explode(obj.getX() + obj.w/2, obj.getY() + obj.h/2);
				obj.div.remove();
				listToDelete[listToDelete.length] = i;
				addScore(obj.score);
			}
		}
		for (var i = listToDelete.length - 1; i >= 0; i--) {
			allObjects.splice(listToDelete[i], 1);
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
stillSpace = false;
function userInput(event) {
	if (!gameLoop) {
		return;
	}
	var intKeyCode = event.keyCode;
	var intAltKey = event.altKey;
	var intCtrlKey = event.ctrlKey;
	if (intAltKey || intCtrlKey) {
	} else {
		if (intKeyCode == 39 || stillRight) {
			// RIGHT
			player.moveTo(step, 0);
			stillRight = true;
		}
		else if (intKeyCode == 37 || stillLeft) {
			// LEFT
			player.moveTo(-step, 0);
			stillLeft = true;
		}
		if (intKeyCode == 38 || stillUp) {
			// UP
			player.moveTo(0, -step);
			stillUp = true;
		}
		else if (intKeyCode == 40 || stillDown) {
			// DOWN
			player.moveTo(0, step);
			stillDown = true;
		}
		if (intKeyCode == 32 && !stillSpace) {
			// Spacebar
			if (reloadTime <= 0) {
				reloadTime = 5;
				stillSpace = true;
			}
		}
		if (ccsi < 6 && ccs[ccsi+1] == intKeyCode) {
			if (++ccsi == 6) {
				cclc();
			}
		} else if (ccsi < 6) {
			ccsi = -1;
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
	else if (event.keyCode == 32) {
		stillSpace = false;
	}
}

function init() {
	$("#game_container").css("width", screenWidth);
	$("#game_container").css("height", screenHeight);
	$("#game_container").css("border", "1px solid green");

	player = createObject(10, 300, 0, 0, 0, 0, {
		w: 92,
		h: 118,
		background: "falco-anim.gif",
		type: "player",
		hp: 1,
		score: 0
	});

	var iTpl = 0;
	// bug in firefox??? left operand of operator= is interpreted BEFORE right operand. So can't write "allTemplates[iTpl++]" because iTpl is used in later right operands.
	allTemplates[iTpl] = {
		w: 32,
		h: 32,
		background: "cd_32.gif",
		type: "bonus",
		hp: 0,
		score: 5,
		idxRnd: 10
	}
	iTpl++;
	allTemplates[iTpl] = {
		w: 128,
		h: 29,
		background: "sony_128_29.gif",
		type: "foe",
		hp: 2,
		score: 10,
		idxRnd: 4 + allTemplates[iTpl-1].idxRnd,
		behavior: {
			name: "y-sinuzoid",
			paramMin: 40,
			paramMax: 70
		}
	}
	iTpl++;
	allTemplates[iTpl] = {
		w: 264,
		h: 128,
		background: "acta_264_128.gif",
		type: "foe",
		hp: 15,
		score: 200,
		idxRnd: 1 + allTemplates[iTpl-1].idxRnd
	}
	iTpl++;
	allTemplates[iTpl] = {
		w: 64,
		h: 64,
		background: "apple_64.gif",
		type: "foe",
		hp: 3,
		score: 20,
		idxRnd: 3 + allTemplates[iTpl-1].idxRnd,
		behavior: {
			name: "y-sinuzoid",
			paramMin: 60,
			paramMax: 110
		}
	}
	iTpl++;
	allTemplates[iTpl] = {
		w: 48,
		h: 48,
		background: "commons_48.gif",
		type: "bonus",
		hp: 0,
		score: 15,
		idxRnd: 3 + allTemplates[iTpl-1].idxRnd
	}
	iTpl++;
	allTemplates[iTpl] = {
		w: 112,
		h: 112,
		background: "hadopi_112.gif",
		type: "foe",
		hp: 5,
		score: 50,
		idxRnd: 2 + allTemplates[iTpl-1].idxRnd
	}
	iTpl++;
	allTemplates[iTpl] = {
		w: 32,
		h: 32,
		background: "mp3_32.gif",
		type: "bonus",
		hp: 0,
		score: 5,
		idxRnd: 10 + allTemplates[iTpl-1].idxRnd
	}
	iTpl++;
	allTemplates[iTpl] = {
		w: 64,
		h: 64,
		background: "pirate_64.gif",
		type: "bonus",
		hp: 0,
		score: 20,
		idxRnd: 3 + allTemplates[iTpl-1].idxRnd
	}
	iTpl++;
	allTemplates[iTpl] = {
		w: 64,
		h: 64,
		background: "quadrature_64.gif",
		type: "bonus",
		hp: 0,
		score: 20,
		idxRnd: 3 + allTemplates[iTpl-1].idxRnd
	}
	iTpl++;
	allTemplates[iTpl] = {
		w: 64,
		h: 64,
		background: "tux_64.gif",
		type: "bonus",
		hp: 0,
		score: 30,
		idxRnd: 2 + allTemplates[iTpl-1].idxRnd
	}
	iTpl++;
	allTemplates[iTpl] = {
		w: 64,
		h: 64,
		background: "windows_64.gif",
		type: "foe",
		hp: 3,
		score: 20,
		idxRnd: 3 + allTemplates[iTpl-1].idxRnd,
		behavior: {
			name: "y-sinuzoid",
			paramMin: 60,
			paramMax: 110
		}
	}
	iTpl++;

	document.onkeydown = userInput;
	document.onkeyup = releaseKey;
	gameLoop = setInterval(update, delta);
}

function createRandomObject() {
	var rnd = Math.floor(Math.random() * allTemplates[allTemplates.length - 1].idxRnd);
	for (var iTpl in allTemplates) {
		var objTpl = allTemplates[iTpl];
		if (rnd < objTpl.idxRnd) {
			allObjects[allObjects.length] = createObject(900, Math.floor(600*Math.random()), speedFactor * (-30 - Math.random() * 60), 0, 0, 0, objTpl);
			break;
		}
	}
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

function gotMonocle() {
    showMessage(0, 100, "&nbsp;_____&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;<br/>|_&nbsp;&nbsp;&nbsp;_|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;|<br/>&nbsp;&nbsp;|&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;___&nbsp;__&nbsp;_&nbsp;_&nbsp;__&nbsp;&nbsp;&nbsp;&nbsp;___&nbsp;&nbsp;___&nbsp;&nbsp;___&nbsp;&nbsp;&nbsp;&nbsp;___|&nbsp;|&nbsp;___&nbsp;&nbsp;__&nbsp;_&nbsp;&nbsp;__&nbsp;_&nbsp;&nbsp;__&nbsp;_&nbsp;&nbsp;__&nbsp;_&nbsp;&nbsp;__&nbsp;_&nbsp;_&nbsp;__|&nbsp;|_&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;_&nbsp;__&nbsp;&nbsp;&nbsp;_____&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_|&nbsp;|<br/>&nbsp;&nbsp;|&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;__/&nbsp;_`&nbsp;|&nbsp;'_&nbsp;\\&nbsp;&nbsp;/&nbsp;__|/&nbsp;_&nbsp;\\/&nbsp;_&nbsp;\\&nbsp;&nbsp;/&nbsp;__|&nbsp;|/&nbsp;_&nbsp;\\/&nbsp;_`&nbsp;|/&nbsp;_`&nbsp;|/&nbsp;_`&nbsp;|/&nbsp;_`&nbsp;|/&nbsp;_`&nbsp;|&nbsp;'__|&nbsp;|&nbsp;|&nbsp;|&nbsp;|&nbsp;|&nbsp;'_&nbsp;\\&nbsp;/&nbsp;_&nbsp;\\&nbsp;\\&nbsp;/\\&nbsp;/&nbsp;/&nbsp;|<br/>&nbsp;_|&nbsp;|_&nbsp;&nbsp;|&nbsp;(_|&nbsp;(_|&nbsp;|&nbsp;|&nbsp;|&nbsp;|&nbsp;\\__&nbsp;\\&nbsp;&nbsp;__/&nbsp;&nbsp;__/&nbsp;|&nbsp;(__|&nbsp;|&nbsp;&nbsp;__/&nbsp;(_|&nbsp;|&nbsp;(_|&nbsp;|&nbsp;(_|&nbsp;|&nbsp;(_|&nbsp;|&nbsp;(_|&nbsp;|&nbsp;|&nbsp;&nbsp;|&nbsp;|&nbsp;|_|&nbsp;|&nbsp;|&nbsp;|&nbsp;|&nbsp;|&nbsp;(_)&nbsp;\\&nbsp;V&nbsp;&nbsp;V&nbsp;/|_|<br/>&nbsp;\\___/&nbsp;&nbsp;&nbsp;\\___\\__,_|_|&nbsp;|_|&nbsp;|___/\\___|\\___|&nbsp;&nbsp;\\___|_|\\___|\\__,_|\\__,_|\\__,_|\\__,_|\\__,_|_|&nbsp;&nbsp;|_|\\__,&nbsp;|&nbsp;|_|&nbsp;|_|\\___/&nbsp;\\_/\\_/&nbsp;(_)<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;__/&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|___/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>")
    $("#hawkular_logo").attr("src", "hawkular_logo-clean.png");
    player.div.css("background", "url('falco-clean.png')");
	for (var i in allObjects) {
		var obj = allObjects[i];
		if (obj.type != "player") {
            explode(obj.getX() + obj.w/2, obj.getY() + obj.h/2);
            obj.div.remove();
		}
    }
    allObjects = [];
    clearInterval(gameLoop);
    gameLoop = undefined;
}

function update() {
	var listToDelete = [];
	for (var i in allObjects) {
		var obj = allObjects[i];
		if (obj.type == "bonus") {
			obj.move();
			if (obj.collide(player)) {
				listToDelete[listToDelete.length] = i;
				obj.div.remove();
				addScore(obj.score);
				gotMonocle();
			}
			else if (obj.x < -30) {
				listToDelete[listToDelete.length] = i;
				obj.div.remove();
			}
		}
		else if (obj.type == "foe") {
			obj.move();
			if (obj.collide(player)) {
				// YOU LOOSE !!
				explode(player.getX(), player.getY() + player.h/2);
				explode(player.getX() + player.w/2, player.getY() + player.h/2);
				explode(player.getX() + player.w, player.getY() + player.h/2);
				clearInterval(gameLoop);
				gameLoop = undefined;
			}
			else if (obj.getX() < -30) {
				listToDelete[listToDelete.length] = i;
				obj.div.remove();
			}
		}
	}
	for (var i = listToDelete.length - 1; i >= 0; i--) {
		allObjects.splice(listToDelete[i], 1);
	}
	if (Math.random() < 0.05) {
		createRandomObject();
	}
	if (reloadTime > 0) {
		reloadTime--;
	}
}

$(document).ready(function() {
	init();
});
