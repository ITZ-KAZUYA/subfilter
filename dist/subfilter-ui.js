"use strict";

document.addEventListener("keydown", function(event) {
	let keyName = event.key;
	let keyCode = event.code;

	//console.log("KEYDOWN", event.key, event.keyCode, event.code);

	// Pressing Ctrl key => show deleted words
	if (keyName === "Control") {
		subfilter.ui.setRevealHiddenOn();
	}
	// Pressing R key without modifiers => remember current cue for study review
	else if (keyCode === "KeyR" && !event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey) {
		subfilter.review.saveCurrentItem();
	}
	// Pressing B will rewind movie back to begining of the last subtitle
	else if (keyCode === "KeyB" && !event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey) {
		subfilter.ui.repeatLastSubtitle();
	}

}, false);


document.addEventListener("keyup", function(event) {
	let keyName = event.key;

	//console.log("KEYUP", event.key, event.keyCode, event.code);

	// Releasing Ctrl key => restore normal state
	if (keyName === "Control") {
		subfilter.ui.setRevealHiddenOff();
	}
}, false);


// It is important to clear caching modifiers state when window lost its focus
// Otherwise Ctrl+Tab and switching to another tab will switch on Ctrl state foreever (until next Ctrl keydown/keyup)
window.addEventListener("blur", function(event) {
	subfilter.ui.setRevealHiddenOff();
}, false);


subfilter.ui = {};

subfilter.ui.setRevealHiddenOn = function() {
	let element = document.getElementById("subadub-custom-subs");

	if (element) {
		element.classList.add("subfilter-force-show");
	}
}

subfilter.ui.setRevealHiddenOff = function() {
	let element = document.getElementById("subadub-custom-subs");

	if (element) {
		element.classList.remove("subfilter-force-show");
	}
}

subfilter.ui.getNetflixPlayer = function() {
	/* Thanks to https://stackoverflow.com/questions/42105028/netflix-video-player-in-chrome-how-to-seek/46816934#46816934
		const videoPlayer = netflix
		  .appContext
		  .state
		  .playerApp
		  .getAPI()
		  .videoPlayer

		// Getting player id
		const playerSessionId = videoPlayer
		  .getAllPlayerSessionIds()[0]

		const player = videoPlayer
		  .getVideoPlayerBySessionId(playerSessionId)
	*/


	let videoPlayer;
	let playerSessionId;
	let player;

	if (netflix && netflix.appContext && netflix.appContext.state && netflix.appContext.state.playerApp && netflix.appContext.state.playerApp.getAPI) {
		let netflixAPI = netflix.appContext.state.playerApp.getAPI();

		if (netflixAPI && netflixAPI.videoPlayer) {
			videoPlayer = netflixAPI.videoPlayer;

			if (videoPlayer && videoPlayer.getAllPlayerSessionIds) {
				let sessionIds = videoPlayer.getAllPlayerSessionIds();

				if (sessionIds && sessionIds[0]) {
					playerSessionId = sessionIds[0];

					if (playerSessionId && videoPlayer.getVideoPlayerBySessionId) {

						player = videoPlayer.getVideoPlayerBySessionId(playerSessionId);
					}
				}
			}
		}
	}

	return player;
}

subfilter.ui.lastCues = [];

subfilter.ui.repeatLastSubtitle = function() {
	if (subfilter.ui.lastCues && subfilter.ui.lastCues.length && subfilter.ui.lastCues.length > 0 )	{

		let lastCue = subfilter.ui.lastCues[0];

		if (lastCue) {
			let startTime = lastCue.startTime;

			if (startTime && typeof(startTime) === "number" && startTime > 0) {
				let player = subfilter.ui.getNetflixPlayer();

				if (player) {
					// subtitle time is in seconds, Netflix uses miliseconds;
					// -1 is time just before cue appears to ensure that videoPlayListenerForCleaning is called before subtitle raises cuechange event
					player.seek(startTime*1000-1);
					player.play();
				}
			}

		}

	}
}

subfilter.ui.makeCueChangeListener = function (trackElem, customSubsElem, vttTextToSimple) {

	let subfilterStartDelay = 0; // delay in miliseconds
	let subfilterEndDelay = 0;   // delay in miliseconds
	let subfilterPauseOnEnd = false;
	let subfilterRevealAtEnd = false;

	let subfilterLastNewTextTimeoutID = 0;
	let subfilterLastClearTimeoutID = 0;


	function videoPlayListenerForCleaning(event) {
		//console.log("videoPlayListenerForCleaning", event);

		let videoEl = document.querySelector("video");
		if (videoEl) { videoEl.removeEventListener("play", videoPlayListenerForCleaning, false); }

		// Remove all children
		while (customSubsElem && customSubsElem.firstChild) {
			customSubsElem.removeChild(customSubsElem.firstChild);
		}
	}

	function ChangeCue(customSubsElem, track, cuesToDisplay) {
		//console.log("OnCueChangeHandler", customSubsElem, track, cuesToDisplay);
		//console.log("cuesToDisplay", cuesToDisplay);

		// Remove all children
		while (customSubsElem.firstChild) {
			customSubsElem.removeChild(customSubsElem.firstChild);
		}

		// console.log('active now', track.activeCues);
		for (const cue of cuesToDisplay) {
			const cueElem = document.createElement("div");
			cueElem.style.cssText = "background: rgba(0,0,0,0.8); white-space: pre-wrap; padding: 0.2em 0.3em; margin: 10px auto; width: fit-content; width: -moz-fit-content; pointer-events: auto";

			let simpleText = vttTextToSimple(cue.text, true); // may contain simple tags like <i> etc.

			// make some parts of subtitles invisible
			if (subfilter && subfilter.filterMultiLine) {
				simpleText = subfilter.filterMultiLine(simpleText, cue)
			}

			cueElem.innerHTML = simpleText;
			customSubsElem.appendChild(cueElem);
		}

		subfilterLastNewTextTimeoutID = 0;
	}

	function ClearCue(customSubsElem) {

		// Remove all children
		while (customSubsElem.firstChild) {
			customSubsElem.removeChild(customSubsElem.firstChild);
		}

		subfilterLastClearTimeoutID = 0;
	}

	trackElem.addEventListener("cuechange", function(event) {
		//console.log(event);

		const track = event.target.track;

		let cuesToDisplay = [];

		for (const cue of track.activeCues) {
			cuesToDisplay.push(cue);
		}

		// Handle playing modes
		if (subfilter.playingmodes.selected == "normal") {
			subfilterStartDelay = 0;
			subfilterEndDelay = 0;
			subfilterPauseOnEnd = false;
			subfilterRevealAtEnd = false;
		}
		else if (subfilter.playingmodes.selected == "stopafterandreveal") {
			subfilterStartDelay = 0;
			subfilterEndDelay = 0;
			subfilterPauseOnEnd = true;
			subfilterRevealAtEnd = true;
		}
		else {
			console.error("Error. Unknown playing mode.", subfilter.playingmodes.selected);
		}

		// Showing new cue
		if (cuesToDisplay.length > 0) {

			if (subfilterLastNewTextTimeoutID) {
				console.log("Error. Creating another New Text TimetOut when there is still older one.");
			}

			if (subfilterLastClearTimeoutID) {
				console.log("Error. Creating another New Text TimetOut, but there is Clear Text timeout NOTFINISHED. Canceling timeout call.");
				clearTimeout(subfilterLastClearTimeoutID);
				subfilterLastClearTimeoutID = 0;
			}

			// there might be revealed-flag set on from last time, remove it
			let element = document.getElementById("subadub-custom-subs");
			if (element) {
				element.classList.remove("subfilter-temporarily-show");
			}

			subfilter.ui.lastCues = [...cuesToDisplay];

			// Calling display Cue now or delayed
			subfilterLastNewTextTimeoutID = setTimeout(ChangeCue, subfilterStartDelay, customSubsElem, event.target.track, cuesToDisplay);

		}
		// Hiding old cue
		else {
			if (subfilterRevealAtEnd) {

				let element = document.getElementById("subadub-custom-subs");
				if (element) {
					element.classList.add("subfilter-temporarily-show");
				}
			}

			if (subfilterLastClearTimeoutID) {
				console.log("Error. Creating another Clear Text TimetOut when there is still older one.");
			}

			if (subfilterPauseOnEnd) {
				let player = subfilter.ui.getNetflixPlayer();
				if (player) {
					player.pause();

					let videoEl = document.querySelector("video");
					if (videoEl) { videoEl.addEventListener("play", videoPlayListenerForCleaning, false); } // need to hide cue when video start playing again
				}
				return;
			}

			// Calling display Cue now or delayed
			subfilterLastClearTimeoutID = setTimeout(ClearCue, subfilterEndDelay, customSubsElem);
		}

	}, false);

}


subfilter.playingmodes = {};

// Create select element and insert it inside "parent" element
// "option" is object with attributes of "select" element  e.g. {"id": "filters", "class": "form-select mb-3" }
subfilter.playingmodes.createModeSelector = function(parent, options) {

	const selectElem = document.createElement("select");
	selectElem.title = "Select playing mode";

	if (options) {
		for (const item in options) {
			selectElem.setAttribute(item, options[item]);
		}
	}

	let modes = {
		"normal": { name: "Normal playing mode", description: "Play without interruption for comfortable watching." },
		"stopafterandreveal": { name: "Stop and reveal", description: "After every subtitle is video stoped and hidden text is revealed." }
	};

	let defaultMode = "normal";

	for (const mode in modes) {
		let optElem = document.createElement("option");
		optElem.textContent = modes[mode].name;
		optElem.title = modes[mode].name + " : \n" + modes[mode].description;
		optElem.value = mode;
		selectElem.appendChild(optElem);
	}

	selectElem.value = defaultMode;
	// TODO make last selected mode persist between sessions and handle if the saved value is incorrect or deleted

	subfilter.playingmodes.selected = defaultMode;

	selectElem.addEventListener("change", function(e) {
		subfilter.playingmodes.selected = e.target.value;

		//localStorage.setItem(subfilter.storageLastFilterKey, e.target.value);
	}, false);

	parent.appendChild(selectElem);
}
