
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
	pgn = ``;

const app = {
	init() {
		// fast references
		this.board = window.find(".board");
		this.btnPrev = window.find("[data-click='history-go-prev']");
		this.btnNext = window.find("[data-click='history-go-next']");
		this.btnAuto = window.find("[data-click='auto-complete']");
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
			//this.dispatch({type: "new-game"});

			// prepare deck
			let cards = [];
			CARD_DECK.suits.map(suit => {
				CARD_DECK.cards.map(card => {
					cards.push(`<div class="card ${suit.name.slice(0,1)}${card.numb}"></div>`);
				});
			});

			window.find(".deck-anim").append(cards.join(""));
			window.find(".progress-bar").cssSequence("a", "animationend", el => {
				if (!el.hasClass("progress-bar")) return;
				el.remove();
				window.find(".intro h1 span:first").remove();
			});
		}
	},
	dispatch(event) {
		let Self = app,
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
				str = Self.activeEngine.dispatch(event);
				console.log(str);
				break;
			case "game-from-pgn":
				layout = Self.activeEngine.layout;
				str = event.pgn.split("\n");

				let ui = str[1].split(",");
				Self.board.data({"theme": ui[0]});
				Self.board.data({"card-back": ui[1]});

				if (str[0] === "Solitaire" && ui[2]) {
					Self.activeEngine.dispatch({ type: "solitaire-set-waste", arg: +ui[2] })
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
				Self.activeEngine.dispatch({ type: "reset-game-board" });
				break;
			case "new-game":
				// clear all cards
				window.find(".card").remove();
				// reset board
				Self.board.removeClass("playing game-won");

				if (!Self.activeEngine) {
					Self.dispatch({type: "set-game-engine", init: true});
				}
				setTimeout(() => Self.activeEngine.dispatch(event), 350);
				//Self.activeEngine.dispatch(event);
				break;
			case "set-game-engine":
				// set global variable
				ACTIVE = event.arg || ACTIVE;
				
				// set default game engine
				Self.activeEngine = ENGINES[ACTIVE]

				// set board layout
				Self.board
					.removeClass("layout-intro layout-freecell layout-solitaire layout-spider layout-yukon playing")
					.addClass("layout-"+ ACTIVE);

				// remove intro scen
				Self.board.find(".intro").remove();

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
					width: Self.board.cssProp("--layout-width"),
					height: Self.board.cssProp("--layout-height"),
				});

				if (!event.init) {
					Self.dispatch({type: "new-game"});
				}
				return true;
			case "set-game-theme":
				Self.board.data({"theme": event.arg});
				break;
			case "set-card-back":
				Self.board.data({"card-back": event.arg});
				break;
			case "game-won":
				// update toolbar buttons
				Self.btnPrev.addClass("tool-disabled_");
				Self.btnNext.addClass("tool-disabled_");

				Self.board.removeClass("playing").addClass("game-won");

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
				Self.UNDO_STACK.undo();
				break;
			case "history-go-next":
				Self.UNDO_STACK.redo();
				break;
			case "close-congratulations":
				Self.board.removeClass("game-won");
				Self.dispatch({type: "new-game"});
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
				return Self.activeEngine.dispatch(event);
		}
	}
};

let CARD_DECK = {
		getSuitByChar: (c) => CARD_DECK.suits.find(suit => suit.name.startsWith(c)).name,
		suits: [
			{ name: "heart" },
			{ name: "club" },
			{ name: "diamond" },
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
