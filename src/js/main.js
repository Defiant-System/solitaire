
// undo stack
import History from "./modules/history"

// engines
import freecell from "./modules/freecell"
import solitaire from "./modules/solitaire"
import spider from "./modules/spider"


// constants
let ENGINES = { freecell, solitaire, spider },
	ACTIVE = "solitaire",
	GAME_OVER = true;

const app = {
	init() {
		// fast references
		this.board = window.find(".board");

		// initiate engines
		for (let key in ENGINES) {
			ENGINES[key].init(this, CARD_DECK, SUIT_DICT, NUMB_DICT);
		}

		// temp
		if (this.board.hasClass("playing")) {
			this.activeEngine = ENGINES[ACTIVE];
		} else {
			setTimeout(() => this.dispatch({type: "new-game"}), 100);
		}
	},
	dispatch(event) {
		let self = app,
			cardDistance,
			targetCards,
			layout,
			el;

		switch (event.type) {
			// custom events
			case "new-game":
				// clear all cards
				window.find(".card").remove();
				// reset board
				self.board.removeClass("playing game-won game-fail");

				if (!self.activeEngine) {
					self.dispatch({type: "set-game-engine", init: true});
				}
				self.activeEngine.dispatch(event);

				// game started
				GAME_OVER = false;
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

				window.body.css({
					width: self.board.cssProp("--layout-width"),
					height: self.board.cssProp("--layout-height"),
				});

				// set window title
				window.title = "Solitaire - "+ self.activeEngine.name;

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
				// toolbar active item
				el = window.find(`div.tool-active_[data-click="set-game-engine"]`);
				el.removeClass("tool-active_");

				GAME_OVER = true;
				self.board.removeClass("playing").addClass("game-won");
				break;
			case "toggle-music":
				if (window.music.playing) {
					window.music.pause();
				} else {
					window.music.play("~/solitaire/midi/The-Entertainer.mid");
				}
				break;
			case "game-fail":
				GAME_OVER = true;
				self.board.removeClass("playing").addClass("game-fail");
				break;
			case "history-go-prev":
				console.log(event);
				break;
			case "history-go-next":
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
