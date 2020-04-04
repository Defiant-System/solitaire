
let APP,
	AUTO_COMPLETE,
	UNDO_STACK = [],
	CARD_DECK,
	SUIT_DICT,
	NUMB_DICT;

let freecell = {
	name: "Freecell",
	init(app, card_deck, suit_dict, numb_dict) {
		// reference to app
		APP = app;
		CARD_DECK = card_deck;
		SUIT_DICT = suit_dict;
		NUMB_DICT = numb_dict;

		// fast references
		this.board = window.find(".board");
		this.layout = window.find(".board > .freecell");
		this.piles = window.find(".board > .freecell .pile");
		this.deck = window.find(".board > .freecell .deck");
	},
	dispatch(event) {
		let self = freecell,
			from,
			draggedFirst,
			draggedSuit,
			draggedNumb,
			zoneLastCard,
			zoneLastSuit,
			zoneLastNumb,
			cardDistance,
			targetCards,
			dropable,
			dragable,
			cards,
			check,
			el;

		switch (event.type) {
			case "new-game":
				// reset undo-stack
				UNDO_STACK = [];

				// show deck before dealing
				self.deck.cssSequence("show", "transitionend", deck => self.start());
				break;
			case "game-double-click":
				el = $(event.target);
				if (!el.hasClass("card") || el.hasClass("card-back")) return;
				
				check = this.layout.find(".hole.fndtn");
				check.filter((fnd, i) => {
					if (dropable) return;
					let target = check.get(i);
					if (this.isCardFoundationDropable(el, target)) dropable = target;
				});

				if (dropable.length) {
					cardRect = el[0].getBoundingClientRect();
					targetRect = dropable[0].getBoundingClientRect();
					draggedParent = el.parents(".pile");

					el = dropable.append(el)
						.cssSequence("landing", "transitionend", lEl => {
							// reset element
							lEl.removeClass("landing");

							// push move to undo stack
							UNDO_STACK.push({
								cards: [el.data("id")],
								from: draggedParent.data("id")
							});
						})
						.css({
							top: cardRect.top - targetRect.top +"px",
							left: cardRect.left - targetRect.left +"px",
						});
					// trigger animation
					setTimeout(() => el.css({ top: "0px", left: "0px" }), 100);
				}
				break;
			case "undo-move":
				if (!UNDO_STACK.length) {
					// nothing to undo
					return;
				}

				let undoStep = UNDO_STACK.pop(),
					selector,
					offset;

				selector = undoStep.cards.map(id => `.card[data-id="${id}"]`);
				cards = self.layout.find(selector.join(", "));
				from = self.layout.find(`[data-id="${undoStep.from}"]`);

				fromOffset = from[0].getBoundingClientRect();
				offset = cards.map(card => {
					let cardRect = card.getBoundingClientRect();
					return {
						top: cardRect.top - fromOffset.top,
						left: cardRect.left - fromOffset.left,
					};
				});

				// number of cards in from element
				targetCards = from.find(".card");
				cardDistance = parseInt(from.cssProp("--card-distance"), 10);

				el = from.append(cards);
				el.map((item, i) => {
					el.get(i)
						.cssSequence("landing", "transitionend", lEl => lEl.removeClass("landing"))
						.css({
							top: offset[i].top +"px",
							left: offset[i].left +"px",
						});
				});

				setTimeout(() => 
					el.map((item, i) => {
						let top = from.hasClass("pile") ? cardDistance * (targetCards.length + i) : 0;
						el.get(i).css({
							top: top +"px",
							left: "0px"
						})
					}), 100);
				break;
			case "check-game-won":
				if (this.layout.find(".hole .card").length === 104) {
					APP.dispatch({type: "game-won"});
				}
				break;
			case "auto-complete":
				AUTO_COMPLETE = true;
				dropable = true;

				check = this.layout.find(".hole.fndtn");
				cards = this.layout.find(".pile .card:last-child, .slot .card:last-child")
							.toArray()
							.sort((a, b) => CARD_DECK.values[a.dataset.numb] - CARD_DECK.values[b.dataset.numb]);

				cards.map(el => {
					if (!dropable) return;
					el = $(el);

					check.map((fnd, i) => {
						let target = check.get(i);

						if (dropable && this.isCardFoundationDropable(el, target)) {
							let eRect = el[0].getBoundingClientRect(),
								tRect = target[0].getBoundingClientRect(),
								targetOffset = [{
									top: eRect.top - tRect.top,
									left:  eRect.left - tRect.left
								}];
							// trigger animation
							self.dispatch({
								type: "check-foundation-drop",
								targetOffset,
								target,
								el,
							});
							// prevent further checks
							dropable = false;
						}
					});
				});

				if (!cards.length || dropable) {
					AUTO_COMPLETE = false;
				}
				break;
			case "check-void-drop":
				draggedFirst = event.el.get(0);
				from = draggedFirst.parent().removeClass("no-drag-hover");
				break;
			case "check-foundation-drop":
				// number of cards in dropZone
				draggedFirst = event.el.get(0);
				from = draggedFirst.parent().removeClass("no-drag-hover");
				dropable = event.el.length  === 1 && this.isCardFoundationDropable(draggedFirst, event.target);

				if (dropable) {
					// for seamless transition - position dragged el where dropped
					el = event.el.map((item, i) =>
						event.target.append(item).css({
							top: event.targetOffset[i].top +"px",
							left: event.targetOffset[i].left +"px",
						})
					);
					// landing position
					setTimeout(() => el[0]
						.cssSequence("landing", "transitionend", el => {
							el.removeClass("landing").removeAttr("style");
							if (self.layout.find(".fndtn .card").length === 52) {
								return APP.dispatch({type: "game-won"});
							}
							if (AUTO_COMPLETE) {
								self.dispatch({type: "auto-complete"});
							}
						})
						.css({top: "0px", left: "0px"})
					);

					// push move to undo stack
					cards = event.el.map(card => card.getAttribute("data-id"));
					UNDO_STACK.push({ cards, from: from.data("id") });

					// check if game is complete
					self.dispatch({type: "check-game-won"})
				}
				return dropable;
			case "check-slot-drop":
				// number of cards in dropZone
				targetCards = event.target.find(".card");
				draggedFirst = event.el.get(0);
				from = draggedFirst.parent().removeClass("no-drag-hover");

				if (event.el.length === 1 && !targetCards.length) {
					dropable = true;
					// for seamless transition - position dragged el where dropped
					el = event.el.map((item, i) => 
						event.target.append(item).css({
							top: event.targetOffset[i].top +"px",
							left: event.targetOffset[i].left +"px",
						})
					);
					// landing position
					setTimeout(() => el[0]
						.cssSequence("landing", "transitionend", el => el.removeClass("landing").removeAttr("style"))
						.css({top: "0px", left: "0px"})
					);

					// push move to undo stack
					cards = event.el.map(card => card.getAttribute("data-id"));
					UNDO_STACK.push({ cards, from: from.data("id") });
				}
				return dropable;
			case "check-pile-drop":
				draggedFirst = event.el.get(0);
				from = draggedFirst.parent().removeClass("no-drag-hover");
				zoneLastCard = event.target.find(".card:last");
				zoneLastSuit = zoneLastCard.data("suit");
				zoneLastNumb = zoneLastCard.data("numb");
				
				// number of cards in dropZone
				targetCards = event.target.find(".card");

				check = zoneLastCard.length
							&& (SUIT_DICT[zoneLastSuit].accepts.indexOf(draggedFirst.data("suit")) < 0
							|| NUMB_DICT[zoneLastNumb].cascDrop !== draggedFirst.data("numb"));

				if (!check) {
					dropable = true;

					// for seamless transition - position dragged el where dropped
					el = event.el.map((item, i) =>
						event.target.append(item).css({
							top: event.targetOffset[i].top +"px",
							left: event.targetOffset[i].left +"px",
						})
					);

					cardDistance = parseInt(event.target.cssProp("--card-distance"), 10);
					setTimeout(() => 
						el.map((item, i) => item
							.cssSequence("landing", "transitionend", el => el.removeClass("landing").removeAttr("style"))
							.css({
								top: (cardDistance * (targetCards.length + i)) +"px",
								left: "0px"
							})
						));

					// push move to undo stack
					cards = event.el.map(card => card.getAttribute("data-id"));
					UNDO_STACK.push({ cards, from: from.data("id") });
				}
				return dropable;
			case "check-card-drag":
				if (AUTO_COMPLETE) return;

				el = $(event.target);
				from = el.parents(".pile, .slot, fndtn");
				
				if (el.index() === from.find(".card").length - 1) {
					// if last card in pile, ok to drag
					dragable = el;
				} else {
					// if not check sequence
					cards = el.nextAll(".card", true);

					check = cards.filter((card, i, siblings) => {
						let next = siblings[i+1],
							suit = card.getAttribute("data-suit"),
							numb = card.getAttribute("data-numb");
						if (!next) return true;
						return SUIT_DICT[suit].accepts.indexOf(next.getAttribute("data-suit")) >= 0
								&& NUMB_DICT[numb].cascDrop === next.getAttribute("data-numb");
					});
					// sequence checks
					dragable = cards.length === check.length ? cards : false;
				}
				// ensure enough free slots existing to handle number of cards being dragged
				if (dragable.length - 1 > (4 - this.layout.find(".slot .card").length) && el.nextAll(".card").length) {
					dragable = false;
				}

				// dont show drag-hover on origin-pile
				from.toggleClass("no-drag-hover", !dragable);

				return dragable;
		}
	},
	isCardFoundationDropable(card, foundation) {
		let cardSuit = card.data("suit"),
			cardNumb = card.data("numb"),
			fndCards = foundation.find(".card"),
			fndLastCard = foundation.find(".card:last"),
			fndLastSuit = fndLastCard.data("suit"),
			fndLastNumb = fndLastCard.data("numb");

		return (!fndLastCard.length && cardNumb === "A")
				|| (fndCards.length && cardSuit === fndLastSuit && NUMB_DICT[fndLastNumb].founDrop === cardNumb)
	},
	start() {
		let self = freecell,
			j = 0,
			cards = [],
			deckOffset = this.deck.offset(),
			piles = this.piles.map((p, i) => this.piles.get(i).offset());

		// prepare deck
		CARD_DECK.suits.map(suit => {
			CARD_DECK.cards.map(card => {
				cards.push(`<div class="card ${suit.name.slice(0,1)}${card.numb}" data-id="${j++}" data-numb="${card.numb}" data-suit="${suit.name}" data-ondrag="check-card-drag"></div>`);
			});
		});

		// shuffle & prepare animation
		cards.shuffle().map((el, i) => {
			let card = this.piles.get(i % 8).append(el),
				pile = piles[i % 8];

			card.data({pos: i})
				.cssSequence("moving", "transitionend", el => {
					el.addClass("landed");

					if (+el.data("pos") === 51) {
						// hide the deck
						self.deck.removeClass("show");
						// set board in "playing" mode
						self.board.addClass("playing").find(".freecell .card").removeAttr("data-pos").removeClass("moving landed");
					}
				})
				.css({
					top: (deckOffset.top - pile.top) +"px",
					left: (deckOffset.left - pile.left) +"px",
				});
		});

		// trigger animation
		setTimeout(() => this.layout.find(".card").removeClass("in-deck").css({ top: "", left: "", }), 60);
	}
};

export default freecell;