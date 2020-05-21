
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
301:cQ-H11,cQ-H63,c8-H20,c9-H21,c3-H15,cK-H38,cK-H25,c2-H27,c2-H40,c3-H2,c10-H22,c6-H96,cJ-H36,c2-H14,c9-H47,cK-H77,c9-H34,cK-H51,c8-H46,c5-H43,cJ-H23,c6-H18,c4-H3,c8-H33,c8-H85,cJ-H88,c5-H82,c6-H5,c5-H56,c10-H74,c7-H84,cA-H39,cK-H64,c6-H31,c4-H81,cQ-H102,cJ-H101,c9-H86,c10-H61,c7-H58,c2-H53,c9-H99,c7-H19,c6-H83,c9-H60,cJ-H75,c3-H80,c4-H29,c7-H97,cJ-H10
311:cK-S12,cQ-S37,cJ-S49,c10-S48,c9-S73,c8-S72,c7-S71,c6-S44,c5-S17,c4-S16,c3-S67,c2-S66,cA-S26
312:cK-S103,cQ-S76,cJ-S62,c10-S35,c9-S8,c8-S59,c7-S6,c6-S70,c5-S30,c4-S55,c3-S93,c2-S92,cA-S52
313:
314:
315:
316:
317:
318:
321:c10-H9,cA-H0,cA-S78
322:c6-H57,c4-H94,cA-H13,c3-S28
323:c5-S69
324:c10-H100,cQ-S89
325:c5-S95,c4-S42,c3-S54
326:c5-H4,cQ-H24,c7-H32,c10-S87
327:c4-H68,c8-H98,c3-S41,c2-S1,cA-S91
328:
329:c8-S7,c7-S45
330:c2-H79,cK-H90,cA-H65,cQ-S50`;

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
				self.board.removeClass("playing game-won game-fail");

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
