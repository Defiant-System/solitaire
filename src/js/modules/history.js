
class UndoItem {
	constructor(perform, data) {
		this.perform = perform;
		this.data = data;
	}
}

class History {
	constructor() {
		this.stack = [];
		this.index = -1;
	}
	push(performm, data) {
		this.index++;

		this.stack.splice(this.index);
		this.stack.push(new UndoItem(perform, data));
	}
	undo() {
		if (this.index >= 0) {
			let item = this.stack[this.index];
			item.perform.call({}, false, item.data);
			this.index--;
		}
	}
	redo() {
		let item = this.stack[this.index + 1];
		if (item) {
			item.perform.call({}, true, item.data);
			this.index++;
		}
	}
	invalidate() {
		this.stack = [];
		this.index = -1;
	}
	get canUndo() {
		return this.index > 0;
	}
	get canRedo() {
		return this.index < this.stack.length - 1;
	}
}

export default History;
