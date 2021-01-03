"use strict";

const subfilter = {};

subfilter.storageLastFilterKey = "subfilter-filtername";

// Create select element for selection between different filters
subfilter.createFilterSelector = function (parent, options) {
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
		let optElem = document.createElement("option");
		optElem.textContent = list[method].name;
		optElem.title = list[method].name + " : \n" + list[method].description;
		optElem.value = method;
		selectElem.appendChild(optElem);
	}

	// Set current filter to the last filter that we remember 
	let lastFilterName = localStorage.getItem(subfilter.storageLastFilterKey);

	if (lastFilterName) {
		subfilter.filters.select(lastFilterName);
		selectElem.value = lastFilterName;
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
      // console.log({li: line, lo: blurred});
      newLines.push(transformed);
    }

    return newLines.join('\n');	
}

//////////////////////////////////////////////////////
// Manager for selecting/runing filters
//
subfilter.filters = function() {

		let defaultFilter = "nofilter";
		let currentFilter = defaultFilter;

		let listing = {
					"nofilter":    { name: "No filter",                   description: "Switch off filters.", run: nofilter },
					"generalLatin": { name: "General filter (for latin alphabets) - DEFAULT", description: "General filter for languages with latin alphabet. Use it if there is not any more specified filter.", run: generalLatinNormal },
					"generalLatinEasy": { name: "General filter (lat. al.) - EASY", description: "General filter for languages with latin alphabet. Use it if there is not any more specified filter.", run: generalLatinEasy },
					"generalLatinHard": { name: "General filter (lat. al.) - HARD", description: "General filter for languages with latin alphabet. Use it if there is not any more specified filter.", run: generalLatinHard },
					"easyEnglish": { name: "English friendly",            description: "Optimized for English, understand basic English stop words.", run: easyEnglish },
					"easySpanish": { name: "Spanish friendly",            description: "Optimized for Spanish, understand basic Spanish stop words.", run: easySpanish },
//					"easyTesting": { name: "Elemental (ony for testing)", description: "Really stupid method", run: easyTesting },
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

		function select(name) {
			if (name in listing) {
				currentFilter = name;
			}
			else {
				console.error({name});
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

		// Some filters can use difficulty settings

		let filterDifficulty = 2; // 3 = hard, 2 = normal, 1.5 = easy

		function setFilterDifficulty(value) {
			if (!value) {             // no value = reset difficulty to normal
				filterDifficulty = 2; // 2 = normal difficulty
			}
			else {
				filterDifficulty = value;
			}
		}

		/////////////////////////////////////////////
		// All filters are defined here:
		//

		// this one just for testing
		function easyTesting(s) {
			return s.replace(/(\W\w+)/ig, " _ ");
		}

		// nofilter is filter too, just change nothing
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
			let startingCharacters = ["-", "♪", " ", "'", ",", ".", "\"", "("];

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
				// Finally here, decide which words to delete
				// Split text into fragments between spaces (usually words, but also numbers, punctuations etc.) and check every fragment
				// \s is can be any type of space character including tabulator. But most usually it is space. At least in subtitles.
				let fragments = s.split(/\s/);
				//console.log(fragments.length);

				// Coeficient, who large part of the text to delete
				let coef = filterDifficulty; // 3 = hard, 2 = normal, 1.5 = easy
				let nFragmentsToKeep =  Math.round(fragments.length / coef);
				transformed = fragments[0]; // start 1st fragment

				for (let i = 1; i < fragments.length; i++) {
					//console.log( fragments[i] );

					// Keep words/fragments in the 1st subtitle part
					if (i < nFragmentsToKeep) {
						transformed = transformed + " " + fragments[i];
					}
					// Delete words/fragments in the 2nd part
					else {
						// But check for common non-letter characters, like punctuation, we want to display these
						// But do not include apostrophe, because this looks disturbing _'_ _ and is often in English subtitles

						// "dash" must be in the first array field, to correctly form the reg. exp.
						let specialCharacters = ["-", "♪", "(", ")", ",", "\"", ":", ";", ".", "?", "!", "¡", "¿"];
						
						let re = new RegExp("[" + specialCharacters.join("") + "]");         // create matching regexp like: /[-♪()]/
						let re2 = new RegExp("[^" + specialCharacters.join("") + "]", "g"); // create negative global regexp like: /[^-♪()]/g

						//console.log({re, re2});

						if (fragments[i].match(re)) {
							let replaced = fragments[i].replace(re2, "_"); // keep special characters, replace all other characters by underscores
							replaced = replaced.replace(/_+/g, "_")  // remove duplicit underscores, keep only one
							transformed = transformed + " " + replaced;
						}
						else {
							transformed = transformed + " _ ";
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

	return {run, runByName, select, list, register};
}();

subfilter.stopWords = {};
subfilter.stopWords.English = ["'ll","'tis","'twas","'ve","10","39","a","a's","able","ableabout","about","above","abroad","abst","accordance","according","accordingly","across","act","actually","ad","added","adj","adopted","ae","af","affected","affecting","affects","after","afterwards","ag","again","against","ago","ah","ahead","ai","ain't","aint","al","all","allow","allows","almost","alone","along","alongside","already","also","although","always","am","amid","amidst","among","amongst","amoungst","amount","an","and","announce","another","any","anybody","anyhow","anymore","anyone","anything","anyway","anyways","anywhere","ao","apart","apparently","appear","appreciate","appropriate","approximately","aq","ar","are","area","areas","aren","aren't","arent","arise","around","arpa","as","aside","ask","asked","asking","asks","associated","at","au","auth","available","aw","away","awfully","az","b","ba","back","backed","backing","backs","backward","backwards","bb","bd","be","became","because","become","becomes","becoming","been","before","beforehand","began","begin","beginning","beginnings","begins","behind","being","beings","believe","below","beside","besides","best","better","between","beyond","bf","bg","bh","bi","big","bill","billion","biol","bj","bm","bn","bo","both","bottom","br","brief","briefly","bs","bt","but","buy","bv","bw","by","bz","c","c'mon","c's","ca","call","came","can","can't","cannot","cant","caption","case","cases","cause","causes","cc","cd","certain","certainly","cf","cg","ch","changes","ci","ck","cl","clear","clearly","click","cm","cmon","cn","co","co.","com","come","comes","computer","con","concerning","consequently","consider","considering","contain","containing","contains","copy","corresponding","could","could've","couldn","couldn't","couldnt","course","cr","cry","cs","cu","currently","cv","cx","cy","cz","d","dare","daren't","darent","date","de","dear","definitely","describe","described","despite","detail","did","didn","didn't","didnt","differ","different","differently","directly","dj","dk","dm","do","does","doesn","doesn't","doesnt","doing","don","don't","done","dont","doubtful","down","downed","downing","downs","downwards","due","during","dz","e","each","early","ec","ed","edu","ee","effect","eg","eh","eight","eighty","either","eleven","else","elsewhere","empty","end","ended","ending","ends","enough","entirely","er","es","especially","et","et-al","etc","even","evenly","ever","evermore","every","everybody","everyone","everything","everywhere","ex","exactly","example","except","f","face","faces","fact","facts","fairly","far","farther","felt","few","fewer","ff","fi","fifteen","fifth","fifty","fify","fill","find","finds","fire","first","five","fix","fj","fk","fm","fo","followed","following","follows","for","forever","former","formerly","forth","forty","forward","found","four","fr","free","from","front","full","fully","further","furthered","furthering","furthermore","furthers","fx","g","ga","gave","gb","gd","ge","general","generally","get","gets","getting","gf","gg","gh","gi","give","given","gives","giving","gl","gm","gmt","gn","go","goes","going","gone","good","goods","got","gotten","gov","gp","gq","gr","great","greater","greatest","greetings","group","grouped","grouping","groups","gs","gt","gu","gw","gy","h","had","hadn't","hadnt","half","happens","hardly","has","hasn","hasn't","hasnt","have","haven","haven't","havent","having","he","he'd","he'll","he's","hed","hell","hello","help","hence","her","here","here's","hereafter","hereby","herein","heres","hereupon","hers","herself","herse”","hes","hi","hid","high","higher","highest","him","himself","himse”","his","hither","hk","hm","hn","home","homepage","hopefully","how","how'd","how'll","how's","howbeit","however","hr","ht","htm","html","http","hu","hundred","i","i'd","i'll","i'm","i've","i.e.","id","ie","if","ignored","ii","il","ill","im","immediate","immediately","importance","important","in","inasmuch","inc","inc.","indeed","index","indicate","indicated","indicates","information","inner","inside","insofar","instead","int","interest","interested","interesting","interests","into","invention","inward","io","iq","ir","is","isn","isn't","isnt","it","it'd","it'll","it's","itd","itll","its","itself","itse”","ive","j","je","jm","jo","join","jp","just","k","ke","keep","keeps","kept","keys","kg","kh","ki","kind","km","kn","knew","know","known","knows","kp","kr","kw","ky","kz","l","la","large","largely","last","lately","later","latest","latter","latterly","lb","lc","least","length","less","lest","let","let's","lets","li","like","liked","likely","likewise","line","little","lk","ll","long","longer","longest","look","looking","looks","low","lower","lr","ls","lt","ltd","lu","lv","ly","m","ma","made","mainly","make","makes","making","man","many","may","maybe","mayn't","maynt","mc","md","me","mean","means","meantime","meanwhile","member","members","men","merely","mg","mh","microsoft","might","might've","mightn't","mightnt","mil","mill","million","mine","minus","miss","mk","ml","mm","mn","mo","more","moreover","most","mostly","move","mp","mq","mr","mrs","ms","msie","mt","mu","much","mug","must","must've","mustn't","mustnt","mv","mw","mx","my","myself","myse”","mz","n","na","name","namely","nay","nc","nd","ne","near","nearly","necessarily","necessary","need","needed","needing","needn't","neednt","needs","neither","net","netscape","never","neverf","neverless","nevertheless","new","newer","newest","next","nf","ng","ni","nine","ninety","nl","no","no-one","nobody","non","none","nonetheless","noone","nor","normally","nos","not","noted","nothing","notwithstanding","novel","now","nowhere","np","nr","nu","null","number","numbers","nz","o","obtain","obtained","obviously","of","off","often","oh","ok","okay","old","older","oldest","om","omitted","on","once","one","one's","ones","only","onto","open","opened","opening","opens","opposite","or","ord","order","ordered","ordering","orders","org","other","others","otherwise","ought","oughtn't","oughtnt","our","ours","ourselves","out","outside","over","overall","owing","own","p","pa","page","pages","part","parted","particular","particularly","parting","parts","past","pe","per","perhaps","pf","pg","ph","pk","pl","place","placed","places","please","plus","pm","pmid","pn","point","pointed","pointing","points","poorly","possible","possibly","potentially","pp","pr","predominantly","present","presented","presenting","presents","presumably","previously","primarily","probably","problem","problems","promptly","proud","provided","provides","pt","put","puts","pw","py","q","qa","que","quickly","quite","qv","r","ran","rather","rd","re","readily","really","reasonably","recent","recently","ref","refs","regarding","regardless","regards","related","relatively","research","reserved","respectively","resulted","resulting","results","right","ring","ro","room","rooms","round","ru","run","rw","s","sa","said","same","saw","say","saying","says","sb","sc","sd","se","sec","second","secondly","seconds","section","see","seeing","seem","seemed","seeming","seems","seen","sees","self","selves","sensible","sent","serious","seriously","seven","seventy","several","sg","sh","shall","shan't","shant","she","she'd","she'll","she's","shed","shell","shes","should","should've","shouldn","shouldn't","shouldnt","show","showed","showing","shown","showns","shows","si","side","sides","significant","significantly","similar","similarly","since","sincere","site","six","sixty","sj","sk","sl","slightly","sm","small","smaller","smallest","sn","so","some","somebody","someday","somehow","someone","somethan","something","sometime","sometimes","somewhat","somewhere","soon","sorry","specifically","specified","specify","specifying","sr","st","state","states","still","stop","strongly","su","sub","substantially","successfully","such","sufficiently","suggest","sup","sure","sv","sy","system","sz","t","t's","take","taken","taking","tc","td","tell","ten","tends","test","text","tf","tg","th","than","thank","thanks","thanx","that","that'll","that's","that've","thatll","thats","thatve","the","their","theirs","them","themselves","then","thence","there","there'd","there'll","there're","there's","there've","thereafter","thereby","thered","therefore","therein","therell","thereof","therere","theres","thereto","thereupon","thereve","these","they","they'd","they'll","they're","they've","theyd","theyll","theyre","theyve","thick","thin","thing","things","think","thinks","third","thirty","this","thorough","thoroughly","those","thou","though","thoughh","thought","thoughts","thousand","three","throug","through","throughout","thru","thus","til","till","tip","tis","tj","tk","tm","tn","to","today","together","too","took","top","toward","towards","tp","tr","tried","tries","trillion","truly","try","trying","ts","tt","turn","turned","turning","turns","tv","tw","twas","twelve","twenty","twice","two","tz","u","ua","ug","uk","um","un","under","underneath","undoing","unfortunately","unless","unlike","unlikely","until","unto","up","upon","ups","upwards","us","use","used","useful","usefully","usefulness","uses","using","usually","uucp","uy","uz","v","va","value","various","vc","ve","versus","very","vg","vi","via","viz","vn","vol","vols","vs","vu","w","want","wanted","wanting","wants","was","wasn","wasn't","wasnt","way","ways","we","we'd","we'll","we're","we've","web","webpage","website","wed","welcome","well","wells","went","were","weren","weren't","werent","weve","wf","what","what'd","what'll","what's","what've","whatever","whatll","whats","whatve","when","when'd","when'll","when's","whence","whenever","where","where'd","where'll","where's","whereafter","whereas","whereby","wherein","wheres","whereupon","wherever","whether","which","whichever","while","whilst","whim","whither","who","who'd","who'll","who's","whod","whoever","whole","wholl","whom","whomever","whos","whose","why","why'd","why'll","why's","widely","width","will","willing","wish","with","within","without","won","won't","wonder","wont","words","work","worked","working","works","world","would","would've","wouldn","wouldn't","wouldnt","ws","www","x","y","ye","year","years","yes","yet","you","you'd","you'll","you're","you've","youd","youll","young","younger","youngest","your","youre","yours","yourself","yourselves","youve","yt","yu","z","za","zero","zm","zr"];
subfilter.stopWords.Spanish = ["a", "al", "algo", "algunas", "algunos", "ante", "antes", "como", "con", "contra", "cual", "cuando", "de", "del", "desde", "donde", "durante", "e", "el", "ella", "ellas", "ellos", "en", "entre", "era", "erais", "eran", "eras", "eres", "es", "esa", "esas", "ese", "eso", "esos", "esta", "estaba", "estabais", "estaban", "estabas", "estad", "estada", "estadas", "estado", "estados", "estamos", "estando", "estar", "estaremos", "estará", "estarán", "estarás", "estaré", "estaréis", "estaría", "estaríais", "estaríamos", "estarían", "estarías", "estas", "este", "estemos", "esto", "estos", "estoy", "estuve", "estuviera", "estuvierais", "estuvieran", "estuvieras", "estuvieron", "estuviese", "estuvieseis", "estuviesen", "estuvieses", "estuvimos", "estuviste", "estuvisteis", "estuviéramos", "estuviésemos", "estuvo", "está", "estábamos", "estáis", "están", "estás", "esté", "estéis", "estén", "estés", "fue", "fuera", "fuerais", "fueran", "fueras", "fueron", "fuese", "fueseis", "fuesen", "fueses", "fui", "fuimos", "fuiste", "fuisteis", "fuéramos", "fuésemos", "ha", "habida", "habidas", "habido", "habidos", "habiendo", "habremos", "habrá", "habrán", "habrás", "habré", "habréis", "habría", "habríais", "habríamos", "habrían", "habrías", "habéis", "había", "habíais", "habíamos", "habían", "habías", "han", "has", "hasta", "hay", "haya", "hayamos", "hayan", "hayas", "hayáis", "he", "hemos", "hube", "hubiera", "hubierais", "hubieran", "hubieras", "hubieron", "hubiese", "hubieseis", "hubiesen", "hubieses", "hubimos", "hubiste", "hubisteis", "hubiéramos", "hubiésemos", "hubo", "la", "las", "le", "les", "lo", "los", "me", "mi", "mis", "mucho", "muchos", "muy", "más", "mí", "mía", "mías", "mío", "míos", "nada", "ni", "no", "nos", "nosotras", "nosotros", "nuestra", "nuestras", "nuestro", "nuestros", "o", "os", "otra", "otras", "otro", "otros", "para", "pero", "poco", "por", "porque", "que", "quien", "quienes", "qué", "se", "sea", "seamos", "sean", "seas", "seremos", "será", "serán", "serás", "seré", "seréis", "sería", "seríais", "seríamos", "serían", "serías", "seáis", "sido", "siendo", "sin", "sobre", "sois", "somos", "son", "soy", "su", "sus", "suya", "suyas", "suyo", "suyos", "sí", "también", "tanto", "te", "tendremos", "tendrá", "tendrán", "tendrás", "tendré", "tendréis", "tendría", "tendríais", "tendríamos", "tendrían", "tendrías", "tened", "tenemos", "tenga", "tengamos", "tengan", "tengas", "tengo", "tengáis", "tenida", "tenidas", "tenido", "tenidos", "teniendo", "tenéis", "tenía", "teníais", "teníamos", "tenían", "tenías", "ti", "tiene", "tienen", "tienes", "todo", "todos", "tu", "tus", "tuve", "tuviera", "tuvierais", "tuvieran", "tuvieras", "tuvieron", "tuviese", "tuvieseis", "tuviesen", "tuvieses", "tuvimos", "tuviste", "tuvisteis", "tuviéramos", "tuviésemos", "tuvo", "tuya", "tuyas", "tuyo", "tuyos", "tú", "un", "una", "uno", "unos", "vosotras", "vosotros", "vuestra", "vuestras", "vuestro", "vuestros", "y", "ya", "yo", "él", "éramos"];
subfilter.stopWords.Polish  = ["a","aby","ach","acz","aczkolwiek","aj","albo","ale","ależ","ani","aż","bardziej","bardzo","bez","bo","bowiem","by","byli","bym","bynajmniej","być","był","była","było","były","będzie","będą","cali","cała","cały","chce","choć","ci","ciebie","cię","co","cokolwiek","coraz","coś","czasami","czasem","czemu","czy","czyli","często","daleko","dla","dlaczego","dlatego","do","dobrze","dokąd","dość","dr","dużo","dwa","dwaj","dwie","dwoje","dzisiaj","dziś","gdy","gdyby","gdyż","gdzie","gdziekolwiek","gdzieś","go","godz","hab","i","ich","ii","iii","ile","im","inna","inne","inny","innych","inż","iv","ix","iż","ja","jak","jakaś","jakby","jaki","jakichś","jakie","jakiś","jakiż","jakkolwiek","jako","jakoś","je","jeden","jedna","jednak","jednakże","jedno","jednym","jedynie","jego","jej","jemu","jest","jestem","jeszcze","jeśli","jeżeli","już","ją","każdy","kiedy","kierunku","kilka","kilku","kimś","kto","ktokolwiek","ktoś","która","które","którego","której","który","których","którym","którzy","ku","lat","lecz","lub","ma","mają","mam","mamy","mało","mgr","mi","miał","mimo","między","mnie","mną","mogą","moi","moim","moja","moje","może","możliwe","można","mu","musi","my","mój","na","nad","nam","nami","nas","nasi","nasz","nasza","nasze","naszego","naszych","natomiast","natychmiast","nawet","nic","nich","nie","niech","niego","niej","niemu","nigdy","nim","nimi","nią","niż","no","nowe","np","nr","o","o.o.","obok","od","ok","około","on","ona","one","oni","ono","oraz","oto","owszem","pan","pana","pani","pl","po","pod","podczas","pomimo","ponad","ponieważ","powinien","powinna","powinni","powinno","poza","prawie","prof","przecież","przed","przede","przedtem","przez","przy","raz","razie","roku","również","sam","sama","się","skąd","sobie","sobą","sposób","swoje","są","ta","tak","taka","taki","takich","takie","także","tam","te","tego","tej","tel","temu","ten","teraz","też","to","tobie","tobą","toteż","totobą","trzeba","tu","tutaj","twoi","twoim","twoja","twoje","twym","twój","ty","tych","tylko","tym","tys","tzw","tę","u","ul","vi","vii","viii","vol","w","wam","wami","was","wasi","wasz","wasza","wasze","we","według","wie","wiele","wielu","więc","więcej","wszyscy","wszystkich","wszystkie","wszystkim","wszystko","wtedy","www","wy","właśnie","wśród","xi","xii","xiii","xiv","xv","z","za","zapewne","zawsze","zaś","ze","zeznowu","znowu","znów","został","zł","żaden","żadna","żadne","żadnych","że","żeby"];
subfilter.stopWords.Czech   = ["a","aby","ahoj","aj","ale","anebo","ani","aniž","ano","asi","aspoň","atd","atp","az","ačkoli","až","bez","beze","blízko","bohužel","brzo","bude","budem","budeme","budes","budete","budeš","budou","budu","by","byl","byla","byli","bylo","byly","bys","byt","být","během","chce","chceme","chcete","chceš","chci","chtít","chtějí","chut'","chuti","ci","clanek","clanku","clanky","co","coz","což","cz","daleko","dalsi","další","den","deset","design","devatenáct","devět","dnes","do","dobrý","docela","dva","dvacet","dvanáct","dvě","dál","dále","děkovat","děkujeme","děkuji","email","ho","hodně","i","jak","jakmile","jako","jakož","jde","je","jeden","jedenáct","jedna","jedno","jednou","jedou","jeho","jehož","jej","jeji","jejich","její","jelikož","jemu","jen","jenom","jenž","jeste","jestli","jestliže","ještě","jež","ji","jich","jimi","jinak","jine","jiné","jiz","již","jsem","jses","jseš","jsi","jsme","jsou","jste","já","jí","jím","jíž","jšte","k","kam","každý","kde","kdo","kdy","kdyz","když","ke","kolik","kromě","ktera","ktere","kteri","kterou","ktery","která","které","který","kteři","kteří","ku","kvůli","ma","mají","mate","me","mezi","mi","mit","mne","mnou","mně","moc","mohl","mohou","moje","moji","možná","muj","musí","muze","my","má","málo","mám","máme","máte","máš","mé","mí","mít","mě","můj","může","na","nad","nade","nam","napiste","napište","naproti","nas","nasi","načež","naše","naši","ne","nebo","nebyl","nebyla","nebyli","nebyly","nechť","nedělají","nedělá","nedělám","neděláme","neděláte","neděláš","neg","nejsi","nejsou","nemají","nemáme","nemáte","neměl","neni","není","nestačí","nevadí","nez","než","nic","nich","nimi","nove","novy","nové","nový","nula","ná","nám","námi","nás","náš","ní","ním","ně","něco","nějak","někde","někdo","němu","němuž","o","od","ode","on","ona","oni","ono","ony","osm","osmnáct","pak","patnáct","po","pod","podle","pokud","potom","pouze","pozdě","pořád","prave","pravé","pred","pres","pri","pro","proc","prostě","prosím","proti","proto","protoze","protože","proč","prvni","první","práve","pta","pět","před","přede","přes","přese","při","přičemž","re","rovně","s","se","sedm","sedmnáct","si","sice","skoro","smí","smějí","snad","spolu","sta","sto","strana","sté","sve","svych","svym","svymi","své","svých","svým","svými","svůj","ta","tady","tak","take","takhle","taky","takze","také","takže","tam","tamhle","tamhleto","tamto","tato","te","tebe","tebou","ted'","tedy","tema","ten","tento","teto","ti","tim","timto","tipy","tisíc","tisíce","to","tobě","tohle","toho","tohoto","tom","tomto","tomu","tomuto","toto","trošku","tu","tuto","tvoje","tvá","tvé","tvůj","ty","tyto","téma","této","tím","tímto","tě","těm","těma","těmu","třeba","tři","třináct","u","určitě","uz","už","v","vam","vas","vase","vaše","vaši","ve","vedle","večer","vice","vlastně","vsak","vy","vám","vámi","vás","váš","více","však","všechen","všechno","všichni","vůbec","vždy","z","za","zatímco","zač","zda","zde","ze","zpet","zpravy","zprávy","zpět","čau","či","článek","článku","články","čtrnáct","čtyři","šest","šestnáct","že"];
