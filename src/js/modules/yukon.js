
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
		let Self = yukon,
			zoneLastCard,
			zoneLastSuit,
			zoneLastNumb,
			draggedFirst,
			draggedParent,
			cardDistance,
			targetCards,
			dropable,
			dragable,
			fromEl,
			toEl,
			from,
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
				AUTO_COMPLETE = false;
				if (Self.deck.hasClass("show")) Self.start();
				else Self.deck.cssSequence("show", "transitionend", deck => Self.start());
				break;
			case "game-double-click":
				el = $(event.target);
				if (!el.hasClass("card") || el.hasClass("card-back") || el.nextAll(".card").length) return;
				
				fromEl = el.parent();
				check = Self.layout.find(".hole.fndtn");
				check.filter((fnd, i) => {
					if (toEl) return;
					let target = check.get(i);
					if (Self.isCardFoundationDropable(el, target)) toEl = target;
				});
				
				// reset drop zones
				Self.layout.find(".no-drag-hover").removeClass("no-drag-hover");
				
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
			case "can-auto-complete":
				dropable = Self.layout.find(".hole.fndtn");
				Self.layout.find(".pile .card:last-child").map(c => {
					let card = $(c);
					[...Array(4)].map((e, i) => {
						check = check || Self.isCardFoundationDropable(card, dropable.get(i));
					});
				});
				APP.btnAuto.toggleClass("tool-disabled_", check);
				break;
			case "auto-complete":
				if (AUTO_COMPLETE && !event.next) return;
				AUTO_COMPLETE = true;
				dropable = true;

				// clean cards
				Self.layout.find(".card.landing").removeClass("landing");

				Self.layout.find(".drag-return-to-origin").removeClass("drag-return-to-origin");
				check = Self.layout.find(".hole.fndtn");
				cards = Self.layout.find(".pile .card:last-child, .waste .card:last-child")
							.toArray()
							.sort((a, b) => CARD_DECK.values[a.dataset.numb] - CARD_DECK.values[b.dataset.numb]);

				cards.map(el => {
					if (!dropable) return;
					el = $(el);

					check.map((fnd, i) => {
						let target = check.get(i);
						
						if (dropable && Self.isCardFoundationDropable(el, target)) {
							let eRect = el[0].getBoundingClientRect(),
								tRect = target[0].getBoundingClientRect(),
								targetOffset = [{
									top: eRect.top - tRect.top,
									left:  eRect.left - tRect.left
								}];
							// trigger animation
							Self.dispatch({
								type: "check-foundation-drop",
								silent: event.silent,
								targetOffset,
								target,
								el,
							});
							// prevent further checks
							dropable = false;
						}
					});
				});
				if (!cards.length || dropable) {
					AUTO_COMPLETE = false;
					if (!event.silent && !Self.board.hasClass("game-won")) {
						// show alert dialog
						window.dialog.alert("Can't autocomplete more&hellip;");
					}
				}
				break;
			case "check-game-won":
				if (Self.layout.find(".hole .card").length === 52) {
					APP.dispatch({type: "game-won"});
				}
				break;
			case "check-void-drop":
				draggedFirst = event.el.get(0);
				draggedParent = draggedFirst.parent().removeClass("no-drag-hover");
				break;
			case "check-foundation-drop":
				// number of cards in dropZone
				draggedFirst = event.el.get(0);
				from = draggedFirst.parent().removeClass("no-drag-hover");
				dropable = event.el.length  === 1 && Self.isCardFoundationDropable(draggedFirst, event.target);

				if (dropable) {
					// for seamless transition - position dragged el where dropped
					el = event.el.map((item, i) =>
						event.target.append(item).css({
							top: event.targetOffset[i].top +"px",
							left: event.targetOffset[i].left +"px",
						})
					);
					// auto-flip last card
					if (from.hasClass("pile")) {
						last = from.find(".card:last-child");
						
						if (last.hasClass("card-back")) {
							// adding "flipping-card" to get "3d-perspective"
							from.toggleClass("flipping-card", !last.length);

							// flip last card from source pile
							last.cssSequence("card-flip", "animationend", fEl =>
								fEl.removeClass("card-flip card-back")
									.parent()
									.removeClass("flipping-card"));
						}
					}
					// landing position
					setTimeout(() => el[0]
						.cssSequence("landing", "transitionend", el => {
							el.removeClass("landing").removeAttr("style");
							
							if (Self.dispatch({type: "check-game-won"})) return;

							if (AUTO_COMPLETE) {
								Self.dispatch({type: "auto-complete", silent: event.silent, next: true});
							}
						})
						.css({top: "0px", left: "0px"}), 15);

					// push move to undo stack
					UNDO_STACK.push({
						cards: event.el.map(card => card.getAttribute("data-id")),
						from: from.data("id"),
						to: event.target.data("id"),
						flip: last && last.hasClass("card-back") ? last.data("id") : false
					});
				}
				return dropable;
			case "check-pile-drop":
				// reset drop zones
				Self.layout.find(".no-drag-hover").removeClass("no-drag-hover");

				draggedFirst = event.el.get(0);
				draggedParent = draggedFirst.parent();
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
					}

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
					UNDO_STACK.push({
						cards: event.el.map(card => card.getAttribute("data-id")),
						from: draggedParent.data("id"),
						to: event.target.data("id"),
						flip: last && last.hasClass("card-back") ? last.data("id") : false
					});
				}
				return dropable;
			case "check-card-drag":
				Self.layout.find(".landing, .drag-return-to-origin")
					.removeClass("landing drag-return-to-origin");
				
				el = $(event.target);
				draggedParent = el.parents(".pile, .deck, .waste");

				if (el.hasClass("card-back")) {
					dragable = false;
				} else {
					dragable = el.nextAll(".card", true);
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
		let Self = yukon,
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
		cards = APP.shuffle(cards);

		// add a fake card for deck-flip animation
		this.deckCard = this.deck.append(cards[51]);

		// prepare deal animation
		cards = cards.map((card, i) => i < 21 ? card : card.replace(/ card-back/, " hidden"));

		// cards animation
		cards.map((el, i) => {
			let j = PILES[i] - 1,
				card = this.piles.get(j).append(el),
				pile = piles[j];
			
			// starting point for animation
			card.data({pos: i > 20 ? 100 + i : i})
				.cssSequence("moving", "transitionend", el => {
					let pos = +el.data("pos");

					el.addClass("landed");

					if (pos < 151) {
						// play sound
						window.audio.play("shove-card");
					}

					// deck flip time
					if (pos === 20) {
						Self.deckCard
							.cssSequence("card-flip", "animationend", flipEl => {
								Self.layout.find(".card.hidden").removeClass("hidden");
								// remove fake flip card
								flipEl.remove();
							});
					}
					// last card
					if (pos === 151) {
						Self.deck.removeClass("show");
						// set board in "playing" mode
						Self.board.addClass("playing")
							.find(".yukon .card")
							.removeAttr("data-pos")
							.removeClass("landing landed moving");
						// check if tableau can be auto completed -> toggle toolbar button
						setTimeout(() =>
							Self.dispatch({ type: "auto-complete", silent: true }), 10);
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
				Self.layout.find(".card")
					.css({ top: "", left: "" }), 100);
	},
	setState(redo, data) {
		let Self = yukon,
			selector = data.cards.map(id => `.card[data-id="${id}"]`),
			cards = Self.layout.find(selector.join(",")),
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
			case "card-move":
				if (redo) {
					fromEl = Self.layout.find(`[data-id="${data.from}"]`);
					toEl = Self.layout.find(`[data-id="${data.to}"]`);

					if (fromEl.hasClass("waste")) {
						fromEl.data({"cardsLeft": +fromEl.data("cardsLeft") - 1});
					}
				} else {
					fromEl = Self.layout.find(`[data-id="${data.to}"]`);
					toEl = Self.layout.find(`[data-id="${data.from}"]`);

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
				cardDistance = toEl.hasClass("waste") ? 0 : parseInt(toEl.cssProp("--card-distance"), 10) || 0;
				el = toEl.append(cards);
				el.map((item, i) => {
					el.get(i)
						.cssSequence("landing", "transitionend", lEl => {
							lEl.removeClass("landing").removeAttr("style");

							if (redo && Self.dispatch({type: "check-game-won"})) return;

							if (redo && data.flip && fromEl.hasClass("pile")) {
								let flipCard = Self.layout.find(`.card[data-id="${data.flip}"]`);
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
							left = !Self.layout.hasClass("waste-single") && toEl.hasClass("waste")
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

		// check if tableau can be auto completed -> toggle toolbar button
		setTimeout(() => Self.dispatch({ type: "can-auto-complete" }), 360);
	}
};

export default yukon;
