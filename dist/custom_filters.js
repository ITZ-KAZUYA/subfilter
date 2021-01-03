"use strict";

(function () {

	////////////////////////////////////////////
	// Define our own filters here
	//
	// Filter is a normal JavaScript function
	// that takes as argument one line string with original subtitle
	// and returns filtered result as another string.
	// You can define how many filters you want

	function customFilter1(s) {
		return s.replace(/(\w+)/, " CREATE YOUR OWN CUSTOM FILTER. SEE DOCUMENTATION. ");
	}

	/*
	function customFilter2(s) {
		return s; // This is empty filter, it changes nothing
	}

	function customFilter3(s) {
		return s.replace(/(\W\w+)/ig, " XXX ");
	}
	*/

	if (subfilter && subfilter.filters && subfilter.filters.register) {

		// Register you filter here
		// subfilter.filters.register(key, name, description, run)
		// "key" must be unique valid javascript identifier (use only alphabetic characters and numerals)

		subfilter.filters.register("custom1", "My Custom filter", "You can define your own filters.", customFilter1);

		//subfilter.filters.register("custom2", "My Custom filter 2", "You can define your own filters.", customFilter2);
		//subfilter.filters.register("custom3", "My Custom filter 3", "You can define your own filters.", customFilter3);
	}
	

})();
