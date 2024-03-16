
// undo stack
import History from "./modules/history"

// engines
import freecell from "./modules/freecell"
import solitaire from "./modules/solitaire"
import spider from "./modules/spider"
import yukon from "./modules/yukon"


@import "./modules/test.js"


// default settings
const defaultSettings = {
	"width": 758,
	"height": 550,
	"audio": "on",
	"game-theme": "casino",
	"card-back": "red",
	"spider-level": 1,
	"solitaire-waste": 3,
};


// constants
let ENGINES = { solitaire, freecell, spider, yukon },
	ACTIVE = "solitaire",
	// for dev purposes
	pgn = ``;

// pgn = `Freecell
// casino,red
// 401:sA-S39
// 402:hA-S0,h2-S1,h3-S2
// 403:dA-S26
// 404:cA-S13,c2-S14,c3-S15
// 411:
// 412:
// 413:
// 414:
// 421:dK-S38,sQ-S50,dJ-S36,s10-S48,d9-S34,c8-S20,d7-S32,c6-S18,d5-S30,c4-S16
// 422:cK-S25,hQ-S11,cJ-S23,d10-S35,s9-S47,d8-S33,s7-S45,h6-S5,c5-S17,d4-S29,s3-S41,d2-S27
// 423:sK-S51,dQ-S37,sJ-S49,h10-S9,c9-S21,h8-S7,c7-S19,d6-S31,s5-S43,h4-S3
// 424:hK-S12,cQ-S24,hJ-S10,c10-S22,h9-S8,s8-S46,h7-S6,s6-S44,h5-S4,s4-S42,d3-S28,s2-S40
// 425:
// 426:
// 427:
// 428:`;

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

		// init settings
		this.dispatch({ type: "init-settings" });

		// Select starting point
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
			// return this.dispatch({type: "new-game"});

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

		// DEV-ONLY-START
		Test.init(this);
		// DEV-ONLY-END
	},
	dispatch(event) {
		let Self = app,
			cardDistance,
			targetCards,
			layout,
			pgn,
			el;

		switch (event.type) {
			// system events
			case "window.close":
				Self.board.removeClass("game-won");
				// save settings
				window.settings.setItem("settings", Self.settings);
				break;
			// custom events
			case "open-help":
				karaqu.shell("fs -u '~/help/index.md'");
				break;
			case "output-pgn-string":
				// custom portable game notation
				pgn = Self.activeEngine.dispatch(event);
				console.log(pgn);
				break;
			case "init-settings":
				// get settings, if any
				Self.settings = window.settings.getItem("settings") || defaultSettings;

				// resize window
				window.body.css({
					width: Self.settings.width,
					height: Self.settings.height,
				});
				// apply settings
				for (let key in Self.settings) {
					let type = "set-"+ key,
						arg = Self.settings[key];
					// call dispatch
					Self.dispatch({ type, arg });

					// update menu
					window.bluePrint.selectNodes(`//Menu[@click="${type}"]`).map(xMenu => {
						if (key === "audio") {
							if (arg === "on") xMenu.setAttribute("is-checked", 1);
							else xMenu.removeAttribute("is-checked");
						} else {
							let xArg = xMenu.getAttribute("arg");
							if (xArg === arg || +xArg === +arg) xMenu.setAttribute("is-checked", 1);
							else xMenu.removeAttribute("is-checked");
						}
					});
				}
				break;
			case "game-from-pgn":
				layout = Self.activeEngine.layout;
				pgn = event.pgn.split("\n");

				let ui = pgn[1].split(",");
				Self.board.data({"theme": ui[0]});
				Self.board.data({"card-back": ui[1]});

				// if (pgn[0] === "Solitaire" && ui[2]) {
				// 	Self.activeEngine.dispatch({ type: "solitaire-set-waste", arg: +ui[2] })
				// }

				pgn.slice(2).map(p => {
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

				// setTimeout(() => {
				// 	Self.activeEngine.piles.addClass("flipping-card");
				// 	Self.activeEngine.piles.find(".card:last-child")
				// 		.cssSequence("card-flip", "animationend", flipEl => {
				// 			// console.log(flipEl);
				// 		});
				// }, 500);
				break;
			case "new-game":
				// clear all cards
				window.find(".card").remove();
				// reset board
				Self.board.removeClass("playing game-won");
				// disable auto complete
				Self.btnAuto.addClass("tool-disabled_");

				if (!Self.activeEngine) {
					Self.dispatch({type: "set-game-engine", init: true});
				}
				setTimeout(() => Self.activeEngine.dispatch(event), 350);
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

				// save to settings
				Self.settings.width = Self.board.cssProp("--layout-width");
				Self.settings.height = Self.board.cssProp("--layout-height");

				// resize window
				window.body.css({
					width: Self.settings.width,
					height: Self.settings.height,
				});

				if (!event.init) {
					Self.dispatch({type: "new-game"});
				}
				return true;
			case "set-audio":
				window.audio.mute = event.arg ? event.arg === "mute" : event.checked < 0;
				// update settings
				Self.settings.audio = window.audio.mute ? "mute" : "on";
				break;
			case "set-game-theme":
				Self.board.data({"theme": event.arg});
				// update settings
				Self.settings["game-theme"] = event.arg;
				break;
			case "set-card-back":
				Self.board.data({"card-back": event.arg});
				// update settings
				Self.settings["card-back"] = event.arg;
				break;
			case "game-won":
				// update toolbar buttons
				Self.btnPrev.addClass("tool-disabled_");
				Self.btnNext.addClass("tool-disabled_");
				Self.btnAuto.addClass("tool-disabled_");

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
			// solitaire specific setting
			case "set-solitaire-waste":
				return ENGINES.solitaire.dispatch(event);
			// spider specific setting
			case "set-spider-level":
				return ENGINES.spider.dispatch({ ...event, noStart: true });
			// proxy events
			case "trigger-solitaire-cycle-flip-cards":
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
	},
	shuffle(deck) {
		for (let i=deck.length-1; i>0; i--) {
	        let j = Math.floor(Math.random() * (i + 1));
	        [deck[i], deck[j]] = [deck[j], deck[i]];
	    }
	    return deck;
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
