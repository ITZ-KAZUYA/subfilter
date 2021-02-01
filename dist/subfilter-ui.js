"use strict";

/* Pressing Ctrl key => show deleted words */
document.addEventListener("keydown", function(event) {
	let keyName = event.key;

	if (keyName === "Control") {
		let element = document.getElementById("subadub-custom-subs");

		if (element) {
			element.classList.add("subfilter-force-show");
		}
	}
}, false);


/* Releasing Ctrl key => restore normal state */
document.addEventListener("keyup", function(event) {
	let keyName = event.key;

	if (keyName === "Control") {
		let element = document.getElementById("subadub-custom-subs");

		if (element) {
			element.classList.remove("subfilter-force-show");
		}
	}
}, false);
