"use strict";


document.addEventListener("keydown", function(event) {
	let keyName = event.key;
	let keyCode = event.code;

	//console.log("KEYDOWN", event.key, event.keyCode, event.code);

	// Pressing Ctrl key => show deleted words
	if (keyName === "Control") {
		let element = document.getElementById("subadub-custom-subs");

		if (element) {
			element.classList.add("subfilter-force-show");
		}
	}
	// Pressing R key without modifiers => remember current cue for study review
	else if (keyCode === "KeyR" && !event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey) {
		subfilter.review.saveCurrentItem();
	}

}, false);



document.addEventListener("keyup", function(event) {
	let keyName = event.key;

	// Releasing Ctrl key => restore normal state
	if (keyName === "Control") {
		let element = document.getElementById("subadub-custom-subs");

		if (element) {
			element.classList.remove("subfilter-force-show");
		}
	}
}, false);
