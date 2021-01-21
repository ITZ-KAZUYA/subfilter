"use strict";

const subfilter = {};

subfilter.storageLastFilterKey = "subfilter-filtername";

// Create select element for filter selection
// and insert it inside "parent" element
// "option" is object with attributes of "select" element  e.g. {"id": "filters", "class": "form-select mb-3" }
// optional "includeHiddenFilters" = false | true
subfilter.createFilterSelector = function (parent, options, includeHiddenFilters) {

	if (includeHiddenFilters == undefined)
		includeHiddenFilters = false;

	const selectElem = document.createElement("select");
	selectElem.title = "Select filter";

	if (options) {
		for (const item in options) {
			selectElem.setAttribute(item, options[item]);
			//console.log({ item: item, value: options[item] });
		}
	}

	const list = subfilter.filters.list();
	for (const method in list) {

		// do not show hidden filters unless includeHiddenFilters == true
		if ("hide" in list[method] && list[method].hide == true && includeHiddenFilters == false) {
			continue;
		}

		let optElem = document.createElement("option");
		optElem.textContent = list[method].name;
		optElem.title = list[method].name + " : \n" + list[method].description;
		optElem.value = method;
		selectElem.appendChild(optElem);
	}

	// Set current filter to the last filter that we remember 
	let lastFilterName = localStorage.getItem(subfilter.storageLastFilterKey);

	if (lastFilterName) {
		try {
			subfilter.filters.select(lastFilterName);
			selectElem.value = lastFilterName;			
		}
		catch (error) {
			let defaultFilterName = subfilter.filters.selectDefaultFilter();
			selectElem.value = defaultFilterName;
			console.info("lastFilterName contains wrong value, switching to default", lastFilterName);
		}

	}

	selectElem.addEventListener("change", function(e) {
		subfilter.filters.select(e.target.value);

		localStorage.setItem(subfilter.storageLastFilterKey, e.target.value);
	}, false);

	parent.appendChild(selectElem);
}

// s contains multiline vtt cue text
// process each line individually
subfilter.filterMultiLine = function(s) {
    const lines = s.split('\n');
    const newLines = [];
    for (const line of lines) {
      let transformed = subfilter.filters.run(line);
      transformed = subfilter.filters.render(transformed);
      // console.log({li: line, lo: transformed});
      newLines.push(transformed);
    }

    return newLines.join('\n');	
}

// s contains multiline vtt cue text
// process each line individually
// For use in plain text output
subfilter.filterMultiLinePlainAscii = function(s) {
    const lines = s.split('\n');
    const newLines = [];
    for (const line of lines) {
      let transformed = subfilter.filters.run(line);
      transformed = subfilter.filters.renderIntoPlainAscii(transformed);
      // console.log({li: line, lo: transformed});
      newLines.push(transformed);
    }

    return newLines.join('\n');
}

//////////////////////////////////////////////////////
// Manager for selecting/runing filters
//
subfilter.filters = function() {

		const defaultFilter = "nofilter";
		let currentFilter = defaultFilter;

		let listing = {
					"nofilter":    { name: "No filter",                   description: "Switch off filters.", run: nofilter },
					"generalLatinEasy": { name: "General filter - EASY", description: "General filter for languages with latin alphabet. Use it if there is not any more specified filter.", run: generalLatinEasy },
					"generalLatin": { name: "General filter - NORMAL (recommended)", description: "General filter for languages with latin alphabet. Use it if there is not any more specified filter.", run: generalLatinNormal },
					"generalLatinHard": { name: "General filter - HARD", description: "General filter for languages with latin alphabet. Use it if there is not any more specified filter.", run: generalLatinHard },
					"generalHardcore" : { name: "General HARDCORE filter - hard and deadly", description: "If other filters are too easy for you, try this one. How many minutes can you survive?", run: generalHardcore },
					"chinesejapanese" : { name: "Chinese/Japanese experimental filter", description: "", run: chinesejapanese },
					"easyEnglish": { name: "English friendly",            description: "Optimized for English, understand basic English stop words.", run: easyEnglish, hide: true },
					"easySpanish": { name: "Spanish friendly",            description: "Optimized for Spanish, understand basic Spanish stop words.", run: easySpanish, hide: true },
				};

		// run currently selected filter
		function run(s) {
			return listing[currentFilter].run(s);
		}

		// run filter with given name
		function runByName(name, s) {
			if (name in listing) {
				return listing[name].run(s)				
			}
			console.error({name, s});
			throw "Error. Unknow filter name.";
		}

		function selectDefaultFilter() {
			return select(defaultFilter);
		}

		function select(name) {
			if (name in listing) {
				currentFilter = name;
			}
			else {
				console.error("Error. Unknow filter name.", {name});
				throw "Error. Unknow filter name.";
			}
			return name;
		}

		// get list of avalilable filters
		function list() {
			return listing;
		}

		// register custom filter
		function register(key, name, description, run) {
			if (key && typeof key === "string" && name && typeof name === "string" && description && typeof description === "string" && run && typeof run == "function") {
				// console.log("New filter registered", {key, name, description, run})				
				listing[key] = {name: name, description: description, run: run};				
			}
			else {
				console.error({key, name, description, run});
				throw "Error. Not able to register new filter"
			}

		}

		// Render for HTML output.
		// Exchange <del> mark-word </del> for double span actually hiding mark words
		// TODO do not use "style" attribute, use "class" and make style changeable in settings
		function render(s) {
			let s1 = s.replace(/<del>/g, "<span style=\"border-bottom:solid 2px gray;\"><span style=\"visibility:hidden\">");
			let s2 = s1.replace(/<\/del>/g, "</span></span>");

			return s2;
		}

		// Render for Plain ASCII output
		// All missing characters exchange by underscores
		function renderIntoPlainAscii(s) {
			// Delete <del> tags and replace every character inside these tags by underscore
			// <del>abc</del> => ___
			let s1 = s.replace(/<del>([^<]*)<\/del>/g,
					function(m,p,o,s) {
						//console.log({m,p,o,s});
						return p.replace(/./g, "_");
					}
			 );

			return s1;
		}

		// Some filters can use difficulty settings

		let filterDifficulty = 2; // 3 = hard, 2 = normal, 1.5 = easy

		function setFilterDifficulty(value) {
			if (value == undefined) {             // no value = reset difficulty to normal
				filterDifficulty = 2; // 2 = normal difficulty
			}
			else {
				filterDifficulty = value;
			}
		}

		//////////////////////////////////////////////////
		// Sets with special characters
		// used by filters

		const specialChars = {
			// Special chars that are often at the beginning of subtitle string
			startingChars: ["-", "♪", " ", "'", ",", ".", "\"", "("],

			// Common non-letter characters, like punctuation
			// Do not include apostrophe, because this looks disturbing _'_ _ and apostrophe is often in English subtitles
			// "dash" must be in the first array field, to correctly form the RegExp bracket expression otherwise will be confused with a range operator
			generalChars: ["-", "♪", "(", ")", ",", "\"", "“", "”", ":", ";", ".", "?", "!", "¡", "¿", "…‬"],

			// FullWidthCharacters commonly used in some Asian environment (eg. Chinese)
			// May look similar like characters used in Europe, but are different
			// eg. ! and ！ are different characters, "Exclamation Mark" and "Fullwidth Exclamation Mark"
			// Use http://www.mauvecloud.net/charsets/CharCodeFinder.html to quickly check UTF16 characters codes
			// If necesary, they can be normalized by Compatibility Decomposition with string.normalize("NFKC") or strong.normalize("NFKD")
			// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize

			fullWidthChars: [
				"（",	// Fullwidth Left Parenthesis
				"）",	// Fullwidth Right Parenthesis
				"！",	// Fullwidth Exclamation Mark
				"？",	// Fullwidth Question Mark https://www.compart.com/en/unicode/U+FF1F
				"：",	// Fullwidth Colon
				"，",	// Fullwidth Comma
			],

			// Another Asian special characters that do not belong to the other groups
			otherAsianChars: [
				"、",	// 、  = Ideographic Comma https://www.yourdictionary.com/ideographic-comma				
			],


			arabicChars: [
				"\u061f",	// Arabic Question Mark https://www.compart.com/en/unicode/U+061F
				"\u060c",	// Arabic Comma
			],

			// White space characters for bidirectional text, see https://en.wikipedia.org/wiki/Bidirectional_text and https://www.unicode.org/reports/tr9/
			bidiChars: [
			"\u202a",	// Left-to-Right embedding https://www.compart.com/en/unicode/U+202A
			"\u202b",	// Right-to-Left embedding https://www.compart.com/en/unicode/U+202B
			"\u202c",	// PDF = Pop Directional Formatting https://www.compart.com/en/unicode/U+202C
			"\u202d",	// Left-to-Right override
			"\u202e",	// Right-to-Left override
			],
		};


		/////////////////////////////////////////////
		// All filters are defined here:
		//


		// nofilter is filter too, but change nothing
		function nofilter(s) {
			return s;
		}

		// recursive filter function, using Englist stop words
		function easyEnglish(s) {
			let transformed;

			if (!s) { return s; } // sometimes s is empty string

			// these are characters often found at subtitle beginning, we keep them unchanged and transform rest of the string
			let startingCharacters = ["-", "♪", " ", "'", ",", ".", "\"", "("];

			if (startingCharacters.includes(s.charAt(0))) {
				transformed = s.charAt(0) + easyEnglish(s.substring(1));
			}
			// sometimes subtitles contains html markup, usualy <b>, <i>, <u> and </b>, </i>, </u>. we keep text inside <> without change and transform the rest
			// there can be more tags in one text, and not necesary in pairs	
			else if (s.match(/<[^>]+>/)) { // looking for < anything in angle brackets >
			
				// we need to find all <tags>, for which we use global string.replace with callback function
				transformed = s.replace(/([^<>]*)(<[^<>]+>)([^<>]*)/g,
					function(m,p1,p2,p3,o,s,g) { // m contains one whole match, p1 text before <angle bracket>, p2 text inside <angle bracket> including brackets, p3 text after <angle bracket>
						//console.log({m:m,p1:p1,p2:p2,p3:p3,o:o,s:s,g:g});
						return easyEnglish(p1) + p2 + easyEnglish(p3);
					}
				);
			}
			// sometimes subtitles contains text in square backets like [this], we keep the text inside brackets without change and transform the rest
			else if (s.match(/\[[^\]]+\]/)) { // looking for [ anything in square brackets ]
				let results = s.match(/(.*)(\[[^\]]+\])(.*)/); // results[1] contains text before [backets], results[2] containts text inside [backets] including brackets, results[3] text after [backets]
				transformed = easyEnglish(results[1]) + results[2] + easyEnglish(results[3]);
			}
			// if the first word is stop word in english, keep the stop-words, but only if the next string is long enough (this prevents long sentences only from stop words)
			// TODO - detect language code and automatically choose here proper stopwords set
			else if (s.match(/^\w+/) && subfilter.stopWords.English.includes(s.match(/^\w+/)[0].toLowerCase()) ) { // select first word and check stop list
				let firstWord = s.match(/^\w+/)[0];
				//console.log("STOP WORDS", firstWord);

				let magicalConstantCharsAfterStopWord = 15;

				if (s.substring(firstWord.length).length > magicalConstantCharsAfterStopWord) {
					transformed = firstWord + easyEnglish(s.substring(firstWord.length));
				}
				else
				{	// the next string is not long enough, continue like no stopword was detected here
					transformed = s.replace(/(\W\w+)/ig, " _ ");
				}
			}
			else
			{
				// Finally we reach end, there are no more special characters, we can transform the text
				// remove every word, but not first word, keep other non word characters

				//console.log({s:s, r:s.replace(/(\W\w+)/ig, " _ ")});		
				transformed = s.replace(/(\W\w+)/ig, " _ ");
			}

			return transformed;
		}

		// recursive filter function, using Spanish stop words
		function easySpanish(s) {
			let transformed;

			if (!s) { return s; } // sometimes s is empty string

			// these are characters often found at subtitle beginning, we keep them unchanged and transform rest of the string
			let startingCharacters = ["-", "♪", " ", "'", ",", ".", "\"", "(", "¡", "¿"];

			if (startingCharacters.includes(s.charAt(0))) {
				transformed = s.charAt(0) + easySpanish(s.substring(1));
			}
			// sometimes subtitles contains html markup, usualy <b>, <i>, <u> and </b>, </i>, </u>. we keep text inside <> without change and transform the rest
			// there can be more tags in one text, and not necesary in pairs	
			else if (s.match(/<[^>]+>/)) { // looking for < anything in angle brackets >
			
				// we need to find all <tags>, for that we use global string.replace with callback function
				transformed = s.replace(/([^<>]*)(<[^<>]+>)([^<>]*)/g,
					function(m,p1,p2,p3,o,s,g) { // m contains one whole match, p1 text before <angle bracket>, p2 text inside <angle bracket> including brackets, p3 text after <angle bracket>
						//console.log({m:m,p1:p1,p2:p2,p3:p3,o:o,s:s,g:g});
						return easySpanish(p1) + p2 + easySpanish(p3);
					}
				);
			}
			// sometimes subtitles contains text in square backets like [this], we keep the text inside brackets without change and transform the rest
			else if (s.match(/\[[^\]]+\]/)) { // looking for [ anything in square brackets ]
				let results = s.match(/(.*)(\[[^\]]+\])(.*)/); // results[1] contains text before [backets], results[2] containts text inside [backets] including brackets, results[3] text after [backets]
				transformed = easySpanish(results[1]) + results[2] + easySpanish(results[3]);
			}
			// if the first word is stop word in english, keep the stop-words, but only if the next string is long enough (this prevents long sentences only from stop words)
			// TODO - detect language code and automatically choose here proper stopwords set
			else if (s.match(/^\w+/) && subfilter.stopWords.Spanish.includes(s.match(/^\w+/)[0].toLowerCase()) ) { // select first word and check stop list
				let firstWord = s.match(/^\w+/)[0];
				//console.log("STOP WORDS", firstWord);

				let magicalConstantCharsAfterStopWord = 15;

				if (s.substring(firstWord.length).length > magicalConstantCharsAfterStopWord) {
					transformed = firstWord + easySpanish(s.substring(firstWord.length));
				}
				else
				{	// the next string is not long enough, continue like no stopword was detected here
					transformed = s.replace(/(\s\S+)/ig, " _ ");
				}
			}
			else
			{
				// Finally we reach end, there are no more special characters, we can transform the text
				// remove every word, but not first word, keep other non word characters

				transformed = s.replace(/(\s\S+)/ig, " _ ");
			}

			return transformed;
		}

		// general filter for languages with latin alphabet that we do not handle more specifically
		function generalLatin(s) {
			let transformed;

			if (!s) { return s; } // sometimes s is empty string

			// Handle some special characters at the beginning
			// these are characters often found at subtitle beginning, we keep them unchanged and transform rest of the string
			let startingCharacters = [...specialChars.startingChars];

			if (startingCharacters.includes(s.charAt(0))) {
				transformed = s.charAt(0) + generalLatin(s.substring(1));
			}

			// Handle subtitle markup
			// Sometimes subtitles contains html markup, usualy <b>, <i>, <u> and </b>, </i>, </u>.
			// Keep text inside <> without change and transform the rest
			// Note: there can be more tags in one text, and might not necesary be in pairs
			else if (s.match(/<[^>]+>/)) { // looking for < anything in angle brackets >
			
				// we need to find all <tags>, for which we use global string.replace with callback function
				transformed = s.replace(/([^<>]*)(<[^<>]+>)([^<>]*)/g,
					function(m,p1,p2,p3,o,s,g) { // m contains one whole match, p1 text before <angle bracket>, p2 text inside <angle bracket> including brackets, p3 text after <angle bracket>
						//console.log({m:m,p1:p1,p2:p2,p3:p3,o:o,s:s,g:g});
						return generalLatin(p1) + p2 + generalLatin(p3);
					}
				);
			}

			// Handle [text in brackets]
			// It this usually comment, that is not part of speach
			// Keep all text inside brackets without change and transform the rest

			else if (s.match(/\[[^\]]+\]/)) { // looking for [ anything in square brackets ]
				let results = s.match(/(.*)(\[[^\]]+\])(.*)/); // results[1] contains text before [backets], results[2] containts text inside [backets] including brackets, results[3] text after [backets]
				transformed = generalLatin(results[1]) + results[2] + generalLatin(results[3]);
			}
			else
			{
				// Finally here, decide which words to hide
				// Split text into fragments between spaces (usually words, but also numbers, punctuations etc.) and check every fragment
				// \s is can be any type of space character including tabulator. But most usually it is space. At least in subtitles.
				let fragments = s.split(/\s/);
				//console.log(fragments.length);

				// Coeficient, who large part of the text to hide
				let coef = filterDifficulty; // 3 = hard, 2 = normal, 1.5 = easy
				let nFragmentsToKeep;
				let cycleStartWithFragmentNo; // index, with which fragment start for cycle 1st iteration

				if (coef == 0) {  // HARDCORE difficulty: filterDifficulty == 0, coef == 0, nFragmentsToKeep == 0
					nFragmentsToKeep = 0;
					transformed = "";
					cycleStartWithFragmentNo = 0; // In HARDCORE we start hiding with the 1st word
				}
				else {
					nFragmentsToKeep =  Math.round(fragments.length / coef);
					transformed = fragments[0]; // start 1st fragment
					cycleStartWithFragmentNo = 1; // In filters other then hardcore we starting hiding from the 2nd word, just make sure at least 1st word stay
				}

				for (let i = cycleStartWithFragmentNo; i < fragments.length; i++) {
					//console.log( fragments[i] );

					// Keep words/fragments in the 1st subtitle part
					if (i < nFragmentsToKeep) {
						transformed = transformed + " " + fragments[i];
					}
					// Delete words/fragments in the 2nd part
					else {
						// But check for common non-letter characters, like punctuation, we do not want to hide them
						let specialCharacters = [...specialChars.generalChars, ...specialChars.arabicChars];
						
						let re = new RegExp("[" + specialCharacters.join("") + "]");           // create matching regexp for detecting special chars like: /[-♪()]/
						let re2 = new RegExp("([^" + specialCharacters.join("") + "]+)", "g"); // create negative global regexp for replacing non-special chars like: /([^-♪()]+)/g

						//console.log({re, re2});

						if (fragments[i].match(re)) { // found special character
							let replaced = fragments[i].replace(re2, "<del>$1</del>"); // keep special characters, others must be put inside <del> tags
							// Replace abc,def => <del>abc</del>,<del>def</del>
							if (transformed == undefined || transformed == "") {
								transformed = replaced
							}
							else {
								transformed = transformed + " " + replaced;
							}
						}
						// no special characters, just wrap fragment inside <del> tags
						else {
							if (fragments[i] === "") { // Without this check will string terminating on space like "I read " genereate an additional " _ " at the end during filtering, issue #12, #13
								transformed = transformed + " ";
							}
							else {
								if (transformed == undefined || transformed == "") {
									transformed = "<del>"+ fragments[i] + "</del>";
								}
								else {
									transformed = transformed + " " + "<del>"+ fragments[i] + "</del>";
								}
							}
						}
					}
				}
			}			

			return transformed;
		}

		// This is a proxy around generalLatin filter, just make more easy settings
		function generalLatinEasy(s) {

			setFilterDifficulty(1.5);
			return generalLatin(s);
		}

		// This is a proxy around generalLatin filter, with normal settings
		function generalLatinNormal(s) {

			setFilterDifficulty(2);
			return generalLatin(s);
		}

		// This is a proxy around generalLatin filter, just make harder settings
		function generalLatinHard(s) {

			setFilterDifficulty(3);
			return generalLatin(s);
		}

		// This is a proxy around generalLatin filter, make HARDCORE settings
		function generalHardcore(s) {
			setFilterDifficulty(0);
			return generalLatin(s);			
		}


		// Very simple filter that should work on most of Chinese and Japanese texts
		// I do not know Chinese nor Japanese, hope I find someone who knows it and will help me improve this filter
		function chinesejapanese(s) {
			let transformed;

			if (!s) { return s; } // sometimes s is empty string

			// Handle some special characters at the beginning
			// these are characters often found at subtitle beginning, we keep them unchanged and transform rest of the string
			let startingCharacters = [...specialChars.startingChars, ...specialChars.bidiChars];

			if (startingCharacters.includes(s.charAt(0))) {
				transformed = s.charAt(0) + chinesejapanese(s.substring(1));
			}

			// Handle subtitle markup
			// Sometimes subtitles contains html markup, usualy <b>, <i>, <u> and </b>, </i>, </u>.
			// Keep text inside <> without change and transform the rest
			// Note: there can be more tags in one text, and might not necesary be in pairs
			else if (s.match(/<[^>]+>/)) { // looking for < anything in angle brackets >
			
				// we need to find all <tags>, for which we use global string.replace with callback function
				transformed = s.replace(/([^<>]*)(<[^<>]+>)([^<>]*)/g,
					function(m,p1,p2,p3,o,s,g) { // m contains one whole match, p1 text before <angle bracket>, p2 text inside <angle bracket> including brackets, p3 text after <angle bracket>
						//console.log({m:m,p1:p1,p2:p2,p3:p3,o:o,s:s,g:g});
						return chinesejapanese(p1) + p2 + chinesejapanese(p3);
					}
				);
			}
			// Handle [text in brackets]
			// It this usually comment, that is not part of speach
			// Keep all text inside brackets without change and transform the rest

			else if (s.match(/\[[^\]]+\]/)) { // looking for [ anything in square brackets ]
				let results = s.match(/(.*)(\[[^\]]+\])(.*)/); // results[1] contains text before [backets], results[2] containts text inside [backets] including brackets, results[3] text after [backets]
				transformed = chinesejapanese(results[1]) + results[2] + chinesejapanese(results[3]);
			}

			// Very short strings returns unchanged
			else if (s.length < 3) {
				return s;
			}
			else {

				// Finally here, decide which words to hide
				// There still can be some special characters that we want to keep (e.g. "!", "?")

				const deletePart = 0.3;	// 0.25 = we hide 25% of the text, 0.5 = 50% etc
				const howManyCharactersKeep = Math.floor(s.length * (1 - deletePart));
				const howManyCharactersRemove = s.length - howManyCharactersKeep;

				let specialCharacters = [
					...specialChars.generalChars,
					" ",		// add space (because for Chinese and Japanese subtitles is space a special character that should be preserved and not just word separator like in general filter)
					...specialChars.fullWidthChars,
					...specialChars.otherAsianChars
				];

				let re = new RegExp("[" + specialCharacters.join("") + "]");           // create matching regexp for detecting special chars like: /[-♪()]/
				let re2 = new RegExp("([^" + specialCharacters.join("") + "]+)", "g"); // create negative global regexp for replacing non-special chars like: /([^-♪()]+)/g

				// easy no special chars detected
				// just hide what we want to hide
				if (!s.match(re)) {

					transformed = s.substring(0, howManyCharactersKeep) + "<del>" + s.substring(howManyCharactersKeep) + "</del>";
				}
				// need to be careful, there are some special chars
				else {
					const partToKeep = s.substring(0, howManyCharactersKeep);
					const partToRemove = s.substring(howManyCharactersKeep);

					let replaced = partToRemove.replace(re2, "<del>$1</del>");  // keep special characters, others put inside <del> tags
					transformed = partToKeep + replaced;
				}
			}

			return transformed;			
		}

	return {run, runByName, select, selectDefaultFilter, list, register, render, renderIntoPlainAscii};
}();

subfilter.stopWords = {};
subfilter.stopWords.English = ["'ll","'tis","'twas","'ve","10","39","a","a's","able","ableabout","about","above","abroad","abst","accordance","according","accordingly","across","act","actually","ad","added","adj","adopted","ae","af","affected","affecting","affects","after","afterwards","ag","again","against","ago","ah","ahead","ai","ain't","aint","al","all","allow","allows","almost","alone","along","alongside","already","also","although","always","am","amid","amidst","among","amongst","amoungst","amount","an","and","announce","another","any","anybody","anyhow","anymore","anyone","anything","anyway","anyways","anywhere","ao","apart","apparently","appear","appreciate","appropriate","approximately","aq","ar","are","area","areas","aren","aren't","arent","arise","around","arpa","as","aside","ask","asked","asking","asks","associated","at","au","auth","available","aw","away","awfully","az","b","ba","back","backed","backing","backs","backward","backwards","bb","bd","be","became","because","become","becomes","becoming","been","before","beforehand","began","begin","beginning","beginnings","begins","behind","being","beings","believe","below","beside","besides","best","better","between","beyond","bf","bg","bh","bi","big","bill","billion","biol","bj","bm","bn","bo","both","bottom","br","brief","briefly","bs","bt","but","buy","bv","bw","by","bz","c","c'mon","c's","ca","call","came","can","can't","cannot","cant","caption","case","cases","cause","causes","cc","cd","certain","certainly","cf","cg","ch","changes","ci","ck","cl","clear","clearly","click","cm","cmon","cn","co","co.","com","come","comes","computer","con","concerning","consequently","consider","considering","contain","containing","contains","copy","corresponding","could","could've","couldn","couldn't","couldnt","course","cr","cry","cs","cu","currently","cv","cx","cy","cz","d","dare","daren't","darent","date","de","dear","definitely","describe","described","despite","detail","did","didn","didn't","didnt","differ","different","differently","directly","dj","dk","dm","do","does","doesn","doesn't","doesnt","doing","don","don't","done","dont","doubtful","down","downed","downing","downs","downwards","due","during","dz","e","each","early","ec","ed","edu","ee","effect","eg","eh","eight","eighty","either","eleven","else","elsewhere","empty","end","ended","ending","ends","enough","entirely","er","es","especially","et","et-al","etc","even","evenly","ever","evermore","every","everybody","everyone","everything","everywhere","ex","exactly","example","except","f","face","faces","fact","facts","fairly","far","farther","felt","few","fewer","ff","fi","fifteen","fifth","fifty","fify","fill","find","finds","fire","first","five","fix","fj","fk","fm","fo","followed","following","follows","for","forever","former","formerly","forth","forty","forward","found","four","fr","free","from","front","full","fully","further","furthered","furthering","furthermore","furthers","fx","g","ga","gave","gb","gd","ge","general","generally","get","gets","getting","gf","gg","gh","gi","give","given","gives","giving","gl","gm","gmt","gn","go","goes","going","gone","good","goods","got","gotten","gov","gp","gq","gr","great","greater","greatest","greetings","group","grouped","grouping","groups","gs","gt","gu","gw","gy","h","had","hadn't","hadnt","half","happens","hardly","has","hasn","hasn't","hasnt","have","haven","haven't","havent","having","he","he'd","he'll","he's","hed","hell","hello","help","hence","her","here","here's","hereafter","hereby","herein","heres","hereupon","hers","herself","herse”","hes","hi","hid","high","higher","highest","him","himself","himse”","his","hither","hk","hm","hn","home","homepage","hopefully","how","how'd","how'll","how's","howbeit","however","hr","ht","htm","html","http","hu","hundred","i","i'd","i'll","i'm","i've","i.e.","id","ie","if","ignored","ii","il","ill","im","immediate","immediately","importance","important","in","inasmuch","inc","inc.","indeed","index","indicate","indicated","indicates","information","inner","inside","insofar","instead","int","interest","interested","interesting","interests","into","invention","inward","io","iq","ir","is","isn","isn't","isnt","it","it'd","it'll","it's","itd","itll","its","itself","itse”","ive","j","je","jm","jo","join","jp","just","k","ke","keep","keeps","kept","keys","kg","kh","ki","kind","km","kn","knew","know","known","knows","kp","kr","kw","ky","kz","l","la","large","largely","last","lately","later","latest","latter","latterly","lb","lc","least","length","less","lest","let","let's","lets","li","like","liked","likely","likewise","line","little","lk","ll","long","longer","longest","look","looking","looks","low","lower","lr","ls","lt","ltd","lu","lv","ly","m","ma","made","mainly","make","makes","making","man","many","may","maybe","mayn't","maynt","mc","md","me","mean","means","meantime","meanwhile","member","members","men","merely","mg","mh","microsoft","might","might've","mightn't","mightnt","mil","mill","million","mine","minus","miss","mk","ml","mm","mn","mo","more","moreover","most","mostly","move","mp","mq","mr","mrs","ms","msie","mt","mu","much","mug","must","must've","mustn't","mustnt","mv","mw","mx","my","myself","myse”","mz","n","na","name","namely","nay","nc","nd","ne","near","nearly","necessarily","necessary","need","needed","needing","needn't","neednt","needs","neither","net","netscape","never","neverf","neverless","nevertheless","new","newer","newest","next","nf","ng","ni","nine","ninety","nl","no","no-one","nobody","non","none","nonetheless","noone","nor","normally","nos","not","noted","nothing","notwithstanding","novel","now","nowhere","np","nr","nu","null","number","numbers","nz","o","obtain","obtained","obviously","of","off","often","oh","ok","okay","old","older","oldest","om","omitted","on","once","one","one's","ones","only","onto","open","opened","opening","opens","opposite","or","ord","order","ordered","ordering","orders","org","other","others","otherwise","ought","oughtn't","oughtnt","our","ours","ourselves","out","outside","over","overall","owing","own","p","pa","page","pages","part","parted","particular","particularly","parting","parts","past","pe","per","perhaps","pf","pg","ph","pk","pl","place","placed","places","please","plus","pm","pmid","pn","point","pointed","pointing","points","poorly","possible","possibly","potentially","pp","pr","predominantly","present","presented","presenting","presents","presumably","previously","primarily","probably","problem","problems","promptly","proud","provided","provides","pt","put","puts","pw","py","q","qa","que","quickly","quite","qv","r","ran","rather","rd","re","readily","really","reasonably","recent","recently","ref","refs","regarding","regardless","regards","related","relatively","research","reserved","respectively","resulted","resulting","results","right","ring","ro","room","rooms","round","ru","run","rw","s","sa","said","same","saw","say","saying","says","sb","sc","sd","se","sec","second","secondly","seconds","section","see","seeing","seem","seemed","seeming","seems","seen","sees","self","selves","sensible","sent","serious","seriously","seven","seventy","several","sg","sh","shall","shan't","shant","she","she'd","she'll","she's","shed","shell","shes","should","should've","shouldn","shouldn't","shouldnt","show","showed","showing","shown","showns","shows","si","side","sides","significant","significantly","similar","similarly","since","sincere","site","six","sixty","sj","sk","sl","slightly","sm","small","smaller","smallest","sn","so","some","somebody","someday","somehow","someone","somethan","something","sometime","sometimes","somewhat","somewhere","soon","sorry","specifically","specified","specify","specifying","sr","st","state","states","still","stop","strongly","su","sub","substantially","successfully","such","sufficiently","suggest","sup","sure","sv","sy","system","sz","t","t's","take","taken","taking","tc","td","tell","ten","tends","test","text","tf","tg","th","than","thank","thanks","thanx","that","that'll","that's","that've","thatll","thats","thatve","the","their","theirs","them","themselves","then","thence","there","there'd","there'll","there're","there's","there've","thereafter","thereby","thered","therefore","therein","therell","thereof","therere","theres","thereto","thereupon","thereve","these","they","they'd","they'll","they're","they've","theyd","theyll","theyre","theyve","thick","thin","thing","things","think","thinks","third","thirty","this","thorough","thoroughly","those","thou","though","thoughh","thought","thoughts","thousand","three","throug","through","throughout","thru","thus","til","till","tip","tis","tj","tk","tm","tn","to","today","together","too","took","top","toward","towards","tp","tr","tried","tries","trillion","truly","try","trying","ts","tt","turn","turned","turning","turns","tv","tw","twas","twelve","twenty","twice","two","tz","u","ua","ug","uk","um","un","under","underneath","undoing","unfortunately","unless","unlike","unlikely","until","unto","up","upon","ups","upwards","us","use","used","useful","usefully","usefulness","uses","using","usually","uucp","uy","uz","v","va","value","various","vc","ve","versus","very","vg","vi","via","viz","vn","vol","vols","vs","vu","w","want","wanted","wanting","wants","was","wasn","wasn't","wasnt","way","ways","we","we'd","we'll","we're","we've","web","webpage","website","wed","welcome","well","wells","went","were","weren","weren't","werent","weve","wf","what","what'd","what'll","what's","what've","whatever","whatll","whats","whatve","when","when'd","when'll","when's","whence","whenever","where","where'd","where'll","where's","whereafter","whereas","whereby","wherein","wheres","whereupon","wherever","whether","which","whichever","while","whilst","whim","whither","who","who'd","who'll","who's","whod","whoever","whole","wholl","whom","whomever","whos","whose","why","why'd","why'll","why's","widely","width","will","willing","wish","with","within","without","won","won't","wonder","wont","words","work","worked","working","works","world","would","would've","wouldn","wouldn't","wouldnt","ws","www","x","y","ye","year","years","yes","yet","you","you'd","you'll","you're","you've","youd","youll","young","younger","youngest","your","youre","yours","yourself","yourselves","youve","yt","yu","z","za","zero","zm","zr"];
subfilter.stopWords.Spanish = ["a", "al", "algo", "algunas", "algunos", "ante", "antes", "como", "con", "contra", "cual", "cuando", "de", "del", "desde", "donde", "durante", "e", "el", "ella", "ellas", "ellos", "en", "entre", "era", "erais", "eran", "eras", "eres", "es", "esa", "esas", "ese", "eso", "esos", "esta", "estaba", "estabais", "estaban", "estabas", "estad", "estada", "estadas", "estado", "estados", "estamos", "estando", "estar", "estaremos", "estará", "estarán", "estarás", "estaré", "estaréis", "estaría", "estaríais", "estaríamos", "estarían", "estarías", "estas", "este", "estemos", "esto", "estos", "estoy", "estuve", "estuviera", "estuvierais", "estuvieran", "estuvieras", "estuvieron", "estuviese", "estuvieseis", "estuviesen", "estuvieses", "estuvimos", "estuviste", "estuvisteis", "estuviéramos", "estuviésemos", "estuvo", "está", "estábamos", "estáis", "están", "estás", "esté", "estéis", "estén", "estés", "fue", "fuera", "fuerais", "fueran", "fueras", "fueron", "fuese", "fueseis", "fuesen", "fueses", "fui", "fuimos", "fuiste", "fuisteis", "fuéramos", "fuésemos", "ha", "habida", "habidas", "habido", "habidos", "habiendo", "habremos", "habrá", "habrán", "habrás", "habré", "habréis", "habría", "habríais", "habríamos", "habrían", "habrías", "habéis", "había", "habíais", "habíamos", "habían", "habías", "han", "has", "hasta", "hay", "haya", "hayamos", "hayan", "hayas", "hayáis", "he", "hemos", "hube", "hubiera", "hubierais", "hubieran", "hubieras", "hubieron", "hubiese", "hubieseis", "hubiesen", "hubieses", "hubimos", "hubiste", "hubisteis", "hubiéramos", "hubiésemos", "hubo", "la", "las", "le", "les", "lo", "los", "me", "mi", "mis", "mucho", "muchos", "muy", "más", "mí", "mía", "mías", "mío", "míos", "nada", "ni", "no", "nos", "nosotras", "nosotros", "nuestra", "nuestras", "nuestro", "nuestros", "o", "os", "otra", "otras", "otro", "otros", "para", "pero", "poco", "por", "porque", "que", "quien", "quienes", "qué", "se", "sea", "seamos", "sean", "seas", "seremos", "será", "serán", "serás", "seré", "seréis", "sería", "seríais", "seríamos", "serían", "serías", "seáis", "sido", "siendo", "sin", "sobre", "sois", "somos", "son", "soy", "su", "sus", "suya", "suyas", "suyo", "suyos", "sí", "también", "tanto", "te", "tendremos", "tendrá", "tendrán", "tendrás", "tendré", "tendréis", "tendría", "tendríais", "tendríamos", "tendrían", "tendrías", "tened", "tenemos", "tenga", "tengamos", "tengan", "tengas", "tengo", "tengáis", "tenida", "tenidas", "tenido", "tenidos", "teniendo", "tenéis", "tenía", "teníais", "teníamos", "tenían", "tenías", "ti", "tiene", "tienen", "tienes", "todo", "todos", "tu", "tus", "tuve", "tuviera", "tuvierais", "tuvieran", "tuvieras", "tuvieron", "tuviese", "tuvieseis", "tuviesen", "tuvieses", "tuvimos", "tuviste", "tuvisteis", "tuviéramos", "tuviésemos", "tuvo", "tuya", "tuyas", "tuyo", "tuyos", "tú", "un", "una", "uno", "unos", "vosotras", "vosotros", "vuestra", "vuestras", "vuestro", "vuestros", "y", "ya", "yo", "él", "éramos"];
subfilter.stopWords.Polish  = ["a","aby","ach","acz","aczkolwiek","aj","albo","ale","ależ","ani","aż","bardziej","bardzo","bez","bo","bowiem","by","byli","bym","bynajmniej","być","był","była","było","były","będzie","będą","cali","cała","cały","chce","choć","ci","ciebie","cię","co","cokolwiek","coraz","coś","czasami","czasem","czemu","czy","czyli","często","daleko","dla","dlaczego","dlatego","do","dobrze","dokąd","dość","dr","dużo","dwa","dwaj","dwie","dwoje","dzisiaj","dziś","gdy","gdyby","gdyż","gdzie","gdziekolwiek","gdzieś","go","godz","hab","i","ich","ii","iii","ile","im","inna","inne","inny","innych","inż","iv","ix","iż","ja","jak","jakaś","jakby","jaki","jakichś","jakie","jakiś","jakiż","jakkolwiek","jako","jakoś","je","jeden","jedna","jednak","jednakże","jedno","jednym","jedynie","jego","jej","jemu","jest","jestem","jeszcze","jeśli","jeżeli","już","ją","każdy","kiedy","kierunku","kilka","kilku","kimś","kto","ktokolwiek","ktoś","która","które","którego","której","który","których","którym","którzy","ku","lat","lecz","lub","ma","mają","mam","mamy","mało","mgr","mi","miał","mimo","między","mnie","mną","mogą","moi","moim","moja","moje","może","możliwe","można","mu","musi","my","mój","na","nad","nam","nami","nas","nasi","nasz","nasza","nasze","naszego","naszych","natomiast","natychmiast","nawet","nic","nich","nie","niech","niego","niej","niemu","nigdy","nim","nimi","nią","niż","no","nowe","np","nr","o","o.o.","obok","od","ok","około","on","ona","one","oni","ono","oraz","oto","owszem","pan","pana","pani","pl","po","pod","podczas","pomimo","ponad","ponieważ","powinien","powinna","powinni","powinno","poza","prawie","prof","przecież","przed","przede","przedtem","przez","przy","raz","razie","roku","również","sam","sama","się","skąd","sobie","sobą","sposób","swoje","są","ta","tak","taka","taki","takich","takie","także","tam","te","tego","tej","tel","temu","ten","teraz","też","to","tobie","tobą","toteż","totobą","trzeba","tu","tutaj","twoi","twoim","twoja","twoje","twym","twój","ty","tych","tylko","tym","tys","tzw","tę","u","ul","vi","vii","viii","vol","w","wam","wami","was","wasi","wasz","wasza","wasze","we","według","wie","wiele","wielu","więc","więcej","wszyscy","wszystkich","wszystkie","wszystkim","wszystko","wtedy","www","wy","właśnie","wśród","xi","xii","xiii","xiv","xv","z","za","zapewne","zawsze","zaś","ze","zeznowu","znowu","znów","został","zł","żaden","żadna","żadne","żadnych","że","żeby"];
subfilter.stopWords.Czech   = ["a","aby","ahoj","aj","ale","anebo","ani","aniž","ano","asi","aspoň","atd","atp","az","ačkoli","až","bez","beze","blízko","bohužel","brzo","bude","budem","budeme","budes","budete","budeš","budou","budu","by","byl","byla","byli","bylo","byly","bys","byt","být","během","chce","chceme","chcete","chceš","chci","chtít","chtějí","chut'","chuti","ci","clanek","clanku","clanky","co","coz","což","cz","daleko","dalsi","další","den","deset","design","devatenáct","devět","dnes","do","dobrý","docela","dva","dvacet","dvanáct","dvě","dál","dále","děkovat","děkujeme","děkuji","email","ho","hodně","i","jak","jakmile","jako","jakož","jde","je","jeden","jedenáct","jedna","jedno","jednou","jedou","jeho","jehož","jej","jeji","jejich","její","jelikož","jemu","jen","jenom","jenž","jeste","jestli","jestliže","ještě","jež","ji","jich","jimi","jinak","jine","jiné","jiz","již","jsem","jses","jseš","jsi","jsme","jsou","jste","já","jí","jím","jíž","jšte","k","kam","každý","kde","kdo","kdy","kdyz","když","ke","kolik","kromě","ktera","ktere","kteri","kterou","ktery","která","které","který","kteři","kteří","ku","kvůli","ma","mají","mate","me","mezi","mi","mit","mne","mnou","mně","moc","mohl","mohou","moje","moji","možná","muj","musí","muze","my","má","málo","mám","máme","máte","máš","mé","mí","mít","mě","můj","může","na","nad","nade","nam","napiste","napište","naproti","nas","nasi","načež","naše","naši","ne","nebo","nebyl","nebyla","nebyli","nebyly","nechť","nedělají","nedělá","nedělám","neděláme","neděláte","neděláš","neg","nejsi","nejsou","nemají","nemáme","nemáte","neměl","neni","není","nestačí","nevadí","nez","než","nic","nich","nimi","nove","novy","nové","nový","nula","ná","nám","námi","nás","náš","ní","ním","ně","něco","nějak","někde","někdo","němu","němuž","o","od","ode","on","ona","oni","ono","ony","osm","osmnáct","pak","patnáct","po","pod","podle","pokud","potom","pouze","pozdě","pořád","prave","pravé","pred","pres","pri","pro","proc","prostě","prosím","proti","proto","protoze","protože","proč","prvni","první","práve","pta","pět","před","přede","přes","přese","při","přičemž","re","rovně","s","se","sedm","sedmnáct","si","sice","skoro","smí","smějí","snad","spolu","sta","sto","strana","sté","sve","svych","svym","svymi","své","svých","svým","svými","svůj","ta","tady","tak","take","takhle","taky","takze","také","takže","tam","tamhle","tamhleto","tamto","tato","te","tebe","tebou","ted'","tedy","tema","ten","tento","teto","ti","tim","timto","tipy","tisíc","tisíce","to","tobě","tohle","toho","tohoto","tom","tomto","tomu","tomuto","toto","trošku","tu","tuto","tvoje","tvá","tvé","tvůj","ty","tyto","téma","této","tím","tímto","tě","těm","těma","těmu","třeba","tři","třináct","u","určitě","uz","už","v","vam","vas","vase","vaše","vaši","ve","vedle","večer","vice","vlastně","vsak","vy","vám","vámi","vás","váš","více","však","všechen","všechno","všichni","vůbec","vždy","z","za","zatímco","zač","zda","zde","ze","zpet","zpravy","zprávy","zpět","čau","či","článek","článku","články","čtrnáct","čtyři","šest","šestnáct","že"];
