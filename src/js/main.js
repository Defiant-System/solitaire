
// undo stack
import History from "./modules/history"

// engines
import freecell from "./modules/freecell"
import solitaire from "./modules/solitaire"
import spider from "./modules/spider"
import yukon from "./modules/yukon"

// constants
let ENGINES = { freecell, solitaire, spider, yukon },
	ACTIVE = "solitaire",
	// for dev purposes
	pgn = `Spider
casino,red
301:cK-H25,c4-H68,c3-H67,c8-H33,c8-H72,c7-H84,c6-H83,c6-H96,cQ-H24,c9-H21,c5-H4,c5-H17,cK-H12,cA-H13,c6-H5,cJ-H49,c7-H32,c5-H82,c2-H27,c10-H22
311:cK-S103,cQ-S102,cJ-S23,c10-S87,c9-S34,c8-S7,c7-S97,c6-S57,c5-S56,c4-S81,c3-S41,c2-S66,cA-S26
312:cK-S51,cQ-S11,cJ-S36,c10-S9,c9-S73,c8-S59,c7-S19,c6-S70,c5-S30,c4-S3,c3-S28,c2-S53,cA-S52
313:cK-S77,cQ-S89,cJ-S75,c10-S48,c9-S86,c8-S98,c7-S71,c6-S18,c5-S69,c4-S55,c3-S80,c2-S40,cA-S91
314:cK-S90,cQ-S50,cJ-S88,c10-S74,c9-S8,c8-S46,c7-S45,c6-S44,c5-S43,c4-S16,c3-S54,c2-S1,cA-S78
315:
316:
317:
318:
321:cK-S64
322:cQ-S37,cJ-S62,c10-S35,c9-S47,c8-S20,c7-S6
323:c4-S42,c3-S93,c2-S14,cA-S39
324:cK-S38,cQ-S76,cJ-S101,c10-S100,c9-S99,c8-S85,c7-S58,c6-S31,c5-S95,c4-S94,c3-S2,c2-S92
325:cA-S65
326:cJ-S10
327:c10-S61
328:cQ-S63
329:c9-S60
330:c4-S29,c3-S15,c2-S79,cA-S0`;

const app = {
	init() {
		// fast references
		this.board = window.find(".board");
		this.btnPrev = window.find("[data-click='history-go-prev']");
		this.btnNext = window.find("[data-click='history-go-next']");
		this.UNDO_STACK = new History;

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
		} else if (pgn !== "") {
			// set active engine
			ACTIVE = pgn.split("\n")[0].toLowerCase();
			//this.activeEngine = ENGINES[ACTIVE];
			this.dispatch({ type: "set-game-engine", init: true });
			// trigger event
			this.dispatch({ type: "game-from-pgn", pgn });
		} else {
			this.dispatch({type: "new-game"});
		}
		// temp
		this.dispatch({type: "open-help"});
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
			case "open-help":
				defiant.shell("fs -u '~/help/index.md'");
				break;
			case "output-pgn-string":
				// custom portable game notation
				str = self.activeEngine.dispatch(event);
				console.log(str);
				break;
			case "game-from-pgn":
				layout = self.activeEngine.layout;
				str = event.pgn.split("\n");

				let ui = str[1].split(",");
				self.board.data({"theme": ui[0]});
				self.board.data({"card-back": ui[1]});

				if (str[0] === "Solitaire" && ui[2]) {
					self.activeEngine.dispatch({ type: "solitaire-set-waste", arg: +ui[2] })
				}

				str.slice(2).map(p => {
					let parts = p.split(":");
					if (!parts[1]) return;
					let pEl = layout.find(`[data-id="${parts[0]}"]`),
						cards = parts[1].split(",");
					
					cards = cards.map(c => {
						let info = c.split("-"),
							suit = info[0].slice(0, 1),
							numb = info[0].slice(1),
							suitName = CARD_DECK.getSuitByChar(suit),
							cardBack = info[1].slice(0, 1) === "H" ? "card-back" : "";
						return `<div class="card ${suit}${numb} ${cardBack}" data-id="${info[1].slice(1)}" data-numb="${numb}" data-suit="${suitName}" data-ondrag="check-card-drag"></div>`;
					});
					// append cards to parent element
					pEl.html(cards.join(""));
				});
				// resets game engine
				self.activeEngine.dispatch({ type: "reset-game-board" });
				break;
			case "new-game":
				// clear all cards
				window.find(".card").remove();
				// reset board
				self.board.removeClass("playing game-won");

				if (!self.activeEngine) {
					self.dispatch({type: "set-game-engine", init: true});
				}
				setTimeout(() => self.activeEngine.dispatch(event), 350);
				//self.activeEngine.dispatch(event);
				break;
			case "set-game-engine":
				// set global variable
				ACTIVE = event.arg || ACTIVE;
				
				// set default game engine
				self.activeEngine = ENGINES[ACTIVE]

				// set board layout
				self.board
					.removeClass("layout-freecell layout-solitaire layout-spider layout-yukon playing")
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

				// play sound
				window.audio.play("you-win");
				break;
			case "toggle-music":
				if (window.midi.playing) {
					window.midi.pause();
				} else {
					window.midi.play("~/midi/The-Entertainer.mid");
				}
				break;
			case "history-go-prev":
				self.UNDO_STACK.undo();
				break;
			case "history-go-next":
				self.UNDO_STACK.redo();
				break;
			case "close-congratulations":
				self.board.removeClass("game-won");
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
		getSuitByChar: (c) => CARD_DECK.suits.find(suit => suit.name.startsWith(c)).name,
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
