
const Library = {
	cardFlip: { buffer: null, url: "~/sound/card-flip.mp3" },
	card: { buffer: null, url: "~/sound/card.m4a" }
};

class Audio {
	constructor() {
		this.ctx = new (window.AudioContext || window.webkitAudioContext)();

		let that = this,
			buffer = this.ctx.createBuffer(1, 1, 22050),
			source = this.ctx.createBufferSource();

		source.buffer = buffer;
		source.connect(this.ctx.destination);
		source.start ? source.start(0) : source.noteOn(0);

		for (let key in Library) {
			let sound = Library[key],
				xhr = new XMLHttpRequest();

			xhr.open("GET", sound.url, true);
			xhr.responseType = "arraybuffer";

			xhr.onload = function(e) {
				if (this.status == 0 || this.status == 200) {
					that.ctx.decodeAudioData(xhr.response, buffer => {
						sound.buffer = buffer;
					}, err => console.log(err));
				}
			};
			xhr.send();
		}
	}
	play(name) {
		let source = this.ctx.createBufferSource();
		source.buffer = Library[name].buffer;
		source.connect(this.ctx.destination);

		//setTimeout(() => source.start ? source.start(0) : source.noteOn(0));
		source.start ? source.start(0) : source.noteOn(0);
	}
}

export default Audio;
