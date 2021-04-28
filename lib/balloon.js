import jQuery from "jquery";
const cjq = jQuery.noConflict();

export default class Balloon {
	constructor (targetEl) {
		this.targetEl = targetEl;
		
		this.hidden = true;
		this.setup();
		this.WORD_SPEAK_TIME = 200;
		this.CLOSE_BALLOON_DELAY = 2000;
		this.BALLOON_MARGIN = 15;
	}
	
	setup () {
		
		this.balloon = cjq('<div class="clippy-balloon"><div class="clippy-tip"></div><div class="clippy-content"></div></div> ').hide();
		this.content = this.balloon.find('.clippy-content');
		
		cjq(document.body).append(this.balloon);
	}
	
	reposition () {
		let sides = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
		
		for (let i = 0; i < sides.length; i++) {
			let s = sides[i];
			this.position(s);
			if (!this.isOut()) break;
		}
	}
	
	position (side) {
		let o = this.targetEl.offset();
		let h = this.targetEl.height();
		let w = this.targetEl.width();
		o.top -= cjq(window).scrollTop();
		o.left -= cjq(window).scrollLeft();
		
		let bH = this.balloon.outerHeight();
		let bW = this.balloon.outerWidth();
		
		this.balloon.removeClass('clippy-top-left');
		this.balloon.removeClass('clippy-top-right');
		this.balloon.removeClass('clippy-bottom-right');
		this.balloon.removeClass('clippy-bottom-left');
		
		let left, top;
		switch (side) {
			case 'top-left':
			// right side of the balloon next to the right side of the agent
			left = o.left + w - bW;
			top = o.top - bH - this.BALLOON_MARGIN;
			break;
			case 'top-right':
			// left side of the balloon next to the left side of the agent
			left = o.left;
			top = o.top - bH - this.BALLOON_MARGIN;
			break;
			case 'bottom-right':
			// right side of the balloon next to the right side of the agent
			left = o.left;
			top = o.top + h + this.BALLOON_MARGIN;
			break;
			case 'bottom-left':
			// left side of the balloon next to the left side of the agent
			left = o.left + w - bW;
			top = o.top + h + this.BALLOON_MARGIN;
			break;
		}
		
		this.balloon.css({ top: top, left: left });
		this.balloon.addClass('clippy-' + side);
	}
	
	isOut () {
		let o = this.balloon.offset();
		let bH = this.balloon.outerHeight();
		let bW = this.balloon.outerWidth();
		
		let wW = cjq(window).width();
		let wH = cjq(window).height();
		let sT = cjq(document).scrollTop();
		let sL = cjq(document).scrollLeft();
		
		let top = o.top - sT;
		let left = o.left - sL;
		let m = 5;
		if (top - m < 0 || left - m < 0) return true;
		return (top + bH + m) > wH || (left + bW + m) > wW;
	}
	
	speak (complete, text, hold) {
		this.hidden = false;
		this.show();
		let c = this.content;
		// set height to auto
		c.height('auto');
		c.width('auto');
		// add the text
		c.text(text);
		// set height
		c.height(c.height());
		c.width(c.width());
		c.text('');
		this.reposition();
		
		this.complete = complete;
		this.sayWords(text, hold, complete);
	}
	
	show () {
		if (this.hidden) return;
		this.balloon.show();
	}
	
	hide (fast) {
		if (fast) {
			this.balloon.hide();
			return;
		}
		
		this.hiding = window.setTimeout(cjq.proxy(this.finishHideBalloon, this), this.CLOSE_BALLOON_DELAY);
	}
	
	finishHideBalloon () {
		if (this.active) return;
		this.balloon.hide();
		this.hidden = true;
		this.hiding = null;
	}
	
	sayWords (text, hold, complete) {
		this.active = true;
		this.hold = hold;
		let words = text.split(/[^\S-]/);
		let time = this.WORD_SPEAK_TIME;
		let el = this.content;
		let idx = 1;
		
		
		this.addWord = cjq.proxy(function () {
			if (!this.active) return;
			if (idx > words.length) {
				delete this.addWord;
				this.active = false;
				if (!this.hold) {
					complete();
					this.hide();
				}
			} else {
				el.text(words.slice(0, idx).join(' '));
				idx++;
				this.loop = window.setTimeout(cjq.proxy(this.addWord, this), time);
			}
		}, this);
		
		this.addWord();
		
	}
	
	close () {
		if (this.active) {
			this.hold = false;
		} else if (this.hold) {
			this.complete();
		}
	}
	
	pause () {
		window.clearTimeout(this.loop);
		if (this.hiding) {
			window.clearTimeout(this.hiding);
			this.hiding = null;
		}
	}
	
	resume () {
		if (this.addWord) {
			this.addWord();
		} else if (!this.hold && !this.hidden) {
			this.hiding = window.setTimeout(cjq.proxy(this.finishHideBalloon, this), this.CLOSE_BALLOON_DELAY);
		}
	}
}


