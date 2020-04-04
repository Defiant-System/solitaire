
let APP,
	AUTO_COMPLETE,
	UNDO_STACK = [],
	WASTE_TURN = 1,
	PILES = [
		1, 2, 3, 4, 5, 6, 7,
		2, 3, 4, 5, 6, 7,
		3, 4, 5, 6, 7,
		4, 5, 6, 7,
		5, 6, 7,
		6, 7,
		7,
	],
	CARD_DECK,
	SUIT_DICT,
	NUMB_DICT;

let solitaire = {
	name: "Classic",
	init(app, card_deck, suit_dict, numb_dict) {
		// reference to app
		APP = app;
		CARD_DECK = card_deck;
		SUIT_DICT = suit_dict;
		NUMB_DICT = numb_dict;
		
		// fast references
		this.board = window.find(".board");
		this.layout = window.find(".board > .solitaire");
		this.piles = window.find(".board > .solitaire .pile");
		this.deck = window.find(".board > .solitaire .deck");
		this.waste = window.find(".board > .solitaire .waste");
	},
	dispatch(event) {
		let self = solitaire,
			from,
			fromOffset,
			draggedFirst,
			draggedParent,
			cardDistance,
			targetCards,
			sourceCards,
			cardRect,
			targetRect,
			dropable,
			dragable,
			isLastCard,
			last,
			cards,
			check,
			el;

		switch (event.type) {
			case "new-game":
				// reset undo-stack
				UNDO_STACK = [];

				this.start();
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

				// reset drop zones
				self.layout.find(".no-drag-hover").removeClass("no-drag-hover");

				if (dropable && dropable.length) {
					cardRect = el[0].getBoundingClientRect();
					targetRect = dropable[0].getBoundingClientRect();
					draggedParent = el.parents(".hole, .pile");

					if (draggedParent.hasClass("waste")) {
						let cardsLeft = +draggedParent.data("cardsLeft") - 1;
						draggedParent.data({"cardsLeft": cardsLeft});
					}

					el = dropable.append(el)
						.cssSequence("landing", "transitionend", lEl => {
							// reset element
							lEl.removeAttr("style").removeClass("landing");

							last = draggedParent.find(".card:last-child");
							if (draggedParent.hasClass("pile") && last.hasClass("card-back")) {
								// adding "flipping-card" to get "3d-perspective"
								draggedParent.toggleClass("flipping-card", !last.length);

								// flip last card from source pile
								last.cssSequence("card-flip", "animationend", fEl =>
									fEl.removeClass("card-flip card-back")
										.parent()
										.removeClass("flipping-card"));
							}

							// push move to undo stack
							UNDO_STACK.push({
								cards: [el.data("id")],
								from: draggedParent.data("id"),
								last: last && last.hasClass("card-back") ? last.data("id") : false
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
			case "solitaire-set-waste":
				WASTE_TURN = +event.arg;
				this.layout.toggleClass("waste-single", WASTE_TURN === 3);
				break;
			case "trigger-solitaire-cycle-flip-cards":
				self.layout.find(".deck").trigger("click");
				break;
			case "check-game-won":
				if (this.layout.find(".hole .card").length === 104) {
					APP.dispatch({type: "game-won"});
				}
				break;
			case "undo-move":
				// nothing to undo
				if (!UNDO_STACK.length) return;

				let undoStep = UNDO_STACK.pop(),
					selector,
					offset;

				// ----- deck to waste playback START -------------
				if (undoStep.from === "deck") {
					selector = undoStep.cards.map(id => `.card[data-id="${id}"]`);
					cards = self.layout.find(selector.join(", "));

					offset = self.deck[0].getBoundingClientRect();
					fromOffset = self.waste[0].getBoundingClientRect();
					self.waste.addClass("unfan-cards");

					cards
						.cssSequence("card-flip-back", "animationend", fEl => {
							fEl.removeClass("card-flip-back").addClass("card-back");

							if (fEl[0] !== cards[cards.length-1]) return;

							cards = self.deck
										.addClass("undo-waste-cards")
										.prepend(cards.toArray().reverse())
										.cssSequence("landing", "transitionend", lEl => {
											if (lEl[0] !== cards[cards.length-1]) return;
											// reset cards
											cards.removeClass("landing").removeAttr("style");
											// reset waste
											self.waste.removeClass("unfan-cards")
												.data({"cardsLeft": self.waste.find(".card").length});
											// reset deck
											self.deck.removeClass("undo-waste-cards");
										})
										.css({
											top: (fromOffset.top - offset.top) +"px",
											left: (fromOffset.left - offset.left) +"px",
										});
							// trigger animation
							setTimeout(() => cards.css({ top: "0px", left: "0px" }));
						});

					return;
				}
				// ----- deck to waste playback END -------------------


				if (undoStep.last) {
					last = self.layout.find(`.card[data-id="${undoStep.last}"]`);
					last.cssSequence("card-flip-back", "animationend", fEl =>
							fEl.addClass("card-back").removeClass("card-flip-back")
								.parent().removeClass("flipping-card undo-card"))
						.parent().addClass("flipping-card undo-card");
				}

				selector = undoStep.cards.map(id => `.card[data-id="${id}"]`);
				cards = self.layout.find(selector.join(", "));

				from = self.layout.find(`[data-id="${undoStep.from}"]`);
				fromOffset = from[0].getBoundingClientRect();
				offset = cards.map(card => {
					let rect = card.getBoundingClientRect();
					return {
						top: rect.top - fromOffset.top,
						left: rect.left - fromOffset.left,
					};
				});

				// number of cards in from element
				targetCards = from.find(".card");
				cardDistance = from.hasClass("waste") ? 0 : parseInt(from.cssProp("--card-distance"), 10);

				el = from.append(cards);
				el.map((item, i) => {
					el.get(i)
						.cssSequence("landing", "transitionend", lEl => {
							lEl.removeClass("landing").removeAttr("style");
							
							if (from.hasClass("waste")) {
								let cardsLeft = +from.data("cardsLeft");
								from.data({"cardsLeft": cardsLeft + 1});
							}
						})
						.css({
							top: offset[i].top +"px",
							left: offset[i].left +"px",
						});
				});

				setTimeout(() => 
					el.map((item, i) => {
						let cardsMargin = parseInt(from.cssProp("--card-margin"), 10),
							left = from.hasClass("waste") ? (+from.data("cardsLeft") % 3) * cardsMargin : 0,
							top = cardDistance * (targetCards.length + i);
						
						el.get(i).css({
							top: top +"px",
							left: left +"px"
						})
					}), 100);
				break;
			case "auto-complete":
				AUTO_COMPLETE = true;
				dropable = true;

				check = this.layout.find(".hole.fndtn");
				cards = this.layout.find(".pile .card:last-child, .waste .card:last-child")
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
			case "cycle-flip-cards":
				if (!event.el.find(".card").length) {
					cards = this.waste.data({cardsLeft: ""}).find(".card");

					let fnWasteToDeck = uEl => {
						if (uEl[0] !== cards[cards.length - 1]) return;
						
						// prepare for 3d flip in deck-element
						this.waste.addClass("flipping-card");

						cards.cssSequence("card-back card-flip-back", "animationend", fEl => {
							if (fEl[0] !== cards[cards.length - 1]) return;
							
							cards = this.deck.addClass("deck-fill")
										.append(cards).removeClass("card-flip-back card-unfan");

							// prepare calculation
							targetRect = this.waste[0].getBoundingClientRect();
							cardRect = cards.map(card => card.getBoundingClientRect());

							// starting point for animation
							cards.map((card, i) => {
								cards.get(i)
									.css({
										top: (targetRect.top - cardRect[i].top) +"px",
										left: (targetRect.left - cardRect[i].left) +"px",
									});
							});

							setTimeout(() => {
								cards
									.cssSequence("landing", "transitionend", lEl => {
										if (lEl[0] !== cards[0]) return;
										// reset cards
										cards.removeClass("landing");
										// reset deck
										this.deck.removeClass("deck-fill");
									})
									.css({ "top": "0", "left": "0" });
							});
						});
					};

					if (WASTE_TURN === 1) {
						fnWasteToDeck(cards.get(cards.length - 1));
					} else {
						cards.cssSequence("card-unfan", "transitionend", fnWasteToDeck);
					}
					return;
				}
				
				cards = event.el.find(`.card:nth-child(-n+${WASTE_TURN})`);
				if (!cards.length) return;

				// set nr of cards as attribute
				this.waste.addClass("flipping-card")
					.data({cardsLeft: this.waste.find(".card").length + cards.length});

				// prepare calculation
				targetRect = this.waste[0].getBoundingClientRect();
				cardRect = cards[cards.length - 1].getBoundingClientRect();
				
				cards = this.waste.append(cards)
					.cssSequence("showing", "transitionend", el => el.addClass("card-flip").removeAttr("style"))
					.cssSequence("card-flip", "animationend", el => {
						if (cards.length > 1) {
							el.removeClass("card-flip card-back showing")
								.cssSequence("card-fan", "transitionend", el => {
									let siblings = el.parents().find(".card");
									if (el.index() === siblings.length - 1) return;
									siblings.removeClass("card-fan");
									el.parents().removeClass("flipping-card");
								});
						} else {
							el.removeClass("card-flip card-back showing")
								.parents().removeClass("flipping-card");
						}
						if (el[0] !== cards[cards.length-1]) return;

						// push move to undo stack
						UNDO_STACK.push({
							cards: cards.map(e => e.getAttribute("data-id")),
							from: "deck",
						});
					})
					.css({
						top: (cardRect.top - targetRect.top) +"px",
						left: (cardRect.left - targetRect.left) +"px",
					});

				setTimeout(() =>
					cards.map((card, i) =>
						cards.get(i).css({ top: "0px", left: "0px", })), 60);

				break;
			case "check-void-drop":
				draggedFirst = event.el.get(0);
				draggedParent = draggedFirst.parent().removeClass("no-drag-hover");
				break;
			case "check-foundation-drop":
				// number of cards in dropZone
				draggedFirst = event.el.get(0);
				draggedParent = draggedFirst.parent().removeClass("no-drag-hover");
				dropable = this.isCardFoundationDropable(draggedFirst, event.target);
				
				if (dropable) {
					// for seamless transition - position dragged el where dropped
					el = event.el.map((item, i) =>
						event.target.append(item).css({
							top: event.targetOffset[i].top +"px",
							left: event.targetOffset[i].left +"px",
						})
					);
					// auto-flip last card
					if (draggedParent.hasClass("pile")) {
						last = draggedParent.find(".card:last-child");
						
						if (last.hasClass("card-back")) {
							// adding "flipping-card" to get "3d-perspective"
							draggedParent.toggleClass("flipping-card", !last.length);

							// flip last card from source pile
							last.cssSequence("card-flip", "animationend", fEl =>
								fEl.removeClass("card-flip card-back")
									.parent()
									.removeClass("flipping-card"));
						}
					} else if (draggedParent.hasClass("waste")) {
						draggedParent.data({cardsLeft: draggedParent.find(".card").length});
					}

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

							// push move to undo stack
							UNDO_STACK.push({
								cards: [el.data("id")],
								from: draggedParent.data("id"),
								last: last && last.hasClass("card-back") ? last.data("id") : false
							});
						})
						.css({top: "0px", left: "0px"})
					);
				}

				return dropable;
			case "check-pile-drop":
				// reset drop zones
				self.layout.find(".no-drag-hover").removeClass("no-drag-hover");

				draggedFirst = event.el.get(0);
				draggedParent = draggedFirst.parent();
				zoneLastCard = event.target.find(".card:last");
				zoneLastSuit = zoneLastCard.data("suit");
				zoneLastNumb = zoneLastCard.data("numb");
				
				// number of cards in dropZone
				targetCards = event.target.find(".card");

				check = (zoneLastCard.length
							&& (SUIT_DICT[zoneLastSuit].accepts.indexOf(draggedFirst.data("suit")) < 0
								|| NUMB_DICT[zoneLastNumb].cascDrop !== draggedFirst.data("numb")))
							|| (!zoneLastCard.length && draggedFirst.data("numb") !== "K");

				if (!check) {
					dropable = true;

					// for seamless transition - position dragged el where dropped
					el = event.el.map((item, i) =>
						event.target.removeClass("pile-empty").append(item)
							.css({
								top: event.targetOffset[i].top +"px",
								left: event.targetOffset[i].left +"px",
							}));

					// auto-flip last card in source pile
					if (draggedParent.hasClass("pile")) {
						last = draggedParent.find(".card:last-child");
						if (last.hasClass("card-back")) {
							// adding "flipping-card" to get "3d-perspective"
							draggedParent.toggleClass("flipping-card", !last.length);

							// flip last card from source pile
							last.cssSequence("card-flip", "animationend", fEl =>
								fEl.removeClass("card-flip card-back")
									.parent()
									.removeClass("flipping-card"));
						}
					} else if (draggedParent.hasClass("waste")) {
						draggedParent.data({cardsLeft: draggedParent.find(".card").length});
					}

					cardDistance = parseInt(event.target.cssProp("--card-distance"), 10);
					setTimeout(() => 
						el.map((item, i) =>
							item.cssSequence("landing", "transitionend", lEl => {
									lEl.removeClass("landing").removeAttr("style");
									if (lEl[0] !== el[el.length - 1][0]) return;

									// push move to undo stack
									UNDO_STACK.push({
										cards: el.map(e => e.data("id")),
										from: draggedParent.data("id"),
										last: last && last.hasClass("card-back") ? last.data("id") : false
									});
								})
								.css({
									top: (cardDistance * (targetCards.length + i)) +"px",
									left: "0px",
								})
						));

					// todo: UNDO_STACK
				}
				return dropable;
			case "check-card-drag":
				el = $(event.target);
				draggedParent = el.parents(".pile, .deck, .waste");
				isLastCard = el.index() === draggedParent.find(".card").length - 1;

				if (draggedParent.hasClass("deck")) {
					dragable = false;
				} else if (isLastCard) {
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

				// dont show drag-hover on origin-pile
				draggedParent.toggleClass("no-drag-hover", !dragable);

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
				|| (cardSuit === fndLastSuit && NUMB_DICT[fndLastNumb].founDrop === cardNumb);
	},
	start() {
		let self = solitaire,
			j = 0,
			cards = [],
			deckOffset = this.deck.offset(),
			piles = this.piles.map((p, i) => this.piles.get(i).offset());

		// prepare deck
		CARD_DECK.suits.map(suit => {
			CARD_DECK.cards.map(card => {
				cards.push(`<div class="card ${suit.name.slice(0,1)}${card.numb} card-back" data-id="${j++}" data-numb="${card.numb}" data-suit="${suit.name}" data-ondrag="check-card-drag"></div>`);
			});
		});

		// shuffle & prepare animation
		cards = cards.shuffle();

		// left-over cards to deck
		this.deck.append(cards.splice(0, 24).join(""));

		cards.map((el, i) => {
			let j = PILES[i] - 1,
				card = this.piles.get(j).append(el),
				pile = piles[j];
			// starting point for animation
			card.data({pos: i})
				.cssSequence("moving", "transitionend", el => {
					el.addClass("landed");

					if (+el.data("pos") === 27) {
						// flips last cards in each pile
						self.piles.find(".card:last-child")
							.cssSequence("card-flip", "animationend", flipEl => {
								// remove class of "card-back"
								flipEl.removeClass("card-flip card-back");

								// if last element is turned
								if (el[0] !== flipEl[0]) return;

								// set board in "playing" mode
								self.board.addClass("playing").find(".solitaire .card").removeAttr("data-pos").removeClass("landing landed moving");
							});
					}
				})
				.css({
					top: (deckOffset.top - pile.top) +"px",
					left: (deckOffset.left - pile.left) +"px",
				});
		});

		// reset undo-stack for new game
		UNDO_STACK = [];

		// trigger animation
		setTimeout(() =>
				this.layout.find(".card")
					.css({ top: "", left: "", }), 60);
	}
};

export default solitaire;