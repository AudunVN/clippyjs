import jQuery from 'jquery'
const cjq = jQuery.noConflict();

export default class Animator {

    constructor (el, path, data, sounds) {
        this.jElement = el;
        this.data = data;
        this.path = path;
        this.currentFrameIndex = 0;
        this.currentFrame = undefined;
        this.exiting = false;
        this.currentAnimation = undefined;
        this.endCallback = undefined;
        this.started = false;
        this.sounds = {};
        this.currentAnimationName = undefined;
        this.preloadSounds(sounds);
        this.overlays = [this.jElement];
        let curr = this.jElement;

        this.setupElement(this.jElement);
        for (let i = 1; i < this.data.overlayCount; i++) {
            let inner = this.setupElement(cjq('<div></div>'));
            curr.append(inner);
            this.overlays.push(inner);
            curr = inner;
        }
    }

    setupElement (el) {
        let frameSize = this.data.framesize;
        el.css('display', "none");
        el.css({ width: frameSize[0], height: frameSize[1] });
        el.css('background', "url('" + this.path + "/map.png') no-repeat");

        return el;
    }

    animations () {
        let r = [];
        let d = this.data.animations;
        for (let n in d) {
            r.push(n);
        }
        return r;
    }

    preloadSounds (sounds) {

        for (let i = 0; i < this.data.sounds.length; i++) {
            let snd = this.data.sounds[i];
            let uri = sounds[snd];
            if (!uri) continue;
            this.sounds[snd] = new Audio(uri);

        }
    }

    hasAnimation (name) {
        return !!this.data.animations[name];
    }

    exitAnimation () {
        this.exiting = true;
    }

    showAnimation (animationName, stateChangeCallback) {
        this.exiting = false;

        if (!this.hasAnimation(animationName)) {
            return false;
        }

        this.currentAnimation = this.data.animations[animationName];
        this.currentAnimationName = animationName;


        if (!this.started) {
            this.step();
            this.started = true;
        }

        this.currentFrameIndex = 0;
        this.currentFrame = undefined;
        this.endCallback = stateChangeCallback;

        return true;
    }

    draw () {
        let images = [];
        if (this.currentFrame) images = this.currentFrame.images || [];

        for (let i = 0; i < this.overlays.length; i++) {
            if (i < images.length) {
                let xy = images[i];
                let bg = -xy[0] + 'px ' + -xy[1] + 'px';
                this.overlays[i].css({ 'background-position': bg, 'display': 'block' });
            }
            else {
                this.overlays[i].css('display', 'none');
            }

        }
    }

    getNextAnimationFrame () {
        if (!this.currentAnimation) return undefined;
        // No current frame. start animation.
        if (!this.currentFrame) return 0;
        let currentFrame = this.currentFrame;
        let branching = this.currentFrame.branching;


        if (this.exiting && currentFrame.exitBranch !== undefined) {
            return currentFrame.exitBranch;
        }
        else if (branching) {
            let rnd = Math.random() * 100;
            for (let i = 0; i < branching.branches.length; i++) {
                let branch = branching.branches[i];
                if (rnd <= branch.weight) {
                    return branch.frameIndex;
                }

                rnd -= branch.weight;
            }
        }

        return this.currentFrameIndex + 1;
    }


    playSound () {
        let s = this.currentFrame.sound;
        if (!s) return;
        let audio = this.sounds[s];
        if (audio) audio.play();
    }

    atLastFrame () {
        return this.currentFrameIndex >= this.currentAnimation.frames.length - 1;
    }


    step () {
        if (!this.currentAnimation) return;
        let newFrameIndex = Math.min(this.getNextAnimationFrame(), this.currentAnimation.frames.length - 1);
        let frameChanged = !this.currentFrame || this.currentFrameIndex !== newFrameIndex;
        this.currentFrameIndex = newFrameIndex;

        // always switch frame data, unless we're at the last frame of an animation with a useExitBranching flag.
        if (!(this.atLastFrame() && this.currentAnimation.useExitBranching)) {
            this.currentFrame = this.currentAnimation.frames[this.currentFrameIndex];
        }

        this.draw();
        this.playSound();

        this.loop = window.setTimeout(cjq.proxy(this.step, this), this.currentFrame.duration);


        // fire events if the frames changed and we reached an end
        if (this.endCallback && frameChanged && this.atLastFrame()) {
            if (this.currentAnimation.useExitBranching && !this.exiting) {
                this.endCallback(this.currentAnimationName, Animator.States.WAITING);
            }
            else {
                this.endCallback(this.currentAnimationName, Animator.States.EXITED);
            }
        }
    }

    /***
     * Pause animation execution
     */
    pause () {
        window.clearTimeout(this.loop);
    }

    /***
     * Resume animation
     */
    resume () {
        this.step();
    }
}


Animator.States = { WAITING: 1, EXITED: 0 };
