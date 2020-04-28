
// undo stack
import History from "./modules/history"

// engines
import freecell from "./modules/freecell"
import solitaire from "./modules/solitaire"
import spider from "./modules/spider"

// sounds fx
let SOUNDS = {
	"put-card": { url: "~/sound/card.m4a" },
	"flip-card": { url: "~/sound/card-flip.mp3" },
};

// constants
let ENGINES = { freecell, solitaire, spider },
	ACTIVE = "solitaire";

let pgn = `Solitaire
201:hKH,c8H,d3H,d6H,d9H,cJH,d4H,sKH,dJH,s10H,c3H,s4H,dQH,d8H,s3H,h4H,d5H,h10H,h8H,d2H,h9H,c2H,cKH,s5H
202:
211:
212:
213:
214:
221:d10S
222:sJH,d7S
223:s7H,hJH,c9S
224:s9H,h3H,h5H,h6S
225:h2H,s2H,s8H,s6H,c6S
226:c10H,h7H,c5H,cQH,c4H,dAS
227:dKH,hQH,sQH,hAH,sAH,c7H,cAS`;

const app = {
	init() {
		// fast references
		this.board = window.find(".board");
		this.btnPrev = window.find("[data-click='history-go-prev']");
		this.btnNext = window.find("[data-click='history-go-next']");
		this.UNDO_STACK = new History;

		// initiate sound fx
		window.audio(SOUNDS);

		// initiate engines
		for (let key in ENGINES) {
			ENGINES[key].init(this, CARD_DECK, SUIT_DICT, NUMB_DICT);
		}

		// temp
		if (this.board.hasClass("playing")) {
			// set active engine
			this.activeEngine = ENGINES[ACTIVE];
			// set state function
			this.UNDO_STACK.reset(this.activeEngine.setState);

			//this.dispatch({ type: "output-pgn-string" });
		} else if (pgn) {
			// set active engine
			ACTIVE = pgn.split("\n")[0].toLowerCase();
			this.activeEngine = ENGINES[ACTIVE];
			// trigger event
			this.dispatch({ type: "game-from-pgn", pgn });
		} else {
			this.dispatch({type: "new-game"});
		}
	},
	dispatch(event) {
		let self = app,
			cardDistance,
			targetCards,
			layout,
			pgn,
			el;

		switch (event.type) {
			// custom events
			case "output-pgn-string":
				// custom portable game notation
				str = self.activeEngine.dispatch(event);
				console.log(str);
				break;
			case "game-from-pgn":
				self.activeEngine.dispatch(event);
				break;
			case "new-game":
				// clear all cards
				window.find(".card").remove();
				// reset board
				self.board.removeClass("playing game-won game-fail");

				if (!self.activeEngine) {
					self.dispatch({type: "set-game-engine", init: true});
				}
				setTimeout(() => self.activeEngine.dispatch(event), 250);
				break;
			case "set-game-engine":
				// set global variable
				ACTIVE = event.arg || ACTIVE;
				
				// set default game engine
				self.activeEngine = ENGINES[ACTIVE]

				// set board layout
				self.board
					.removeClass("layout-freecell layout-solitaire layout-spider playing")
					.addClass("layout-"+ ACTIVE);

				// update menus
				window.bluePrint
					.selectSingleNode(`//Menu[@check-group="game-engine"][@is-checked="1"]`)
					.removeAttribute("is-checked");
				window.bluePrint
					.selectSingleNode(`//Menu[@check-group="game-engine"][@arg="${ACTIVE}"]`)
					.setAttribute("is-checked", "1");

				// update toolbar
				window.find(`.tool-active_[data-click="set-game-engine"]`).removeClass("tool-active_");
				window.find(`[data-click="set-game-engine"][data-arg="${ACTIVE}"]`).addClass("tool-active_");

				// resize window
				window.body.css({
					width: self.board.cssProp("--layout-width"),
					height: self.board.cssProp("--layout-height"),
				});

				// set window title
			//	window.title = "Solitaire - "+ self.activeEngine.name;

				if (!event.init) {
					self.dispatch({type: "new-game"});
				}
				return true;
			case "set-game-theme":
				self.board.data({"theme": event.arg});
				break;
			case "set-card-back":
				self.board.data({"card-back": event.arg});
				break;
			case "game-won":
				// update toolbar buttons
				self.btnPrev.addClass("tool-disabled_");
				self.btnNext.addClass("tool-disabled_");

				self.board.removeClass("playing").addClass("game-won");
				break;
			case "toggle-music":
				if (window.midi.playing) {
					window.midi.pause();
				} else {
					window.midi.play("~/midi/The-Entertainer.mid");
				}
				break;
			case "game-fail":
				self.board.removeClass("playing").addClass("game-fail");
				break;
			case "history-go-prev":
				self.UNDO_STACK.undo();
				break;
			case "history-go-next":
				self.UNDO_STACK.redo();
				break;
			case "close-failure":
			case "close-congratulations":
				self.board.removeClass("game-won game-fail");
				self.dispatch({type: "new-game"});
				break;
			// solitaire specific events
			case "solitaire-set-waste":
			case "trigger-solitaire-cycle-flip-cards":
			
			// spider specific events
			case "spider-set-level":
			case "spider-deal-cards":
			case "trigger-spider-deal-cards":

			case "game-double-click":
			case "undo-move":
			case "cycle-flip-cards":
			case "check-foundation-drop":
			case "check-void-drop":
			case "check-slot-drop":
			case "check-pile-drop":
			case "check-card-drag":
			case "auto-complete":
				return self.activeEngine.dispatch(event);
		}
	}
};

let CARD_DECK = {
		suits: [
			{ name: "club" },
			{ name: "diamond" },
			{ name: "heart" },
			{ name: "spade" }
		],
		cards: [
			{ name: "ace",   numb: "A" },
			{ name: "two",   numb: "2" },
			{ name: "three", numb: "3" },
			{ name: "four",  numb: "4" },
			{ name: "five",  numb: "5" },
			{ name: "six",   numb: "6" },
			{ name: "seven", numb: "7" },
			{ name: "eight", numb: "8" },
			{ name: "nine",  numb: "9" },
			{ name: "ten",   numb: "10"},
			{ name: "jack",  numb: "J" },
			{ name: "queen", numb: "Q" },
			{ name: "king",  numb: "K" }
		],
		values: {
			"A": 1,
			"2": 2,
			"3": 3,
			"4": 4,
			"5": 5,
			"6": 6,
			"7": 7,
			"8": 8,
			"9": 9,
			"10": 10,
			"J": 11,
			"Q": 12,
			"K": 13,
		}
	},
	SUIT_DICT = {
		club:    { accepts:["diamond", "heart"] },
		diamond: { accepts:["club"   , "spade"] },
		heart:   { accepts:["club"   , "spade"] },
		spade:   { accepts:["diamond", "heart"] }
	},
	NUMB_DICT = {
		A: { cascDrop: ""  , founDrop: "2" },
		2: { cascDrop: "A" , founDrop: "3" },
		3: { cascDrop: "2" , founDrop: "4" },
		4: { cascDrop: "3" , founDrop: "5" },
		5: { cascDrop: "4" , founDrop: "6" },
		6: { cascDrop: "5" , founDrop: "7" },
		7: { cascDrop: "6" , founDrop: "8" },
		8: { cascDrop: "7" , founDrop: "9" },
		9: { cascDrop: "8" , founDrop: "10"},
		10:{ cascDrop: "9" , founDrop: "J" },
		J: { cascDrop: "10", founDrop: "Q" },
		Q: { cascDrop: "J" , founDrop: "K" },
		K: { cascDrop: "Q" , founDrop: ""  }
	};

window.exports = app;
