import jQuery from "jquery";
const cjq = jQuery.noConflict();

import Agent from './agent'

export function load (name, successCb, failCb, base_path) {
	base_path = base_path || window.CLIPPY_CDN || 'https://gitcdn.xyz/repo/pi0/clippyjs/master/assets/agents/'
	
	let path = base_path + name;
	let mapDfd = load.map(path);
	let agentDfd = load.agent(name, path);
	let soundsDfd = load.sound(name, path);
	
	let data;
	agentDfd.done(function (d) {
		data = d;
	});
	
	let sounds;
	
	soundsDfd.done(function (d) {
		sounds = d;
	});
	
	// wrapper to the success callback
	let cb = function () {
		let a = new Agent(path, data, sounds);
		successCb(a);
	};
	
	cjq.when(mapDfd, agentDfd, soundsDfd).done(cb).fail(failCb);
}

load.map = function (path) {
	let dfd = load.maps[path];
	if (dfd) return dfd;
	
	// set dfd if not defined
	dfd = load.maps[path] = cjq.Deferred();
	
	let src = path + '/map.png';
	let img = new Image();
	
	img.onload = dfd.resolve;
	img.onerror = dfd.reject;
	
	// start loading the map;
	img.setAttribute('src', src);
	
	return dfd.promise();
}
	
load.sound = function (name, path) {
		let dfd = load.sounds[name];
		if (dfd) return dfd;
		
		// set dfd if not defined
		dfd = load.sounds[name] = cjq.Deferred();
		
		let audio = document.createElement('audio');
		let canPlayMp3 = !!audio.canPlayType && "" !== audio.canPlayType('audio/mpeg');
		let canPlayOgg = !!audio.canPlayType && "" !== audio.canPlayType('audio/ogg; codecs="vorbis"');
		
		if (!canPlayMp3 && !canPlayOgg) {
			dfd.resolve({});
		} else {
			let src = path + (canPlayMp3 ? '/sounds-mp3.js' : '/sounds-ogg.js');
			// load
			load.script(src);
		}
		
		return dfd.promise()
}
	
load.agent = function (name, path) {
		let dfd = load.data[name];
		if (dfd) return dfd;
		
		dfd = load.getAgentDfd(name);
		
		let src = path + '/agent.js';
		
		load.script(src);
		
		return dfd.promise();
	}
	
load.script = function (src) {
	let script = document.createElement('script');
	script.setAttribute('src', src);
	script.setAttribute('async', 'async');
	script.setAttribute('type', 'text/javascript');
	
	document.head.appendChild(script);
}
	
load.getAgentDfd = function (name) {
	let dfd = load.data[name];
	if (!dfd) {
		dfd = load.data[name] = cjq.Deferred();
	}
	return dfd;
}

load.maps = {};
load.sounds = {};
load.data = {};

export function ready (name, data) {
	let dfd = load.getAgentDfd(name);
	dfd.resolve(data);
}

export function soundsReady (name, data) {
	let dfd = load.sounds[name];
	if (!dfd) {
		dfd = load.sounds[name] = cjq.Deferred();
	}
	
	dfd.resolve(data);
}
