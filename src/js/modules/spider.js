
let APP,
	AUTO_COMPLETE,
	UNDO_STACK,
	LEVEL = 1,
	SUITS = {
		1: ["club"],
		2: ["club", "diamond"],
		3: ["club", "diamond", "heart", "spade"]
	},
	CARD_DECK,
	SUIT_DICT,
	NUMB_DICT;

let spider = {
	name: "Spider",
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
		this.layout = window.find(".board > .spider");
		this.piles = window.find(".board > .spider .pile");
		this.deck = window.find(".board > .spider .deck");
	},
	dispatch(event) {
		let Self = spider,
			draggedFirst,
			from,
			cardDistance,
			targetCards,
			dropable,
			dragable,
			isLastCard,
			last,
			cards,
			check,
			str,
			el;

		switch (event.type) {
			case "output-pgn-string":
				str = [Self.name];
				str.push(
					(Self.board.attr("data-theme") || "casino") +","+
					(Self.board.attr("data-card-back") || "red")
				);
				// collect layout info + data
				Self.layout.find("> *").map(el => {
					let pId = el.getAttribute("data-id"),
						cards = $(".card", el).map(c =>
							c.dataset.suit.slice(0,1) +
							c.dataset.numb +"-"+
							(~c.className.indexOf("card-back") ? "H" : "S") + c.dataset.id);
					if (!pId) return;
					str.push(pId +":"+ cards.join(","))
				});
				// return to app
				return str.join("\n");
			case "reset-game-board":
				// reset undo-stack + auto-complete
				UNDO_STACK.reset(Self.setState);
				AUTO_COMPLETE = false;
				// set board in "playing" mode
				Self.board.addClass("playing")
				break;

			case "new-game":
				setTimeout(() => this.start(), 350);
				break;
			case "set-spider-level":
				LEVEL = +event.arg;

				if (!event.noStart) {
					APP.dispatch({type: "new-game"});
				}
				// update settings
				APP.settings["spider-level"] = LEVEL;
				break;
			case "game-double-click":
				el = $(event.target);
				if (!el.hasClass("card") || el.hasClass("card-back")) return;
				// todo ?
				break;
			case "trigger-spider-deal-cards":
				Self.layout.find(".deck").trigger("click");
				break;
			case "check-game-won":
				if (this.layout.find(".hole .card").length === 104) {
					APP.dispatch({type: "game-won"});
				} else if (this.layout.find(".pile .card").length < 10) {
					window.dialog.alert({
						message: "No more possible moves - there is not enough cards to cover empty holes.\nPress 'OK' to start again.",
						onOk: () => APP.dispatch({ type: "new-game" })
					});
				}
				break;
			case "spider-deal-cards":
				// reset cards
				Self.layout.find(".card.landing").removeClass("landing");

				let empty = Self.layout.find(".pile:empty");
				if (empty.length) {
					// no-dealing if there are empty slots
					return empty.cssSequence("no-deal", "animationend", el => el.removeClass("no-deal"));
				}

				let pilesOffset = Self.piles.addClass("dealing-cards").map((p, i) => Self.piles.get(i).offset()),
					deckOffset = Self.deck.offset();
				cardDistance = parseInt(Self.piles.get(0).cssProp("--card-distance"), 10);
				cards = Self.deck.find(".card:nth-last-child(-n+10)");

				// push move to undo stack
				UNDO_STACK.push({
					animation: "deal-cards",
					cards: cards.map(card => card.getAttribute("data-id")),
				});
				break;
			case "check-sibling-sequence":
				cards = event.pile.find(".card:nth-last-child(-n+13)");

				cards = cards.filter((el, i, siblings) => {
						let card = cards.get(i),
							next = i < siblings.length - 1 ? cards.get(i+1) : false,
							numb = card.data("numb");
						if (!next) return true;
							return !card.hasClass("card-back")
									&& card.data("suit") === next.data("suit")
									&& NUMB_DICT[numb].cascDrop === next.data("numb");
					});
				
				if (cards.length === 13) {
					last = event.pile.find(".card:nth-last-child(14)");
					// push move to undo stack
					UNDO_STACK.push({
						animation: "collapse-cards",
						cards: cards.map(card => card.getAttribute("data-id")),
						from: event.pile.data("id"),
						to: Self.layout.find(".hole:empty").get(0).data("id"),
						flip: last.length && last.hasClass("card-back") ? last.data("id") : false,
						dropped: event.dropped,
						droppedFrom: event.from.data("id"),
						droppedLast: event.last.length && event.last.hasClass("card-back") ? event.last.data("id") : false,
					});
					return true;
				}
				break;
			case "check-void-drop":
				draggedFirst = event.el.get(0);
				from = draggedFirst.parent().removeClass("no-drag-hover");
				break;
			case "check-pile-drop":
				draggedFirst = event.el.get(0);
				from = draggedFirst.parent().removeClass("no-drag-hover");
				let zoneLastCard = event.target.find(".card:last"),
					zoneLastSuit = zoneLastCard.data("suit"),
					zoneLastNumb = zoneLastCard.data("numb");
				
				// number of cards in dropZone
				targetCards = event.target.find(".card");

				check = zoneLastCard.length && NUMB_DICT[zoneLastNumb].cascDrop !== draggedFirst.data("numb");

				if (!check) {
					dropable = true;

					// for seamless transition - position dragged el where dropped
					el = event.el.map((item, i) =>
						event.target.append(item).css({
							top: event.targetOffset[i].top +"px",
							left: event.targetOffset[i].left +"px",
						})
					);
					// auto-flip last card in source pile
					last = from.find(".card:last-child");
					if (last.hasClass("card-back")) {
						// adding "flipping-card" to get "3d-perspective"
						from.toggleClass("flipping-card", !last.length);

						// flip last card from source pile
						last.cssSequence("card-flip", "animationend", fEl => {
							// play sound
							window.audio.play("flip-card");

							fEl.removeClass("card-flip card-back")
								.parent()
								.removeClass("flipping-card");
						});
					}

					cardDistance = parseInt(event.target.cssProp("--card-distance"), 10);
					setTimeout(() => 
						el.map((item, i) => item
							.cssSequence("landing", "transitionend", card => {
								if (card[0] !== event.el[event.el.length-1]) return;
								event.el.removeClass("landing").removeAttr("style");

								// check if cards are collapsable
								let undoPushed = Self.dispatch({
									type: "check-sibling-sequence",
									pile: event.target,
									dropped: event.el.map(e => e.getAttribute("data-id")),
									from,
									last,
								});

								if (undoPushed) return;
								
								// push move to undo stack
								UNDO_STACK.push({
									cards: event.el.map(card => card.getAttribute("data-id")),
									from: from.data("id"),
									to: event.target.data("id"),
									flip: last.hasClass("card-back") ? last.data("id") : false,
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
				Self.layout.find(".landing, .drag-return-to-origin")
					.removeClass("landing drag-return-to-origin");

				el = $(event.target);
				if (el.hasClass("landing") || el.hasClass("moving") || el.hasClass("card-back")) return;

				from = el.parent();
				isLastCard = el.index() === from.find(".card").length - 1;

				if (!from.hasClass("pile")) {
					dragable = false;
				} else if (isLastCard) {
					// if last card in pile, ok to drag
					dragable = el;
				} else {
					// if not check sequence
					cards = el.nextAll(".card", true);

					check = cards.filter((card, i, siblings) => {
						let next = siblings[i+1],
							numb = card.getAttribute("data-numb");
						if (!next) return true;
						return card.getAttribute("data-suit") === next.getAttribute("data-suit")
								&& NUMB_DICT[numb].cascDrop === next.getAttribute("data-numb");
					});
					// sequence checks
					dragable = cards.length === check.length ? cards : false;
				}

				// dont show drag-hover on origin-pile
				from.toggleClass("no-drag-hover", !dragable);

				return dragable;
		}
	},
	start() {
		let Self = spider,
			j = 0,
			cards = [],
			suits = SUITS[LEVEL],
			deckOffset = this.deck.offset(),
			piles = this.piles.map((p, i) => this.piles.get(i).offset());

		// prepare "deck"
		[...Array(8)].map((e, i) => {
			let suit = suits[i % suits.length];
			CARD_DECK.cards.map(card => {
				cards.push(`<div class="card ${suit.slice(0,1)}${card.numb} card-back" data-id="${j++}" data-numb="${card.numb}" data-suit="${suit}" data-ondrag="check-card-drag"></div>`);
			});
		});

		// shuffle cards
		cards = APP.shuffle(cards);

		// left-over cards to deck
		this.deck.append(cards.splice(0, 50).join(""));

		// prepare animation
		cards.map((el, i) => {
			let card = this.piles.get(i % 10).append(el),
				pile = piles[i % 10];

			card.data({pos: i})
				.cssSequence("moving", "transitionend", el => {
					let pos = +el.data("pos");

					el.addClass("landed");

					if (pos < 52) {
						// play sound
						window.audio.play("shove-card");
					}

					if (pos === 53) {
						// flips last cards in each pile
						Self.piles.find(".card:last-child")
							.cssSequence("card-flip", "animationend", flipEl => {
								// remove class of "card-back"
								flipEl.removeClass("card-flip card-back");

								// if last element is not turned
								if (!flipEl.parent().hasClass("pile-10")) {
									// play sound
									return window.audio.play("shove-card");
								}

								// set board in "playing" mode
								Self.board.addClass("playing").find(".spider .card").removeAttr("data-pos").removeClass("landing moving landed");
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

		// trigger animation
		setTimeout(() => this.layout.find(".card").removeClass("in-deck").css({ top: "", left: "", }), 60);
	},
	setState(redo, data) {
		let Self = spider,
			selector = data.cards.map(id => `.card[data-id="${id}"]`),
			cards = Self.layout.find(selector.join(",")),
			fromEl,
			toEl,
			fromOffset,
			toOffset,
			targetCards,
			targetRect,
			cardRect,
			cardDistance,
			offset,
			el,
			time = 50;

		// update toolbar buttons
		APP.btnPrev.removeClass("tool-active_").toggleClass("tool-disabled_", UNDO_STACK.canUndo);
		APP.btnNext.removeClass("tool-active_").toggleClass("tool-disabled_", UNDO_STACK.canRedo);
		// reset drop zones
		Self.layout.find(".no-drag-hover").removeClass("no-drag-hover");

		// animation "playbacks"
		switch (data.animation) {
			case "collapse-cards":
				if (redo) {
					// play sound
					window.audio.play("shove-card");

					// calcaultions
					fromEl = Self.layout.find(`[data-id="${data.from}"]`);
					toEl = Self.layout.find(`[data-id="${data.to}"]`);

					let droppedSelector = data.dropped.map(id => `.card[data-id="${id}"]`),
						droppedCards = Self.layout.find(droppedSelector.join(","));
					if (droppedCards.length && fromEl[0] !== droppedCards.parent()[0]) {
						Self.setState(true, {
								animation: "card-move",
								cards: data.dropped,
								from: data.droppedFrom,
								to: data.from,
								flip: data.droppedLast,
							});
						time = 350;
					}
					// wait if there is a "pre-animation"
					setTimeout(() => {
						cards = Self.layout.find(selector.join(","));
						targetRect = toEl[0].getBoundingClientRect();
						cardRect = cards.map(card => {
							let cardRect = card.getBoundingClientRect();
							return {
								top: cardRect.top - targetRect.top,
								left: cardRect.left - targetRect.left,
							}
						});
						el = cards.map((card, i) => toEl.append(card).css({
							top: cardRect[i].top +"px",
							left: cardRect[i].left +"px",
						}));
					}, time - 50);
					// trigger animation
					setTimeout(() =>
						el.map((item, i) => 
							item.cssSequence("collapse", "transitionend", card => {
								if (card.data("numb") !== "A") return;
								el.map((item, j) => {
									item.cssSequence("landing", "transitionend", c => {
										if (c.data("numb") !== "A") return;

										// play sound
										window.audio.play("shove-card");

										// land set into empty hole and reset Node
										cards.removeClass("landing collapse").removeAttr("style");

										let flipCard = fromEl.find(".card:last-child");
										if (flipCard.hasClass("card-back")) {
											// adding "flipping-card" to get "3d-perspective"
											fromEl.toggleClass("flipping-card", !flipCard.length);

											// flip last card from source pile
											flipCard.cssSequence("card-flip", "animationend", fEl => {
												// play sound
												window.audio.play("flip-card");
												
												fEl.removeClass("card-flip card-back")
													.parent().removeClass("flipping-card");
											});
										}
										// check if game is complete
										Self.dispatch({type: "check-game-won"})
									})
									.css({ top: "0px", left: "0px" });
								});
							})
							.css({ top: cardRect[0].top +"px" })), time);
				} else {
					// calcaultions
					fromEl = Self.layout.find(`[data-id="${data.to}"]`);
					toEl = Self.layout.find(`[data-id="${data.from}"]`);
					fromOffset = fromEl[0].getBoundingClientRect();
					toOffset = toEl[0].getBoundingClientRect();

					if (data.flip) {
						let flipCard = toEl.find(`[data-id="${data.flip}"]`);
						// adding "flipping-card" to get "3d-perspective"
						toEl.addClass("flipping-card");
						// flip last card from source pile
						flipCard.cssSequence("card-flip-back", "animationend", fEl =>
							fEl.removeClass("card-flip-back").addClass("card-back")
								.parent()
								.removeClass("flipping-card"));
						time = 350;
					}

					// append card elements in original pile
					cards = toEl.addClass("undo-collapsing")
								.append(cards).addClass("expanding").css({
									top: (fromOffset.top - toOffset.top) +"px",
									left: (fromOffset.left - toOffset.left) +"px",
								});

					// number of cards in from element
					targetCards = toEl.find(".card").length - cards.length;
					cardDistance = parseInt(toEl.cssProp("--card-distance"), 10);

					setTimeout(() => 
						cards
							.cssSequence("landing", "transitionend", lEl => {
								lEl.removeClass("landing").removeAttr("style");
								if (lEl[0] !== cards[cards.length-1]) return;

								cards.map((card, i) => {
									cards.get(i)
										.cssSequence("landing", "transitionend", l => {
											if (l[0] !== cards[cards.length - 2]) return;
											// reset cards
											cards.removeClass("landing expanding").removeAttr("style");
											// reset expanded cards pile
											lEl.parent().removeClass("undo-collapsing");

											{ // *** last-stage -- START
												Self.layout.find(`.card[data-id="${data.droppedLast}"]`)
													.cssSequence("card-flip-back", "animationend", pfEl => {
														// reset flipping card
														pfEl.addClass("card-back").removeClass("card-flip-back");
													})
													.parent().addClass("flipping-card undo-card");

												// finally put back original card that triggered collapse
												let selector = data.dropped.map(id => `.card[data-id="${id}"]`),
													cards = Self.layout.find(selector.join(",")),
													droppedFrom = Self.layout.find(`[data-id="${data.droppedFrom}"]`),
													targetCards = droppedFrom.find(".card").length,
													fromEl = droppedFrom[0].getBoundingClientRect(),
													offset = cards.map(card => {
														let cardRect = card.getBoundingClientRect();
														return {
															top: cardRect.top - fromEl.top,
															left: cardRect.left - fromEl.left,
														};
													});

												if (Self.deck[0] === droppedFrom[0]) {
													// re-assemble to deck
													cards = Self.layout.find(".pile .card:last-child");
													
													Self.setState(false, {
														animation: "deal-cards",
														cards: cards.map(card => card.getAttribute("data-id")),
													});
													return;
												}

												el = droppedFrom.append(cards);
												el.map((item, i) => {
													el.get(i)
														.cssSequence("landing", "transitionend", lEl => {
															lEl.removeClass("landing").removeAttr("style");
															droppedFrom.removeClass("flipping-card undo-card");
														})
														.css({
															top: offset[i].top +"px",
															left: offset[i].left +"px",
														});
												});

												// trigger final animation
												setTimeout(() => 
													el.map((item, i) => {
														el.get(i).css({
															top: (cardDistance * (targetCards + i)) +"px",
															left: "0px"
														})
													}), 100);
											} // *** last-stage -- END

										})
										.css({ top: (cardDistance * (targetCards + i)) +"px" });
								});
							})
							.css({top: (cardDistance * targetCards) +"px", left: "0"}), time);
				}
				break;
			case "deal-cards":
				if (redo) {
					// calcaultions
					toEl = Self.piles;
					toOffset = toEl.addClass("dealing-cards").map((pile, i) => toEl.get(i).offset());
					fromOffset = Self.deck.offset();
					cardDistance = parseInt(toEl.get(0).cssProp("--card-distance"), 10) || 0;

					// prepare animation
					cards.map((card, i) => {
						// land and flip cards sequence
						toEl.get(i).append(card)
							.cssSequence("landing", "transitionend", lEl => {
								lEl.addClass("landed");

								// play sound
								window.audio.play("shove-card");

								if (!lEl.parent().hasClass("pile-10")) return;

								toEl.addClass("flipping-cards");
								cards.cssSequence("card-flip", "animationend", fEl => {
									// play sound
									window.audio.play("shove-card");

									if (!fEl.parent().hasClass("pile-10")) return;
									// reset nodes
									toEl.removeClass("dealing-cards flipping-cards");
									cards.removeClass("card-flip card-back landing landed").removeAttr("style");

									// check if cards are collapsable
									toEl.map(pEl => {
										let pile = $(pEl);
										
										Self.dispatch({
											type: "check-sibling-sequence",
											dropped: pile.find(".card:last"),
											from: Self.deck,
											last: false,
											pile,
										});
									});
								})
							})
							.css({
								top: (fromOffset.top - toOffset[i].top) +"px",
								left: (fromOffset.left - toOffset[i].left) +"px",
							});
					});
					// trigger animation
					setTimeout(() => {
						cards.map((card, i) => {
							let pile = toEl.get(i),
								top = cardDistance * (pile.find(".card").length - 1);
							cards.get(i).css({ top: top +"px", left: "0px" });
						});
					}, time);
				} else {
					// calcaultions
					toEl = Self.deck;
					toOffset = toEl.addClass("undo-collect")[0].getBoundingClientRect();
					offset = cards.map((c, i) => c.getBoundingClientRect());
					
					// adding "flipping-card" to get "3d-perspective"
					Self.piles.addClass("re-flipping-cards");
					// prepare for animation
					cards.cssSequence("card-flip-back", "animationend", fEl => {
						if (fEl[0] !== cards[0]) return;
						// reset flipping cards
						cards.removeClass("card-flip-back").addClass("card-back");
						// prepare animation
						cards.map((c, i) => {
							toEl.append(c)
								.cssSequence("landing", "transitionend", lEl => {
									if (lEl[0] !== cards[0]) return;
									// reset cards
									cards.removeClass("landing").removeAttr("style");
									// reset piles
									Self.piles.removeClass("re-flipping-cards");
									// reset deck
									toEl.removeClass("undo-collect");
								})
								.css({
									top: (offset[i].top - toOffset.top) +"px",
									left: (offset[i].left - toOffset.left) +"px",
								});
						});
						// trigger animation
						setTimeout(() =>
							cards.map((c, i) =>
								cards.get(i).css({ top: "0px", left: "0px" })), time);
					});
				}
				break;
			case "card-move":
				if (redo) {
					fromEl = Self.layout.find(`[data-id="${data.from}"]`);
					toEl = Self.layout.find(`[data-id="${data.to}"]`).addClass("undo-collapsing");
				} else {
					fromEl = Self.layout.find(`[data-id="${data.to}"]`);
					toEl = Self.layout.find(`[data-id="${data.from}"]`);

					if (data.flip && toEl.hasClass("pile")) {
						let flipCard = toEl.find(`.card[data-id="${data.flip}"]`);
						// adding "flipping-card" to get "3d-perspective"
						toEl.addClass("flipping-card undo-card");
						// flip last card from source pile
						flipCard.cssSequence("card-flip-back", "animationend", fEl =>
							fEl.removeClass("card-flip-back").addClass("card-back")
								.parent()
								.removeClass("flipping-card undo-card"));
						time = 350;
					}
				}
				// animation calculation
				fromOffset = toEl[0].getBoundingClientRect();
				toOffset = toEl[0].getBoundingClientRect();
				cardRect = cards[0].getBoundingClientRect();
				targetCards = toEl.find(".card");
				cardDistance = parseInt(toEl.cssProp("--card-distance"), 10) || 0;
				offset = cards.map(card => {
					let rect = card.getBoundingClientRect();
					return {
						top: rect.top - toOffset.top,
						left: rect.left - toOffset.left,
					};
				});

				// prepare animation
				el = toEl.append(cards);
				el.map((item, i) => {
					el.get(i)
						.cssSequence("landing", "transitionend", lEl => {
							// reset element
							lEl.removeClass("landing").removeAttr("style");
							toEl.removeClass("undo-collapsing");

							if (redo && data.flip && fromEl.hasClass("pile")) {
								let flipCard = Self.layout.find(`.card[data-id="${data.flip}"]`);
								// adding "flipping-card" to get "3d-perspective"
								fromEl.addClass("flipping-card");
								// flip last card from source pile
								flipCard.cssSequence("card-flip", "animationend", fEl =>
									fEl.removeClass("card-flip card-back")
										.parent()
										.removeClass("flipping-card"));
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
							top = toEl.hasClass("pile") ? cardDistance * (targetCards.length + i) : 0;
						el.get(i).css({
							top: top +"px",
							left: "0px"
						})
					}), time);
			default:
				// play sound
				window.audio.play("put-card");

				data.animation = "card-move";
		}
	}
};

export default spider;
