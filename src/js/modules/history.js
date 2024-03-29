
class History {
	constructor() {
		this.stack = [];
		this.index = -1;
	}

	push(data) {
		this.index++;

		this.stack.splice(this.index);
		this.stack.push(data);
		this.setState.call({}, true, data);
	}

	undo() {
		if (this.index >= 0) {
			let data = this.stack[this.index];
			this.index--;
			this.setState.call({}, false, data);
		}
	}

	redo() {
		let data = this.stack[this.index + 1];
		if (data) {
			this.index++;
			this.setState.call({}, true, data);
		}
	}

	reset(setState) {
		this.setState = setState;
		this.stack = [];
		this.index = -1;
	}

	get canUndo() {
		return this.index > -1;
	}
	
	get canRedo() {
		return this.index < this.stack.length - 1;
	}
}

export default History;
