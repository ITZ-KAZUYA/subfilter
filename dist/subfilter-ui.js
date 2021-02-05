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

	let player;

	if (netflix && netflix.appContext && netflix.appContext.state && netflix.appContext.state.playerApp && netflix.appContext.state.playerApp.getAPI) {
		let netflixAPI = netflix.appContext.state.playerApp.getAPI();

		if (netflixAPI && netflixAPI.videoPlayer) {
			let videoPlayer = netflixAPI.videoPlayer;

			if (videoPlayer && videoPlayer.getAllPlayerSessionIds) {
				let sessionIds = videoPlayer.getAllPlayerSessionIds();

				if (sessionIds && sessionIds[0]) {
					let playerSessionId = sessionIds[0];

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
					// -1 is time just before cue appears to ensure that VideoPlayListenerForCleaning is called before subtitle raises cuechange event
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
	let subfilterAutoContinueDelay = 0;

	let subfilterPauseOnStart = false;
	let subfilterPauseOnEnd = false;
	let subfilterRevealAtEnd = false;
	let subfilterSkipToNextText = false;

	let subfilterLastNewTextTimeoutID = 0;
	let subfilterLastClearTimeoutID = 0;


	function VideoPlayListenerForCleaning(event) {
		//console.log("VideoPlayListenerForCleaning", event);

		let videoEl = document.querySelector("video");
		if (videoEl) { videoEl.removeEventListener("play", VideoPlayListenerForCleaning, false); } // deregister handler, should be called only once

		EmptySubtitleArea();
	}

	function EmptySubtitleArea() {
		// Clear subtitle area - remove all children
		while (customSubsElem && customSubsElem.firstChild) {
			customSubsElem.removeChild(customSubsElem.firstChild);
		}
	}

	// Clear subtitle and reset timeout handler ID
	function ClearCue() {
		EmptySubtitleArea();
		subfilterLastClearTimeoutID = 0;
	}

	function ChangeCue(customSubsElem, track, cuesToDisplay) {
		//console.log("OnCueChangeHandler", customSubsElem, track, cuesToDisplay);
		//console.log("cuesToDisplay", cuesToDisplay);

		EmptySubtitleArea();

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

	function SeekToNextCue(track, lastCues) {
		//console.log("SeekToNextCue");

		if (track && lastCues && lastCues[0] && lastCues[0].id) {

			let currentCueId = lastCues[0].id;
			currentCueId = Number(currentCueId); // cue is a number formated as string, convert to number and check if conversion succeeded

			if (currentCueId && track.cues) {
				let nextCue = track.cues[currentCueId];

				if (nextCue && nextCue.startTime && typeof(nextCue.startTime) === "number" && nextCue.startTime > 0) {

					let seekTo = nextCue.startTime;

					//console.log("SeekToNextCue", seekTo);

					let player = subfilter.ui.getNetflixPlayer();
					if (player) {
						player.seek(seekTo*1000);
					}
				}
			}
		}
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
			subfilterAutoContinueDelay = 0;
			subfilterPauseOnStart = false;
			subfilterPauseOnEnd = false;
			subfilterRevealAtEnd = false;
			subfilterSkipToNextText = false;
		}
		else if (subfilter.playingmodes.selected == "pausebefore") {
			subfilterStartDelay = 0;
			subfilterEndDelay = 0;
			subfilterAutoContinueDelay = 0;
			subfilterPauseOnStart = true;
			subfilterPauseOnEnd = false;
			subfilterRevealAtEnd = false;
			subfilterSkipToNextText = false;
		}
		else if (subfilter.playingmodes.selected == "pauseafterandreveal") {
			subfilterStartDelay = 0;
			subfilterEndDelay = 0;
			subfilterAutoContinueDelay = 0;
			subfilterPauseOnStart = false;
			subfilterPauseOnEnd = true;
			subfilterRevealAtEnd = true;
			subfilterSkipToNextText = false;
		}
		else if (subfilter.playingmodes.selected == "pauseafterrevealcontinue") {
			subfilterStartDelay = 0;
			subfilterEndDelay = 0;
			subfilterAutoContinueDelay = 1500;
			subfilterPauseOnStart = false;
			subfilterPauseOnEnd = true;
			subfilterRevealAtEnd = true;
			subfilterSkipToNextText = false;
		}
		else if (subfilter.playingmodes.selected == "onlydialogs") {
			subfilterStartDelay = 0;
			subfilterEndDelay = 0;
			subfilterAutoContinueDelay = 0;
			subfilterPauseOnStart = false;
			subfilterPauseOnEnd = false;
			subfilterRevealAtEnd = false;
			subfilterSkipToNextText = true;
		}
		else {
			console.error("Error. Unknown playing mode.", subfilter.playingmodes.selected);
		}

		// New cue to show
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

			if (subfilterPauseOnStart) {
				let player = subfilter.ui.getNetflixPlayer();
				if (player) {
					player.pause();
				}
			}
		}
		// Old cue to hide
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

			// Should we pause video?
			if (subfilterPauseOnEnd) {

				// Check if there is some hidden fragment in the current subtitle,
				// pause video only if there is any
				let hiddenFragments = document.querySelectorAll(".subfilter-hide");
				if (hiddenFragments && hiddenFragments.length > 0) {

					let player = subfilter.ui.getNetflixPlayer();
					if (player) {
						player.pause();

						// need to hide cue when video start playing again, because we do not hide it now
						let videoEl = document.querySelector("video");
						if (videoEl) { videoEl.addEventListener("play", VideoPlayListenerForCleaning, false); }

						// Should video continue automatically after some detal?
						if (subfilterAutoContinueDelay > 0) {
							setTimeout(function() {
								player.play();
							}, subfilterAutoContinueDelay);
						}
					}
					return;
				}
			}

			// Should we seek to the next subtitle?
			if (subfilterSkipToNextText) {

				// Check what actual position is, and if corresponds to the position of last cue.
				// Make SeekToNextCue only if it corresponds.
				// Otherwise, user probably seeked video manually to different position and we should not seek now
				// (because we will return to the last subtitle before user's seeking)
				let lastCues = subfilter.ui.lastCues;
				if (lastCues && lastCues[0] && lastCues[0].endTime) {
					let lastCueEndTime = lastCues[0].endTime;

					let player = subfilter.ui.getNetflixPlayer();
					if (player) {
						let currentTime = player.getCurrentTime();
						let timeDifferenceInMs = Math.abs(lastCueEndTime*1000 - currentTime);
						//console.log("Time difference", timeDifferenceInMs);

						// if current time differs more than 2 seconds from last subtitle time, user was probably seeking
						// in that case continue playing normally
						if (timeDifferenceInMs < 2000) {
							ClearCue();
							SeekToNextCue(track, subfilter.ui.lastCues);
							return;
						}
					}
				}
			}

			// Calling to clear Cue now or delayed
			subfilterLastClearTimeoutID = setTimeout(ClearCue, subfilterEndDelay);
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
		"normal": { name: "Normal playing mode", description: " Play without interruption for comfortable watching." },
		"pausebefore": { name: "Pause (before)", description: " Before every subtitle is video paused.\n Press 'Space' to continue watching." },
		"pauseafterandreveal": { name: "Pause and reveal (after)", description: " After every subtitle is video paused and hidden text is revealed.\n Press 'B' to repeat last subtitle.\n Press 'Space' to continue watching." },
		"pauseafterrevealcontinue": { name: "Pause, reveal, continue", description: " Before every subtitle is video paused, hidden text is revealed and video continue automatically.\n Press 'B' to repeat last subtitle." },
		"onlydialogs": { name: "Dialogs only", description: " Watch only dialogs, skip else.\n Press 'B' to repeat last subtitle." },
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
