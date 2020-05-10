
let APP,
	AUTO_COMPLETE,
	PILES = [
		2, 3, 4, 5, 6, 7,
		3, 4, 5, 6, 7,
		4, 5, 6, 7,
		5, 6, 7,
		6, 7,
		7,

		1, 2, 3, 4, 5, 6, 7,
		2, 3, 4, 5, 6, 7,
		2, 3, 4, 5, 6, 7,
		2, 3, 4, 5, 6, 7,
		2, 3, 4, 5, 6, 7,
	],
	UNDO_STACK,
	CARD_DECK,
	SUIT_DICT,
	NUMB_DICT;

let yukon = {
	name: "Yukon",
	init(app, card_deck, suit_dict, numb_dict) {
		// reference to app
		APP = app;
		CARD_DECK = card_deck;
		SUIT_DICT = suit_dict;
		NUMB_DICT = numb_dict;
		// prepare History
		UNDO_STACK = app.UNDO_STACK;

		// fast references
		this.board = window.find(".board");
		this.layout = window.find(".board > .yukon");
		this.piles = window.find(".board > .yukon .pile");
		this.deck = window.find(".board > .yukon .deck");
	},
	dispatch(event) {
		let self = yukon,
			el;

		switch (event.type) {
			case "output-pgn-string":
				str = [self.name];
				str.push(
					(self.board.attr("data-theme") || "casino") +","+
					(self.board.attr("data-card-back") || "red")
				);
				// collect layout info + data
				self.layout.find("> *").map(el => {
					let pId = el.getAttribute("data-id"),
						cards = $(".card", el).map(c =>
							c.dataset.suit.slice(0,1) +
							c.dataset.numb +"-"+
							(~c.className.indexOf("card-back") ? "H" : "S") + c.dataset.id);
					str.push(pId +":"+ cards.join(","))
				});
				// return to app
				return str.join("\n");

			case "new-game":
				AUTO_COMPLETE = false;
				self.start();
				break;
		}
	},
	start() {
		let self = yukon,
			j = 0,
			cards = [],
			deckOffset = this.deck.offset(),
			piles = this.piles.map((p, i) => this.piles.get(i).offset()),
			darks;

		// prepare deck
		CARD_DECK.suits.map(suit => {
			CARD_DECK.cards.map(card => {
				cards.push(`<div class="card ${suit.name.slice(0,1)}${card.numb} card-back" data-id="${j++}" data-numb="${card.numb}" data-suit="${suit.name}" data-ondrag="check-card-drag"></div>`);
			});
		});

		// shuffle & prepare animation
		cards = cards.shuffle();

		// add a fake card for deck-flip animation
		this.deckCard = this.deck.append(cards[51]);

		// prepare deal animation
		cards = cards.map((card, i) => i < 21 ? card : card.replace(/ card-back/, " hidden"));

		// cards animation
		cards.map((el, i) => {
			let j = PILES[i] - 1;
				card = this.piles.get(j).append(el),
				pile = piles[j];
			
			// starting point for animation
			card.data({pos: i > 20 ? 100 + i : i})
				.cssSequence("moving", "transitionend", el => {
					let pos = +el.data("pos");

					el.addClass("landed");

					// deck flip time
					if (pos === 20) {
						self.deckCard
							.cssSequence("card-flip", "animationend", flipEl => {
								self.layout.find(".card.hidden").removeClass("hidden");
								// remove fake flip card
								flipEl.remove();
							});
					}
					// last card
					if (pos === 151) {
						// set board in "playing" mode
						self.board.addClass("playing");
						// reset cards
						self.layout.find(".card")
							.removeAttr("data-pos")
							.removeClass("landing landed moving");
					}
				})
				.css({
					top: (deckOffset.top - pile.top) +"px",
					left: (deckOffset.left - pile.left) +"px",
				});
		});

		/*
		// reset undo-stack
		UNDO_STACK.reset(this.setState);
		// update toolbar buttons
		APP.btnPrev.addClass("tool-disabled_");
		APP.btnNext.addClass("tool-disabled_");
		*/

		// trigger animation
		setTimeout(() =>
				self.layout.find(".card")
					.css({ top: "", left: "" }), 100);
	},
	setState(redo, data) {

	}
};

export default yukon;
