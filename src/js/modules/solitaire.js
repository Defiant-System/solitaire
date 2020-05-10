
let APP,
	AUTO_COMPLETE,
	UNDO_STACK,
	WASTE_TURN = 3,
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
	name: "Solitaire",
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
		this.layout = window.find(".board > .solitaire");
		this.piles = window.find(".board > .solitaire .pile");
		this.deck = window.find(".board > .solitaire .deck");
		this.waste = window.find(".board > .solitaire .waste");
	},
	dispatch(event) {
		let self = solitaire,
			draggedFirst,
			draggedParent,
			cardDistance,
			targetCards,
			dropable,
			dragable,
			fromEl,
			toEl,
			isLastCard,
			last,
			cards,
			check,
			str,
			el;

		switch (event.type) {
			case "output-pgn-string":
				str = [self.name];
				str.push(
					(self.board.attr("data-theme") || "casino") +","+
					(self.board.attr("data-card-back") || "red") +","+
					WASTE_TURN
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
			case "reset-game-board":
				// reset undo-stack + auto-complete
				UNDO_STACK.reset(self.setState);
				AUTO_COMPLETE = false;
				// set board in "playing" mode
				self.board.addClass("playing")
				break;

			case "new-game":
				AUTO_COMPLETE = false;
				self.start();
				break;
			case "game-double-click":
				el = $(event.target);
				if (!el.hasClass("card") || el.hasClass("card-back")) return;
				
				fromEl = el.parent();
				check = self.layout.find(".hole.fndtn");
				check.filter((fnd, i) => {
					if (toEl) return;
					let target = check.get(i);
					if (self.isCardFoundationDropable(el, target)) toEl = target;
				});
				
				// reset drop zones
				self.layout.find(".no-drag-hover").removeClass("no-drag-hover");
				
				if (toEl && toEl.length) {
					last = fromEl.hasClass("pile") && fromEl.find(".card-back:nth-last-child(2)").length
						? fromEl.find(".card-back:nth-last-child(2)") : false;

					// play sound
					window.audio.play("shove-card");

					UNDO_STACK.push({
							animation: "card-move",
							cards: [el.data("id")],
							from: fromEl.data("id"),
							to: toEl.data("id"),
							flip: last ? last.data("id") : false
						});
				}
				break;
			case "solitaire-set-waste":
				WASTE_TURN = +event.arg;
				self.layout.toggleClass("waste-single", WASTE_TURN === 3);
				break;
			case "trigger-solitaire-cycle-flip-cards":
				self.layout.find(".deck").trigger("click");
				break;
			case "auto-complete":
				if (AUTO_COMPLETE && !event.next) return;
				AUTO_COMPLETE = true;
				dropable = true;

				self.layout.find(".drag-return-to-origin").removeClass("drag-return-to-origin");
				check = self.layout.find(".hole.fndtn");
				cards = self.layout.find(".pile .card:last-child, .waste .card:last-child")
							.toArray()
							.sort((a, b) => CARD_DECK.values[a.dataset.numb] - CARD_DECK.values[b.dataset.numb]);

				cards.map(el => {
					if (!dropable) return;
					el = $(el);

					check.map((fnd, i) => {
						let target = check.get(i);
						
						if (dropable && self.isCardFoundationDropable(el, target)) {
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
			case "check-game-won":
				if (self.layout.find(".hole .card").length === 52) {
					APP.dispatch({type: "game-won"});
				}
				break;
			case "cycle-flip-cards":
				cards = event.el.find(`.card:nth-child(-n+${WASTE_TURN})`);
				if (!cards.length) {
					UNDO_STACK.push({
							animation: "waste-to-deck",
							cards: self.waste.find(".card").map(el => el.getAttribute("data-id")),
							from: self.waste.data("id"),
							to: self.deck.data("id"),
						});
					return;
				}
				UNDO_STACK.push({
						animation: "cycle-flip",
						cards: cards.map(el => el.getAttribute("data-id")),
						from: self.deck.data("id"),
						to: self.waste.data("id"),
					});
				break;
			case "check-void-drop":
				draggedFirst = event.el.get(0);
				draggedParent = draggedFirst.parent().removeClass("no-drag-hover");
				break;
			case "check-foundation-drop":
				// number of cards in dropZone
				draggedFirst = event.el.get(0);
				draggedParent = draggedFirst.parent().removeClass("no-drag-hover");
				dropable = self.isCardFoundationDropable(draggedFirst, event.target);
				
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

							if (self.dispatch({type: "check-game-won"})) return;
							
							if (AUTO_COMPLETE) {
								self.dispatch({type: "auto-complete", next: true});
							}
							// push move to undo stack
							UNDO_STACK.push({
									cards: [el.data("id")],
									from: draggedParent.data("id"),
									to: event.target.data("id"),
									flip: last && last.hasClass("card-back") ? last.data("id") : false
								});
						})
						.css({top: "0px", left: "0px"}), 20);
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
								|| NUMB_DICT[zoneLastNumb].cascDrop !== draggedFirst.data("numb")));
						//	|| (!zoneLastCard.length && draggedFirst.data("numb") !== "K");

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
							last.cssSequence("card-flip", "animationend", fEl => {
								fEl.removeClass("card-flip card-back")
									.parent()
									.removeClass("flipping-card");

								// play sound
								setTimeout(() => window.audio.play("flip-card"), 20);
							});
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
											to: event.target.data("id"),
											flip: last && last.hasClass("card-back") ? last.data("id") : false
										});
								})
								.css({
									top: (cardDistance * (targetCards.length + i)) +"px",
									left: "0px",
								})
						));
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
					let pos = +el.data("pos");

					el.addClass("landed");
					
					if (pos < 26) {
						// play sound
						window.audio.play("shove-card");
					}
					if (pos === 27) {
						// flips last cards in each pile
						self.piles.find(".card:last-child")
							.cssSequence("card-flip", "animationend", flipEl => {
								// remove class of "card-back"
								flipEl.removeClass("card-flip card-back");

								// if last element is turned
								if (el[0] !== flipEl[0]) {
									// play sound
									return window.audio.play("shove-card");
								}

								// set board in "playing" mode
								self.board.addClass("playing");
								// reset cards
								self.layout.find(".card")
									.removeAttr("data-pos")
									.removeClass("landing landed moving");
							});
					}
				})
				.css({
					top: (deckOffset.top - pile.top) +"px",
					left: (deckOffset.left - pile.left) +"px",
				});
		});
		
		// reset undo-stack
		UNDO_STACK.reset(this.setState);
		// update toolbar buttons
		APP.btnPrev.addClass("tool-disabled_");
		APP.btnNext.addClass("tool-disabled_");
		
		// play sound
		window.audio.play("shove-card");

		// trigger animation
		setTimeout(() =>
				self.layout.find(".card")
					.css({ top: "", left: "" }), 100);
	},
	setState(redo, data) {
		let self = solitaire,
			selector = data.cards.map(id => `.card[data-id="${id}"]`),
			cards = self.layout.find(selector.join(",")),
			fromEl,
			fromElOffset,
			toEl,
			toElOffset,
			offset,
			targetCards,
			targetRect,
			cardDistance,
			cardRect,
			el,
			time = 50;
		// update toolbar buttons
		APP.btnPrev.removeClass("tool-active_").toggleClass("tool-disabled_", UNDO_STACK.canUndo);
		APP.btnNext.removeClass("tool-active_").toggleClass("tool-disabled_", UNDO_STACK.canRedo);
		// animation "playbacks"
		switch (data.animation) {
			case "waste-to-deck":
				// play sound
				window.audio.play("flip-card");

				if (redo) {
					fromEl = self.layout.find(`[data-id="${data.from}"]`);
					toEl = self.layout.find(`[data-id="${data.to}"]`);

					// prepare for 3d flip in deck-element
					fromEl.addClass("flipping-card unfan-cards").data({cardsLeft: ""});
					
					let fnWasteToDeck = uEl => {
							if (uEl[0] !== cards[cards.length - 1]) return;
							
							cards.cssSequence("card-back card-flip-back", "animationend", fEl => {
								if (fEl[0] !== cards[cards.length - 1]) return;

								// move cards in DOM
								cards = toEl.addClass("deck-fill")
											.append(cards).removeClass("card-flip-back card-unfan");
								
								// prepare calculation
								targetRect = fromEl[0].getBoundingClientRect();
								cardRect = cards.map(card => card.getBoundingClientRect());

								// starting point for animation
								cards.map((card, i) => {
									cards.get(i)
										.css({
											top: (targetRect.top - cardRect[i].top) +"px",
											left: (targetRect.left - cardRect[i].left) +"px",
										});
								});
								// trigger animation
								setTimeout(() => {
									cards.cssSequence("landing", "transitionend", lEl => {
											if (lEl[0] !== cards[0]) return;
											// reset cards
											cards.removeClass("landing");
											// reset elements
											toEl.removeClass("deck-fill");
											fromEl.removeClass("flipping-card unfan-cards");
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
				} else {
					fromEl = self.layout.find(`[data-id="${data.to}"]`);
					toEl = self.layout.find(`[data-id="${data.from}"]`);

					// adding "flipping-card" to get "3d-perspective"
					toEl.addClass("flipping-card").data({cardsLeft: cards.length});

					// animation calculation
					fromElOffset = fromEl[0].getBoundingClientRect();
					toElOffset = toEl[0].getBoundingClientRect();
					cardRect = cards[cards.length - 1].getBoundingClientRect();

					// prepare animation
					cards = toEl.append(cards)
						.cssSequence("showing", "transitionend", el => el.addClass("card-flip").removeAttr("style"))
						.cssSequence("card-flip", "animationend", el => {
							el.removeClass("card-flip card-back showing");

						})
						.css({
							top: (cardRect.top - toElOffset.top) +"px",
							left: (cardRect.left - toElOffset.left) +"px",
						});
					// trigger animation
					setTimeout(() =>
						cards.map((card, i) =>
							cards.get(i).css({ top: "0px", left: "0px", })), time);
				}
				break;
			case "cycle-flip":
				// play sound
				window.audio.play("flip-card");

				if (redo) {
					fromEl = self.layout.find(`[data-id="${data.from}"]`);
					toEl = self.layout.find(`[data-id="${data.to}"]`);
				} else {
					fromEl = self.layout.find(`[data-id="${data.to}"]`);
					toEl = self.layout.find(`[data-id="${data.from}"]`);
				}

				// prepare calculation
				fromElOffset = fromEl[0].getBoundingClientRect();
				toElOffset = toEl[0].getBoundingClientRect();
				cardRect = cards[cards.length - 1].getBoundingClientRect();

				if (redo) {
					// adding "flipping-card" to get "3d-perspective"
					toEl.addClass("flipping-card")
						.data({cardsLeft: toEl.find(".card").length + cards.length});

					// prepare animation
					cards = toEl.append(cards)
						.cssSequence("showing", "transitionend", el => el.addClass("card-flip").removeAttr("style"))
						.cssSequence("card-flip", "animationend", el => {
							el.removeClass("card-flip card-back showing");

							if (cards.length > 1) {
								el.cssSequence("card-fan", "transitionend", fEl => {
									let siblings = fEl.parents().find(".card");
									if (fEl.index() === siblings.length - 1) return;
									siblings.removeClass("card-fan");
									fEl.parents().removeClass("flipping-card");
								});
							} else {
								el.parent().removeClass("flipping-card");
							}
						})
						.css({
							top: (cardRect.top - toElOffset.top) +"px",
							left: (cardRect.left - toElOffset.left) +"px",
						});
				} else {
					// adding "flipping-card" to get "3d-perspective"
					fromEl.addClass("flipping-card unfan-cards")
						.data({cardsLeft: fromEl.find(".card").length - cards.length});

					// prepare animation
					cards.cssSequence("card-flip-back", "animationend", fEl => {
							fEl.removeClass("card-flip-back").addClass("card-back");
							if (fEl[0] !== cards[cards.length-1]) return;
							// reset waste
							fromEl.removeClass("flipping-card unfan-cards");

							cards = toEl.addClass("undo-waste-cards")
										.prepend(cards.toArray().reverse())
										.cssSequence("landing", "transitionend", lEl => {
											if (lEl[0] !== cards[cards.length-1]) return;
											// reset cards
											cards.removeClass("landing").removeAttr("style");
											// reset deck
											toEl.removeClass("undo-waste-cards");
										})
										.css({
											top: (fromElOffset.top - toElOffset.top) +"px",
											left: (fromElOffset.left - toElOffset.left) +"px",
										});

							// trigger animation
							setTimeout(() => cards.css({ top: "0px", left: "0px" }));
						});
				}
				// trigger animation
				setTimeout(() =>
					cards.map((card, i) =>
						cards.get(i).css({ top: "0px", left: "0px", })), time);

				break;
			case "card-move":
				if (redo) {
					fromEl = self.layout.find(`[data-id="${data.from}"]`);
					toEl = self.layout.find(`[data-id="${data.to}"]`);

					if (fromEl.hasClass("waste")) {
						fromEl.data({"cardsLeft": +fromEl.data("cardsLeft") - 1});
					}
				} else {
					fromEl = self.layout.find(`[data-id="${data.to}"]`);
					toEl = self.layout.find(`[data-id="${data.from}"]`);

					if (toEl.hasClass("waste")) {
						toEl.data({"cardsLeft": +toEl.data("cardsLeft") + 1});
					}

					if (data.flip && toEl.hasClass("pile")) {
						let flipCard = toEl.find(`.card[data-id="${data.flip}"]`);
						// adding "flipping-card" to get "3d-perspective"
						toEl.addClass("flipping-card undo-card");
						// flip last card from source pile
						flipCard.cssSequence("card-flip-back", "animationend", fEl => {
								fEl.removeClass("card-flip-back").addClass("card-back")
									.parent()
									.removeClass("flipping-card undo-card");
							});
						time = 350;
					}
				}
				// prepare animation
				fromElOffset = fromEl[0].getBoundingClientRect();
				toElOffset = toEl[0].getBoundingClientRect();
				offset = cards.map(card => {
					let rect = card.getBoundingClientRect();
					return {
						top: rect.top - toElOffset.top,
						left: rect.left - toElOffset.left,
					};
				});

				// number of cards in from element
				targetCards = toEl.find(".card");
				cardDistance = toEl.hasClass("waste") ? 0 : parseInt(toEl.cssProp("--card-distance"), 10) || 0;
				el = toEl.append(cards);
				el.map((item, i) => {
					el.get(i)
						.cssSequence("landing", "transitionend", lEl => {
							lEl.removeClass("landing").removeAttr("style");

							if (redo && self.dispatch({type: "check-game-won"})) return;

							if (redo && data.flip && fromEl.hasClass("pile")) {
								let flipCard = self.layout.find(`.card[data-id="${data.flip}"]`);
								// adding "flipping-card" to get "3d-perspective"
								fromEl.addClass("flipping-card");
								// flip last card from source pile
								flipCard.cssSequence("card-flip", "animationend", fEl => {
										fEl.removeClass("card-flip card-back")
											.parent()
											.removeClass("flipping-card");
										// play sound
										window.audio.play("flip-card");
									});
							}
						})
						.css({
							top: offset[i].top +"px",
							left: offset[i].left +"px",
						});
				});
				// trigger animation
				setTimeout(() => 
					el.map((item, i) => {
						let cardsMargin = parseInt(toEl.cssProp("--card-margin"), 10) || 0,
							left = !self.layout.hasClass("waste-single") && toEl.hasClass("waste")
								? Math.min(+toEl.data("cardsLeft") - 1, 3) * cardsMargin : 0,
							top = cardDistance * (targetCards.length + i);
						el.get(i).css({
							top: top +"px",
							left: left +"px"
						})
					}), time);
				break;
			default:
				// play sound
				window.audio.play(AUTO_COMPLETE ? "shove-card" : "put-card");

				data.animation = "card-move";
		}
	}
};

export default solitaire;
