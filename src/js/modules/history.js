
class History {
	constructor() {
		this.stack = [];
		this.index = -1;
	}
	push(data) {
		this.index++;

		this.setState.call({}, true, data);
		this.stack.splice(this.index);
		this.stack.push(data);
	}
	undo() {
		if (this.index >= 0) {
			let data = this.stack[this.index];
			this.setState.call({}, false, data);
			this.index--;
		}
	}
	redo() {
		let data = this.stack[this.index + 1];
		if (data) {
			this.setState.call({}, true, data);
			this.index++;
		}
	}
	reset() {
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
