import jQuery from "jquery";
const cjq = jQuery.noConflict();

import Queue from './queue'
import Animator from './animator'
import Balloon from './balloon'

export default class Agent {
	constructor (path, data, sounds) {
		this.path = path;
		
		this.queue = new Queue(cjq.proxy(this.onQueueEmpty, this));
		
		this.jElement = cjq('<div class="clippy"></div>').hide();
		this.element = this.jElement[0];
		
		cjq(document.body).append(this.jElement);
		
		this.animator = new Animator(this.jElement, path, data, sounds);
		
		this.balloon = new Balloon(this.jElement);
		
		this.setupEvents();
	}
	
	/***
	*
	* @param {Number} x
	* @param {Number} y
	*/
	gestureAt (x, y) {
		let d = this.getDirection(x, y);
		let gAnim = 'Gesture' + d;
		let lookAnim = 'Look' + d;
		
		let animation = this.hasAnimation(gAnim) ? gAnim : lookAnim;
		return this.play(animation);
	}
	
	/***
	*
	* @param {Boolean=} fast
	*
	*/
	hide (fast, callback) {
		this.hidden = true;
		let el = this.jElement;
		this.stop();
		if (fast) {
			this.jElement.hide();
			this.stop();
			this.pause();
			if (callback) callback();
			return;
		}
		
		return this.playInternal('Hide', function () {
			el.hide();
			this.pause();
			if (callback) callback();
		})
	}
	
	
	moveTo (x, y, duration) {
		let dir = this.getDirection(x, y);
		let anim = 'Move' + dir;
		if (duration === undefined) duration = 1000;
		
		this.addToQueue(function (complete) {
			// the simple case
			if (duration === 0) {
				this.jElement.css({ top: y, left: x });
				this.reposition();
				complete();
				return;
			}
			
			// no animations
			if (!this.hasAnimation(anim)) {
				this.jElement.animate({ top: y, left: x }, duration, complete);
				return;
			}
			
			let callback = cjq.proxy(function (name, state) {
				// when exited, complete
				if (state === Animator.States.EXITED) {
					complete();
				}
				// if waiting,
				if (state === Animator.States.WAITING) {
					this.jElement.animate({ top: y, left: x }, duration, cjq.proxy(function () {
						// after we're done with the movement, do the exit animation
						this.animator.exitAnimation();
					}, this));
				}
				
			}, this);
			
			this.playInternal(anim, callback);
		}, this);
	}
	
	playInternal (animation, callback) {
		
		// if we're inside an idle animation,
		if (this.isIdleAnimation() && this.idleDfd && this.idleDfd.state() === 'pending') {
			this.idleDfd.done(cjq.proxy(function () {
				this.playInternal(animation, callback);
			}, this))
		}
		
		this.animator.showAnimation(animation, callback);
	}
	
	play (animation, timeout, cb) {
		if (!this.hasAnimation(animation)) return false;
		
		if (timeout === undefined) timeout = 5000;
		
		
		this.addToQueue(function (complete) {
			let completed = false;
			// handle callback
			let callback = function (name, state) {
				if (state === Animator.States.EXITED) {
					completed = true;
					if (cb) cb();
					complete();
				}
			};
			
			// if has timeout, register a timeout function
			if (timeout) {
				window.setTimeout(cjq.proxy(function () {
					if (completed) return;
					// exit after timeout
					this.animator.exitAnimation();
				}, this), timeout)
			}
			
			this.playInternal(animation, callback);
		}, this);
		
		return true;
	}
	
	/***
	*
	* @param {Boolean=} fast
	*/
	show (fast) {
		
		this.hidden = false;
		if (fast) {
			this.jElement.show();
			this.resume();
			this.onQueueEmpty();
			return;
		}
		
		if (this.jElement.css('top') === 'auto' || !this.jElement.css('left') === 'auto') {
			let left = cjq(window).width() * 0.8;
			let top = (cjq(window).height() + cjq(document).scrollTop()) * 0.8;
			this.jElement.css({ top: top, left: left });
		}
		
		this.resume();
		return this.play('Show');
	}
	
	/***
	*
	* @param {String} text
	*/
	speak (text, hold) {
		this.addToQueue(function (complete) {
			this.balloon.speak(complete, text, hold);
		}, this);
	}
	
	
	/***
	* Close the current balloon
	*/
	closeBalloon () {
		this.balloon.hide();
	}
	
	delay (time) {
		time = time || 250;
		
		this.addToQueue(function (complete) {
			this.onQueueEmpty();
			window.setTimeout(complete, time);
		});
	}
	
	/***
	* Skips the current animation
	*/
	stopCurrent () {
		this.animator.exitAnimation();
		this.balloon.close();
	}
	
	
	stop () {
		// clear the queue
		this.queue.clear();
		this.animator.exitAnimation();
		this.balloon.hide();
	}
	
	/***
	*
	* @param {String} name
	* @returns {Boolean}
	*/
	hasAnimation (name) {
		return this.animator.hasAnimation(name);
	}
	
	/***
	* Gets a list of animation names
	*
	* @return {Array.<string>}
	*/
	animations () {
		return this.animator.animations();
	}
	
	/***
	* Play a random animation
	* @return {jQuery.Deferred}
	*/
	animate () {
		let animations = this.animations();
		let anim = animations[Math.floor(Math.random() * animations.length)];
		// skip idle animations
		if (anim.indexOf('Idle') === 0) {
			return this.animate();
		}
		return this.play(anim);
	}
	
	/**************************** Utils ************************************/
	
	/***
	*
	* @param {Number} x
	* @param {Number} y
	* @return {String}
	*/
	getDirection (x, y) {
		let offset = this.jElement.offset();
		let h = this.jElement.height();
		let w = this.jElement.width();
		
		let centerX = (offset.left + w / 2);
		let centerY = (offset.top + h / 2);
		
		
		let a = centerY - y;
		let b = centerX - x;
		
		let r = Math.round((180 * Math.atan2(a, b)) / Math.PI);
		
		// Left and Right are for the character, not the screen :-/
		if (-45 <= r && r < 45) return 'Right';
		if (45 <= r && r < 135) return 'Up';
		if (135 <= r && r <= 180 || -180 <= r && r < -135) return 'Left';
		if (-135 <= r && r < -45) return 'Down';
		
		// sanity check
		return 'Top';
	}
	
	/**************************** Queue and Idle handling ************************************/
	
	/***
	* Handle empty queue.
	* We need to transition the animation to an idle state
	*/
	onQueueEmpty () {
		if (this.hidden || this.isIdleAnimation()) return;
		let idleAnim = this.getIdleAnimation();
		this.idleDfd = cjq.Deferred();
		
		this.animator.showAnimation(idleAnim, cjq.proxy(this.onIdleComplete, this));
	}
	
	onIdleComplete (name, state) {
		if (state === Animator.States.EXITED) {
			this.idleDfd.resolve();
		}
	}
	
	/***
	* Is the current animation is Idle?
	* @return {Boolean}
	*/
	isIdleAnimation () {
		let c = this.animator.currentAnimationName;
		return c && c.indexOf('Idle') === 0;
	}
	
	
	/**
	* Gets a random Idle animation
	* @return {String}
	*/
	getIdleAnimation () {
		let animations = this.animations();
		let r = [];
		for (let i = 0; i < animations.length; i++) {
			let a = animations[i];
			if (a.indexOf('Idle') === 0) {
				r.push(a);
			}
		}
		
		// pick one
		let idx = Math.floor(Math.random() * r.length);
		return r[idx];
	}
	
	/**************************** Events ************************************/
	
	setupEvents () {
		cjq(window).on('resize', cjq.proxy(this.reposition, this));
		
		this.jElement.on('mousedown', cjq.proxy(this.onMouseDown, this));
		
		this.jElement.on('dblclick', cjq.proxy(this.onDoubleClick, this));
	}
	
	onDoubleClick () {
		if (!this.play('ClickedOn')) {
			this.animate();
		}
	}
	
	reposition () {
		if (!this.jElement.is(':visible')) return;
		let o = this.jElement.offset();
		let bH = this.jElement.outerHeight();
		let bW = this.jElement.outerWidth();
		
		let wW = cjq(window).width();
		let wH = cjq(window).height();
		let sT = cjq(window).scrollTop();
		let sL = cjq(window).scrollLeft();
		
		let top = o.top - sT;
		let left = o.left - sL;
		let m = 5;
		if (top - m < 0) {
			top = m;
		} else if ((top + bH + m) > wH) {
			top = wH - bH - m;
		}
		
		if (left - m < 0) {
			left = m;
		} else if (left + bW + m > wW) {
			left = wW - bW - m;
		}
		
		this.jElement.css({ left: left, top: top });
		// reposition balloon
		this.balloon.reposition();
	}
	
	onMouseDown (e) {
		e.preventDefault();
		this.startDrag(e);
	}
	
	
	/**************************** Drag ************************************/
	
	startDrag (e) {
		// pause animations
		this.pause();
		this.balloon.hide(true);
		this.offset = this.calculateClickOffset(e);
		
		this.moveHandle = cjq.proxy(this.dragMove, this);
		this.upHandle = cjq.proxy(this.finishDrag, this);
		
		cjq(window).on('mousemove', this.moveHandle);
		cjq(window).on('mouseup', this.upHandle);
		
		this.dragUpdateLoop = window.setTimeout(cjq.proxy(this.updateLocation, this), 10);
	}
	
	calculateClickOffset (e) {
		let mouseX = e.pageX;
		let mouseY = e.pageY;
		let o = this.jElement.offset();
		return {
			top: mouseY - o.top,
			left: mouseX - o.left
		}
		
	}
	
	updateLocation () {
		this.jElement.css({ top: this.targetY, left: this.targetX });
		this.dragUpdateLoop = window.setTimeout(cjq.proxy(this.updateLocation, this), 10);
	}
	
	dragMove (e) {
		e.preventDefault();
		let x = e.clientX - this.offset.left;
		let y = e.clientY - this.offset.top;
		this.targetX = x;
		this.targetY = y;
	}
	
	finishDrag () {
		window.clearTimeout(this.dragUpdateLoop);
		// remove handles
		cjq(window).off('mousemove', this.moveHandle);
		cjq(window).off('mouseup', this.upHandle);
		// resume animations
		this.balloon.show();
		this.reposition();
		this.resume();
		
	}
	
	addToQueue (func, scope) {
		if (scope) func = cjq.proxy(func, scope);
		this.queue.enqueue(func);
	}
	
	/**************************** Pause and Resume ************************************/
	
	pause () {
		this.animator.pause();
		this.balloon.pause();
		
	}
	
	resume () {
		this.animator.resume();
		this.balloon.resume();
	}
	
}