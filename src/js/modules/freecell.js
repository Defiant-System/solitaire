
let APP,
	AUTO_COMPLETE,
	UNDO_STACK,
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
		// prepare History
		UNDO_STACK = app.UNDO_STACK;

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
			str,
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
					if (!pId) return;
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
				// show deck before dealing
				AUTO_COMPLETE = false;
				if (self.deck.hasClass("show")) self.start();
				else self.deck.cssSequence("show", "transitionend", deck => self.start());
				break;
			case "game-double-click":
				el = $(event.target);
				if (!el.hasClass("card") || el.hasClass("card-back")) return;
				
				check = self.layout.find(".hole.fndtn");
				check.filter((fnd, i) => {
					if (dropable) return;
					let target = check.get(i);
					if (self.isCardFoundationDropable(el, target)) dropable = target;
				});
				
				if (dropable && dropable.length) {
					draggedParent = el.parents(".pile");

					// play sound
				 	window.audio.play("put-card");

					// push move to undo stack
					UNDO_STACK.push({
						animation: "card-move",
						cards: [el.data("id")],
						from: draggedParent.data("id"),
						to: dropable.data("id"),
					});
				}
				break;
			case "check-game-won":
				if (self.layout.find(".hole .card").length === 52) {
					APP.dispatch({type: "game-won"});
				}
				break;
			case "auto-complete":
				if (AUTO_COMPLETE && !event.next) return;
				AUTO_COMPLETE = true;
				dropable = true;

				self.layout.find(".drag-return-to-origin").removeClass("drag-return-to-origin");
				check = self.layout.find(".hole.fndtn");
				cards = self.layout.find(".pile .card:last-child, .slot .card:last-child")
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
					// show alert dialog
					window.dialog.alert("Can't autocomplete more&hellip; <test>");
					//window.dialog.alert("Can't autocomplete more&#8230;");
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
				dropable = event.el.length  === 1 && self.isCardFoundationDropable(draggedFirst, event.target);

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
								self.dispatch({type: "auto-complete", next: true});
							}
						})
						.css({top: "0px", left: "0px"}), 10);

					// push move to undo stack
					UNDO_STACK.push({
						cards: event.el.map(card => card.getAttribute("data-id")),
						from: from.data("id"),
						to: event.target.data("id"),
					});
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
					UNDO_STACK.push({
						cards: event.el.map(card => card.getAttribute("data-id")),
						from: from.data("id"),
						to: event.target.data("id"),
					});
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
					UNDO_STACK.push({
						cards: event.el.map(card => card.getAttribute("data-id")),
						from: from.data("id"),
						to: event.target.data("id"),
					});
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
				if (dragable.length - 1 > (4 - self.layout.find(".slot .card").length) && el.nextAll(".card").length) {
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
					let pos = +el.data("pos");

					el.addClass("landed");

					if (pos < 50) {
						// play sound
						window.audio.play("shove-card");
					}
					if (pos === 51) {
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
		
		// reset undo-stack
		UNDO_STACK.reset(this.setState);
		// update toolbar buttons
		APP.btnPrev.addClass("tool-disabled_");
		APP.btnNext.addClass("tool-disabled_");

		// trigger animation
		setTimeout(() => this.layout.find(".card").removeClass("in-deck").css({ top: "", left: "", }), 1);
	},
	setState(redo, data) {
		let self = freecell,
			selector = data.cards.map(id => `.card[data-id="${id}"]`),
			cards = self.layout.find(selector.join(",")),
			fromEl,
			toEl,
			fromOffset,
			toOffset,
			targetCards,
			cardRect,
			cardDistance,
			offset,
			el;

		// update toolbar buttons
		APP.btnPrev.removeClass("tool-active_").toggleClass("tool-disabled_", UNDO_STACK.canUndo);
		APP.btnNext.removeClass("tool-active_").toggleClass("tool-disabled_", UNDO_STACK.canRedo);
		// reset drop zones
		self.layout.find(".no-drag-hover").removeClass("no-drag-hover");

		// animation "playbacks"
		switch (data.animation) {
			case "card-move":
				if (redo) {
					fromEl = self.layout.find(`[data-id="${data.from}"]`);
					toEl = self.layout.find(`[data-id="${data.to}"]`);
				} else {
					fromEl = self.layout.find(`[data-id="${data.to}"]`);
					toEl = self.layout.find(`[data-id="${data.from}"]`);
				}

				// play sound
				window.audio.play("shove-card");

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

							if (redo) {
								// check if game is complete
								self.dispatch({type: "check-game-won"});
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
					}), 100);
				break;
			default:
				// play sound
				window.audio.play(AUTO_COMPLETE ? "shove-card" : "put-card");

				data.animation = "card-move";
		}
	}
};

export default freecell;
