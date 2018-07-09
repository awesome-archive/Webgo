
(function(WGo){

var ScoreMode = function(position, board, komi, output) {
	this.originalPosition = position;
	this.position = position.clone();
	this.board = board;
	this.komi = komi;
	this.output = output;
}

var state = ScoreMode.state = {
	UNKNOWN: 0,
	BLACK_STONE: 1, // must be equal to WGo.B
	WHITE_STONE: -1, // must be equal to WGo.W
	BLACK_CANDIDATE: 2,
	WHITE_CANDIDATE: -2,
	BLACK_NEUTRAL: 3,
	WHITE_NEUTRAL: -3,
	NEUTRAL: 4,
}

var territory_set = function(pos, x, y, color, margin) {
	var p = pos.get(x, y);
	if(p === undefined || p == color || p == margin) return;
	
	pos.set(x, y, color);
	
	territory_set(pos, x-1, y, color, margin);
	territory_set(pos, x, y-1, color, margin);
	territory_set(pos, x+1, y, color, margin);
	territory_set(pos, x, y+1, color, margin);
}

var territory_reset = function(pos, orig, x, y, margin) {
	var o = orig.get(x, y);
	if(pos.get(x, y) == o) return;
	
	pos.set(x, y, o);
	territory_reset(pos, orig, x-1, y, margin);
	territory_reset(pos, orig, x, y-1, margin);
	territory_reset(pos, orig, x+1, y, margin);
	territory_reset(pos, orig, x, y+1, margin);
}

ScoreMode.prototype.start = function() {
	this.calculate();
	this.saved_state = this.board.getState();
	this.displayScore();
	
	this._click = (function(x,y) {
		var c = this.originalPosition.get(x,y);
		
		if(c == WGo.W) {
			if(this.position.get(x, y) == state.WHITE_STONE) territory_set(this.position, x, y, state.BLACK_CANDIDATE, state.BLACK_STONE);
			else {
				territory_reset(this.position, this.originalPosition, x, y, state.BLACK_STONE);
				this.calculate();
			}
		}
		else if(c == WGo.B) {
			if(this.position.get(x, y) == state.BLACK_STONE) territory_set(this.position, x, y, state.WHITE_CANDIDATE, state.WHITE_STONE);
			else {
				territory_reset(this.position, this.originalPosition, x, y, state.WHITE_STONE);
				this.calculate();
			}
		}
		else {
			var p = this.position.get(x, y);
			
			if(p == state.BLACK_CANDIDATE) this.position.set(x, y, state.BLACK_NEUTRAL);
			else if(p == state.WHITE_CANDIDATE) this.position.set(x, y, state.WHITE_NEUTRAL);
			else if(p == state.BLACK_NEUTRAL) this.position.set(x, y, state.BLACK_CANDIDATE);
			else if(p == state.WHITE_NEUTRAL) this.position.set(x, y, state.WHITE_CANDIDATE);
		}
		
		this.board.restoreState({objects: WGo.clone(this.saved_state.objects)});
		this.displayScore();
	}).bind(this);
	
	this.board.addEventListener("click", this._click);
}

ScoreMode.prototype.end = function() {
	this.board.restoreState({objects: WGo.clone(this.saved_state.objects)});
	this.board.removeEventListener("click", this._click);
}

ScoreMode.prototype.displayScore = function() {
	var score = {
		black: [],
		white: [],
		neutral: [],
		black_captured: [],
		white_captured: [],
	}
    
    var b_total=0, b_pass=0, w_total=0, w_pass=0;
    var n = player.kifu.root;
    for ( i=0; i< player.kifuReader.path.m; i++) {
        //console.log(i);
        if (n.children.length!=0) {
            if (player.kifuReader.path[i+1]) {
                //console.log(i+1, "select ", player.kifuReader.path[i+1], " children");
                n = n.children[player.kifuReader.path[i+1]];
            } else {
                n = n.children[0];
            }
        }
        if(n.move.pass) {
            //console.log(i+1, "pass", n.move.c);
            //movelist.push({x:n.move.x, y:n.move.y, c:n.move.c})
            if (n.move.c == WGo.B) {
                b_pass++;
            } else if (n.move.c == WGo.W) {
                w_pass++;
            }
        } else {
            //console.log(i+1, n.move.x, n.move.y, n.move.c);
            //movelist.push({x:n.move.x, y:n.move.y, c:n.move.c})
            if (n.move.c == WGo.B) {
                b_total++;
            } else if (n.move.c == WGo.W) {
                w_total++;
            }
        }
    }
    console.log("B: ",b_total," W: ",w_total," B_pass: ",b_pass," W_pass: ",w_pass)
	
	for(var i = 0; i < this.position.size; i++) {
		for(var j = 0; j < this.position.size; j++) {
			s = this.position.get(i,j);
			t = this.originalPosition.get(i,j);
			
			if(s == state.BLACK_CANDIDATE) score.black.push({x: i, y: j, type: "mini", c: WGo.B});
			else if(s == state.WHITE_CANDIDATE) score.white.push({x: i, y: j, type: "mini", c: WGo.W});
			else if(s == state.NEUTRAL) score.neutral.push({x: i, y: j});
			
			if(t == WGo.W && s != state.WHITE_STONE) score.white_captured.push({x: i, y: j, type: "outline", c: WGo.W});
			else if(t == WGo.B && s != state.BLACK_STONE) score.black_captured.push({x: i, y: j, type: "outline", c: WGo.B});
		}
	}
	
	for(var i = 0; i < score.black_captured.length; i++) {
		this.board.removeObjectsAt(score.black_captured[i].x, score.black_captured[i].y);
	}
	
	for(var i = 0; i < score.white_captured.length; i++) {
		this.board.removeObjectsAt(score.white_captured[i].x, score.white_captured[i].y);
	}
	
	this.board.addObject(score.white_captured);
	this.board.addObject(score.black_captured);
	this.board.addObject(score.black);
	this.board.addObject(score.white);
	
	var msg = "<p style='font-weight: bold;'>"+WGo.t("RE")+"</p>";
	
	var sb = score.black.length+score.white_captured.length+this.originalPosition.capCount.black;
	var sw = score.white.length+score.black_captured.length+this.originalPosition.capCount.white+parseFloat(this.komi);
	
    var black_live=b_total-(score.black_captured.length+this.originalPosition.capCount.white);
    var white_live=w_total-(score.white_captured.length+this.originalPosition.capCount.black);
    var black_area=black_live+score.black.length;
    var white_area=white_live+score.white.length;
    console.log("chinese rule ", "B area: ", black_area, "W area: ", white_area);
	msg += "<p>"+WGo.t("black")+": "+score.black.length+" + "+(score.white_captured.length+this.originalPosition.capCount.black)+" = "+sb+" ("+black_area+")"+"</br>";
	msg += WGo.t("white")+": "+score.white.length+" + "+(score.black_captured.length+this.originalPosition.capCount.white)+" + "+this.komi+" = "+sw+" ("+white_area+" + "+this.komi+")"+"</p>";
    
	if(sb > sw) msg += "<p style='font-weight: bold;'>"+WGo.t("bwin", sb-sw);
	else msg += "<p style='font-weight: bold;'>"+WGo.t("wwin", sw-sb);
    
    white_area += parseFloat(this.komi);
    console.log("chinese rule ", "B area: ", black_area, "W area: ", white_area, " komi: ", parseFloat(this.komi));
    if(black_area>white_area) msg += " ("+WGo.t("bwin", black_area-white_area)+") </p>";
	else msg += " ("+WGo.t("wwin", white_area-black_area)+") </p>";
	
	this.output(msg);
}

ScoreMode.prototype.calculate = function() {
	var p, s, t, b, w, change;
	
	// 1. create testing position, empty fields has flag ScoreMode.UNKNOWN
	p = this.position;
	
	// 2. repeat until there is some change of state:
	change = true;
	while(change) {
		change = false;
		
		// go through the whole position
		for(var i = 0; i < p.size; i++) {
			//var str = "";
			for(var j = 0; j < p.size; j++) {
				s = p.get(j,i);
				
				if(s == state.UNKNOWN || s == state.BLACK_CANDIDATE || s == state.WHITE_CANDIDATE) {
					// get new state
					t = [p.get(j-1, i), p.get(j, i-1), p.get(j+1, i), p.get(j, i+1)];
					b = false;
					w = false;

					for(var k = 0; k < 4; k++) {
						if(t[k] == state.BLACK_STONE || t[k] == state.BLACK_CANDIDATE) b = true;
						else if(t[k] == state.WHITE_STONE || t[k] == state.WHITE_CANDIDATE) w = true;
						else if(t[k] == state.NEUTRAL) {
							b = true;
							w = true;
						}
					}
					
					t = false;
					
					if(b && w) t = state.NEUTRAL;
					else if(b) t = state.BLACK_CANDIDATE;
					else if(w) t = state.WHITE_CANDIDATE;
					
					if(t && s != t) {
						change = true;
						p.set(j, i, t);
					}
				}
				//str += (p.get(j,i)+5)+" ";
			}
			//console.log(str);
		}
		//console.log("------------------------------------------------------------");
	}
}

WGo.ScoreMode = ScoreMode;

if(WGo.BasicPlayer && WGo.BasicPlayer.component.Control) {
	WGo.BasicPlayer.component.Control.menu.push({
		constructor: WGo.BasicPlayer.control.MenuItem,
		args: {
			name: "scoremode",
			togglable: true,
			click: function(player) { 
				if(this.selected) {
					player.setFrozen(false);
					this._score_mode.end();
					delete this._score_mode;
					player.notification();
					player.help();
					return false;
				}
				else {
					player.setFrozen(true);
					player.help("<p>"+WGo.t("help_score")+"</p>");
					this._score_mode = new WGo.ScoreMode(player.kifuReader.game.position, player.board, player.kifu.info.KM || 0.5, player.notification);
					this._score_mode.start();
					return true;
				}
			},
		}
	});
}

WGo.i18n.en["scoremode"] = "Count score";
WGo.i18n.en["score"] = "Score";
WGo.i18n.en["bwin"] = "Black wins by $ points.";
WGo.i18n.en["wwin"] = "White wins by $ points.";
WGo.i18n.en["help_score"] = "Click on stones to mark them dead or alive. You can also set and unset territory points by clicking on them. Territories must be completely bordered.";

})(WGo);
