
// console.log('content script starting');

const styleElem = document.createElement('style');
styleElem.type = 'text/css';
styleElem.textContent = `
`;
document.head.insertBefore(styleElem, document.head.firstChild);


const scriptElem = document.createElement('script');
scriptElem.text = `
(function initializeSubadub() {
  const POLL_INTERVAL_MS = 500;
  const MANIFEST_URL = "/manifest";
  const WEBVTT_FMT = 'webvtt-lssdh-ios8';

  const SUBS_LIST_ELEM_ID = 'subadub-subs-list';
  const TOGGLE_DISPLAY_BUTTON_ID = 'subadub-toggle-display';
  const TRACK_ELEM_ID = 'subadub-track';
  const DOWNLOAD_BUTTON_ID = 'subadub-download';
  const CUSTOM_SUBS_ELEM_ID = 'subadub-custom-subs';

  const NETFLIX_PROFILES = [
    'heaac-2-dash',
    'heaac-2hq-dash',
    'playready-h264mpl30-dash',
    'playready-h264mpl31-dash',
    'playready-h264hpl30-dash',
    'playready-h264hpl31-dash',
    'vp9-profile0-L30-dash-cenc',
    'vp9-profile0-L31-dash-cenc',
    'dfxp-ls-sdh',
    'simplesdh',
    'nflx-cmisc',
    'BIF240',
    'BIF320'
  ]

  const trackListCache = new Map(); // from movie ID to list of available tracks
  const webvttCache = new Map(); // from 'movieID/trackID' to blob
  let urlMovieId; // this is mis-named now, it's pulled from the HTML
  let selectedTrackId;
  let showSubsState = true;

  let targetSubsList = null;
  let displayedSubsList = null;

  let targetTrackBlob = null;
  let displayedTrackBlob = null;

  // Convert WebVTT text to plain text plus "simple" tags (allowed in SRT)
  const TAG_REGEX = RegExp('</?([^>]*)>', 'ig');
  function vttTextToSimple(s, netflixRTLFix) {
    let simpleText = s;

    // strip tags except simple ones
    simpleText = simpleText.replace(TAG_REGEX, function (match, p1) {
      return ['i', 'u', 'b'].includes(p1.toLowerCase()) ? match : '';
    });

    if (netflixRTLFix) {
      // For each line, if it starts with lrm or rlm escape, wrap in LRE/RLE/PDF pair.
      // This is weird, but needed for compatibility with Netflix. See issue #1.
      const lines = simpleText.split('\\n');
      const newLines = [];
      for (const line of lines) {
        if (line.startsWith('&lrm;')) {
          newLines.push('\u202a' + line.slice(5) + '\u202c');
        } else if (line.startsWith('&rlm;')) {
          newLines.push('\u202b' + line.slice(5) + '\u202c');
        } else {
          newLines.push(line);
        }
      }
      simpleText = newLines.join('\\n');
    }

    return simpleText;
  }

  function makeTextBlurred(s) {
    let blurredText = s;

    const lines = s.split('\\n');
    const newLines = [];
    for (const line of lines) {
      let blurred = vttTransformEasyRecursive(line);
      // console.log({li: line, lo: blurred});
      newLines.push(blurred);
    }

    blurredText = newLines.join('\\n');
    return blurredText;
  }

// recursive transformational function
function vttTransformEasyRecursive(s) {
  let transformed;

  if (!s) { return s; } // sometimes s is empty string

  // these are characters often found at subtitle beginning, we keep them unchanged and transform rest of the string
  let startingCharacters = ["-", "♪", " ", "'", ",", "."];

  if (startingCharacters.includes(s.charAt(0))) {
    transformed = s.charAt(0) + vttTransformEasyRecursive(s.substring(1));
  }
  // sometimes subtitles contains html markup, usualy <b>, <i>, <u> and </b>, </i>, </u>. we keep text inside <>  without change and transform the rest
  // there can be more marks in one text, and not necesary in pairs 
  else if (s.match(/<[^>]+>/)) { // looking for < anything in angle brackets >
  
    // we need to find all <marks>, for that we use global string.replace with callback function
    transformed = s.replace(/([^<>]*)(<[^<>]+>)([^<>]*)/g,
      function(m,p1,p2,p3,o,s,g) { // m contains one whole match, p1 text before <angle bracket>, p2 text inside <angle bracket> including brackets, p3 text after <angle bracket>
        //console.log({m:m,p1:p1,p2:p2,p3:p3,o:o,s:s,g:g});
        return vttTransformEasyRecursive(p1) + p2 + vttTransformEasyRecursive(p3);
      }
    );
  }
  // sometimes subtitles contains text in square backets like [this], we keep the text inside brackets without change and transform the rest
  else if (s.match(/\\[[^\\]]+\\]/)) { // looking for [ anything in square brackets ]
    let results = s.match(/(.*)(\\[[^\\]]+\\])(.*)/); // results[1] contains text before [backets], results[2] containts text inside [backets] including brackets, results[3] text after [backets]
    transformed = vttTransformEasyRecursive(results[1]) + results[2] + vttTransformEasyRecursive(results[3]);
  }
  // if the first word is stop word in english, keep the stop-words, but only if the next string is long enough (this prevents long sentences only from stop words)
  // TODO - detect language code and automatically choose here proper stopwords set
  else if (s.match(/^\\w+/) && stopWordsEnglish.includes(s.match(/^\\w+/)[0].toLowerCase()) ) { // select first word and check stop list
    let firstWord = s.match(/^\\w+/)[0];
    //console.log("STOP WORDS", firstWord);

    let magicalConstantCharsAfterStopWord = 15;

    if (s.substring(firstWord.length).length > magicalConstantCharsAfterStopWord) {
      transformed = firstWord + vttTransformEasyRecursive(s.substring(firstWord.length));
    }
    else
    { // the next string is not long enough, continue like no stopword was detected here
      transformed = s.replace(/(\\W\\w+)/ig, " _ ");
    }
  }
  else
  {
    // Finally we reach end, there are no more special characters, we can transform the text
    // remove every word, but not first word, keep other non word characters

    //console.log({s:s, r:s.replace(/(\\W\\w+)/ig, " _ ")});    
    transformed = s.replace(/(\\W\\w+)/ig, " _ ");
  }

  return transformed;
}

let stopWordsEnglish = ["'ll","'tis","'twas","'ve","10","39","a","a's","able","ableabout","about","above","abroad","abst","accordance","according","accordingly","across","act","actually","ad","added","adj","adopted","ae","af","affected","affecting","affects","after","afterwards","ag","again","against","ago","ah","ahead","ai","ain't","aint","al","all","allow","allows","almost","alone","along","alongside","already","also","although","always","am","amid","amidst","among","amongst","amoungst","amount","an","and","announce","another","any","anybody","anyhow","anymore","anyone","anything","anyway","anyways","anywhere","ao","apart","apparently","appear","appreciate","appropriate","approximately","aq","ar","are","area","areas","aren","aren't","arent","arise","around","arpa","as","aside","ask","asked","asking","asks","associated","at","au","auth","available","aw","away","awfully","az","b","ba","back","backed","backing","backs","backward","backwards","bb","bd","be","became","because","become","becomes","becoming","been","before","beforehand","began","begin","beginning","beginnings","begins","behind","being","beings","believe","below","beside","besides","best","better","between","beyond","bf","bg","bh","bi","big","bill","billion","biol","bj","bm","bn","bo","both","bottom","br","brief","briefly","bs","bt","but","buy","bv","bw","by","bz","c","c'mon","c's","ca","call","came","can","can't","cannot","cant","caption","case","cases","cause","causes","cc","cd","certain","certainly","cf","cg","ch","changes","ci","ck","cl","clear","clearly","click","cm","cmon","cn","co","co.","com","come","comes","computer","con","concerning","consequently","consider","considering","contain","containing","contains","copy","corresponding","could","could've","couldn","couldn't","couldnt","course","cr","cry","cs","cu","currently","cv","cx","cy","cz","d","dare","daren't","darent","date","de","dear","definitely","describe","described","despite","detail","did","didn","didn't","didnt","differ","different","differently","directly","dj","dk","dm","do","does","doesn","doesn't","doesnt","doing","don","don't","done","dont","doubtful","down","downed","downing","downs","downwards","due","during","dz","e","each","early","ec","ed","edu","ee","effect","eg","eh","eight","eighty","either","eleven","else","elsewhere","empty","end","ended","ending","ends","enough","entirely","er","es","especially","et","et-al","etc","even","evenly","ever","evermore","every","everybody","everyone","everything","everywhere","ex","exactly","example","except","f","face","faces","fact","facts","fairly","far","farther","felt","few","fewer","ff","fi","fifteen","fifth","fifty","fify","fill","find","finds","fire","first","five","fix","fj","fk","fm","fo","followed","following","follows","for","forever","former","formerly","forth","forty","forward","found","four","fr","free","from","front","full","fully","further","furthered","furthering","furthermore","furthers","fx","g","ga","gave","gb","gd","ge","general","generally","get","gets","getting","gf","gg","gh","gi","give","given","gives","giving","gl","gm","gmt","gn","go","goes","going","gone","good","goods","got","gotten","gov","gp","gq","gr","great","greater","greatest","greetings","group","grouped","grouping","groups","gs","gt","gu","gw","gy","h","had","hadn't","hadnt","half","happens","hardly","has","hasn","hasn't","hasnt","have","haven","haven't","havent","having","he","he'd","he'll","he's","hed","hell","hello","help","hence","her","here","here's","hereafter","hereby","herein","heres","hereupon","hers","herself","herse”","hes","hi","hid","high","higher","highest","him","himself","himse”","his","hither","hk","hm","hn","home","homepage","hopefully","how","how'd","how'll","how's","howbeit","however","hr","ht","htm","html","http","hu","hundred","i","i'd","i'll","i'm","i've","i.e.","id","ie","if","ignored","ii","il","ill","im","immediate","immediately","importance","important","in","inasmuch","inc","inc.","indeed","index","indicate","indicated","indicates","information","inner","inside","insofar","instead","int","interest","interested","interesting","interests","into","invention","inward","io","iq","ir","is","isn","isn't","isnt","it","it'd","it'll","it's","itd","itll","its","itself","itse”","ive","j","je","jm","jo","join","jp","just","k","ke","keep","keeps","kept","keys","kg","kh","ki","kind","km","kn","knew","know","known","knows","kp","kr","kw","ky","kz","l","la","large","largely","last","lately","later","latest","latter","latterly","lb","lc","least","length","less","lest","let","let's","lets","li","like","liked","likely","likewise","line","little","lk","ll","long","longer","longest","look","looking","looks","low","lower","lr","ls","lt","ltd","lu","lv","ly","m","ma","made","mainly","make","makes","making","man","many","may","maybe","mayn't","maynt","mc","md","me","mean","means","meantime","meanwhile","member","members","men","merely","mg","mh","microsoft","might","might've","mightn't","mightnt","mil","mill","million","mine","minus","miss","mk","ml","mm","mn","mo","more","moreover","most","mostly","move","mp","mq","mr","mrs","ms","msie","mt","mu","much","mug","must","must've","mustn't","mustnt","mv","mw","mx","my","myself","myse”","mz","n","na","name","namely","nay","nc","nd","ne","near","nearly","necessarily","necessary","need","needed","needing","needn't","neednt","needs","neither","net","netscape","never","neverf","neverless","nevertheless","new","newer","newest","next","nf","ng","ni","nine","ninety","nl","no","no-one","nobody","non","none","nonetheless","noone","nor","normally","nos","not","noted","nothing","notwithstanding","novel","now","nowhere","np","nr","nu","null","number","numbers","nz","o","obtain","obtained","obviously","of","off","often","oh","ok","okay","old","older","oldest","om","omitted","on","once","one","one's","ones","only","onto","open","opened","opening","opens","opposite","or","ord","order","ordered","ordering","orders","org","other","others","otherwise","ought","oughtn't","oughtnt","our","ours","ourselves","out","outside","over","overall","owing","own","p","pa","page","pages","part","parted","particular","particularly","parting","parts","past","pe","per","perhaps","pf","pg","ph","pk","pl","place","placed","places","please","plus","pm","pmid","pn","point","pointed","pointing","points","poorly","possible","possibly","potentially","pp","pr","predominantly","present","presented","presenting","presents","presumably","previously","primarily","probably","problem","problems","promptly","proud","provided","provides","pt","put","puts","pw","py","q","qa","que","quickly","quite","qv","r","ran","rather","rd","re","readily","really","reasonably","recent","recently","ref","refs","regarding","regardless","regards","related","relatively","research","reserved","respectively","resulted","resulting","results","right","ring","ro","room","rooms","round","ru","run","rw","s","sa","said","same","saw","say","saying","says","sb","sc","sd","se","sec","second","secondly","seconds","section","see","seeing","seem","seemed","seeming","seems","seen","sees","self","selves","sensible","sent","serious","seriously","seven","seventy","several","sg","sh","shall","shan't","shant","she","she'd","she'll","she's","shed","shell","shes","should","should've","shouldn","shouldn't","shouldnt","show","showed","showing","shown","showns","shows","si","side","sides","significant","significantly","similar","similarly","since","sincere","site","six","sixty","sj","sk","sl","slightly","sm","small","smaller","smallest","sn","so","some","somebody","someday","somehow","someone","somethan","something","sometime","sometimes","somewhat","somewhere","soon","sorry","specifically","specified","specify","specifying","sr","st","state","states","still","stop","strongly","su","sub","substantially","successfully","such","sufficiently","suggest","sup","sure","sv","sy","system","sz","t","t's","take","taken","taking","tc","td","tell","ten","tends","test","text","tf","tg","th","than","thank","thanks","thanx","that","that'll","that's","that've","thatll","thats","thatve","the","their","theirs","them","themselves","then","thence","there","there'd","there'll","there're","there's","there've","thereafter","thereby","thered","therefore","therein","therell","thereof","therere","theres","thereto","thereupon","thereve","these","they","they'd","they'll","they're","they've","theyd","theyll","theyre","theyve","thick","thin","thing","things","think","thinks","third","thirty","this","thorough","thoroughly","those","thou","though","thoughh","thought","thoughts","thousand","three","throug","through","throughout","thru","thus","til","till","tip","tis","tj","tk","tm","tn","to","today","together","too","took","top","toward","towards","tp","tr","tried","tries","trillion","truly","try","trying","ts","tt","turn","turned","turning","turns","tv","tw","twas","twelve","twenty","twice","two","tz","u","ua","ug","uk","um","un","under","underneath","undoing","unfortunately","unless","unlike","unlikely","until","unto","up","upon","ups","upwards","us","use","used","useful","usefully","usefulness","uses","using","usually","uucp","uy","uz","v","va","value","various","vc","ve","versus","very","vg","vi","via","viz","vn","vol","vols","vs","vu","w","want","wanted","wanting","wants","was","wasn","wasn't","wasnt","way","ways","we","we'd","we'll","we're","we've","web","webpage","website","wed","welcome","well","wells","went","were","weren","weren't","werent","weve","wf","what","what'd","what'll","what's","what've","whatever","whatll","whats","whatve","when","when'd","when'll","when's","whence","whenever","where","where'd","where'll","where's","whereafter","whereas","whereby","wherein","wheres","whereupon","wherever","whether","which","whichever","while","whilst","whim","whither","who","who'd","who'll","who's","whod","whoever","whole","wholl","whom","whomever","whos","whose","why","why'd","why'll","why's","widely","width","will","willing","wish","with","within","without","won","won't","wonder","wont","words","work","worked","working","works","world","would","would've","wouldn","wouldn't","wouldnt","ws","www","x","y","ye","year","years","yes","yet","you","you'd","you'll","you're","you've","youd","youll","young","younger","youngest","your","youre","yours","yourself","yourselves","youve","yt","yu","z","za","zero","zm","zr"];

  function extractMovieTextTracks(movieObj) {
    const movieId = movieObj.movieId;

    const usableTracks = [];
    // console.log('timedtexttracks', movieObj.timedtexttracks);
    for (const track of movieObj.timedtexttracks) {
      if (track.isForcedNarrative || track.isNoneTrack) {
        continue; // don't want these
      }

      if (!track.cdnlist || !track.cdnlist.length) {
        continue;
      }

      if (!track.ttDownloadables) {
        continue;
      }

      const webvttDL = track.ttDownloadables[WEBVTT_FMT];
      if (!webvttDL || !webvttDL.downloadUrls) {
        continue;
      }

      const bestUrl = getBestAvailableUrl({
        urls: webvttDL.downloadUrls,
        cdnList: track.cdnlist
      })

      if (!bestUrl) {
        continue;
      }

      const isClosedCaptions = track.rawTrackType === 'closedcaptions';

      usableTracks.push({
        id: track.new_track_id,
        language: track.language,
        languageDescription: track.languageDescription,
        bestUrl: bestUrl,
        isClosedCaptions: isClosedCaptions,
      });
    }

    // console.log('CACHING MOVIE TRACKS', movieId, usableTracks);
    trackListCache.set(movieId, usableTracks);
    renderAndReconcile();
  }

  function getBestAvailableUrl({ urls, cdnList }) {
    const { id: bestAvailableCDN } = cdnList.find((cdn) => urls[cdn.id])
    return urls[bestAvailableCDN]
  }

  function getSelectedTrackInfo() {
    if (!urlMovieId || !selectedTrackId) {
      throw new Error('Internal error, getSelectedTrackInfo called but urlMovieId or selectedTrackId is null');
    }
    const trackList = trackListCache.get(urlMovieId);
    const matchingTracks = trackList.filter(el => el.id === selectedTrackId);
    if (matchingTracks.length !== 1) {
      throw new Error('internal error, no matching track id');
    }
    return matchingTracks[0];
  }

  function handleSubsListSetOrChange(selectElem) {
    const trackId = selectElem.value;
    // console.log('selecting track', trackId);

    selectedTrackId = trackId;

    if (!selectedTrackId) {
      return;
    }

    const cacheKey = urlMovieId + '/' + selectedTrackId;
    if (!webvttCache.has(cacheKey)) {
      const trackInfo = getSelectedTrackInfo();
      const url = trackInfo.bestUrl;

      fetch(url).then(function(response) {
        if (response.ok) {
          return response.blob();
        }
        throw new Error('Bad response to WebVTT request');
      }).then(function(blob) {
        webvttCache.set(cacheKey, new Blob([blob], {type: 'text/vtt'})); // set type to avoid warning
        renderAndReconcile();
      }).catch(function(error) {
        console.error('Failed to fetch WebVTT file', error.message);
      });
    }

    // NOTE: We don't call renderAndReconcile here, caller should do it to avoid recursive loop bug
  }

  function enableDownloadButton() {
    const downloadButtonElem = document.getElementById(DOWNLOAD_BUTTON_ID);
    if (downloadButtonElem) {
      downloadButtonElem.style.color = 'black';
      downloadButtonElem.disabled = false;
    }
  }

  function disableDownloadButton() {
    const downloadButtonElem = document.getElementById(DOWNLOAD_BUTTON_ID);
    if (downloadButtonElem) {
      downloadButtonElem.style.color = 'grey';
      downloadButtonElem.disabled = true;
    }
  }

  function downloadSRT(blurred) { // if blurred = true, then download blurred version subtitles 
    function formatTime(t) {
      const date = new Date(0, 0, 0, 0, 0, 0, t*1000);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      const ms = date.getMilliseconds().toString().padStart(3, '0');

      return hours + ':' + minutes + ':' + seconds + ',' + ms;
    }

    const trackElem = document.getElementById(TRACK_ELEM_ID);
    if (!trackElem || !trackElem.track || !trackElem.track.cues) {
      return;
    }

    // Figure out video title
    const srtFilenamePieces = [];
    for (const elem of document.querySelectorAll('.video-title *')) {
      if (!elem.firstElementChild && elem.textContent) { // only get 'leaf' elements with text
        srtFilenamePieces.push(elem.textContent);
      }
    }
    let srcFilename;
    if (srtFilenamePieces.length) {
      srtFilename = srtFilenamePieces.join('-');
    } else {
      srtFilename = urlMovieId.toString(); // fallback in case UI changes
    }
    srtFilename += '_' + trackElem.track.language; // append language code
    srtFilename += '.srt';

    const srtChunks = [];
    let idx = 1;
    for (const cue of trackElem.track.cues) {
      let cleanedText = vttTextToSimple(cue.text, true);

      if (blurred) { cleanedText = vttTransformEasyRecursive(cleanedText); }

      srtChunks.push(idx + '\\n' + formatTime(cue.startTime) + ' --> ' + formatTime(cue.endTime) + '\\n' + cleanedText + '\\n\\n');
      idx++;
    }

    const srtBlob = new Blob(srtChunks, { type: 'text/srt' });
    const srtUrl = URL.createObjectURL(srtBlob);

    const tmpElem = document.createElement('a');
    tmpElem.setAttribute('href', srtUrl);
    tmpElem.setAttribute('download', srtFilename);
    tmpElem.style.display = 'none';
    document.body.appendChild(tmpElem);
    tmpElem.click();
    document.body.removeChild(tmpElem);
  }

  function updateToggleDisplay() {
    const buttomElem = document.getElementById(TOGGLE_DISPLAY_BUTTON_ID);
    if (buttomElem) {
      if (showSubsState) {
        buttomElem.textContent = 'Hide Subs [S]';
      } else {
        buttomElem.textContent = 'Show Subs [S]';
      }
    }
    const subsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);
    if (subsElem) {
      if (showSubsState) {
        subsElem.style.visibility = 'visible';
      } else {
        subsElem.style.visibility = 'hidden';
      }
    }
  }

  function renderAndReconcile() {
    function addSubsList(tracks) {
      const toggleDisplayButtonElem = document.createElement('button');
      toggleDisplayButtonElem.id = TOGGLE_DISPLAY_BUTTON_ID;
      toggleDisplayButtonElem.style.cssText = 'margin: 5px; border: none; color: black; width: 8em';
      toggleDisplayButtonElem.addEventListener('click', function(e) {
        e.preventDefault();
        showSubsState = !showSubsState;
        updateToggleDisplay();
      }, false);

      const selectElem = document.createElement('select');
      selectElem.style.cssText = 'color: black; margin: 5px';
      selectElem.addEventListener('change', function(e) {
        handleSubsListSetOrChange(e.target);
        renderAndReconcile();
      }, false);

      let firstCCTrackId;
      for (const track of tracks) {
        const optElem = document.createElement('option');
        optElem.value = track.id;
        optElem.textContent = track.languageDescription + (track.isClosedCaptions ? ' [CC]' : '');
        selectElem.appendChild(optElem);

        if (track.isClosedCaptions && !firstCCTrackId) {
          firstCCTrackId = track.id;
        }
      }
      if (firstCCTrackId) {
        selectElem.value = firstCCTrackId;
      }

      const downloadButtonElem = document.createElement('button');
      downloadButtonElem.id = DOWNLOAD_BUTTON_ID;
      downloadButtonElem.textContent = 'Download SRT';
      downloadButtonElem.style.cssText = 'margin: 5px; border: none';
      downloadButtonElem.addEventListener('click', function(e) {
        e.preventDefault();
        // console.log('download click');
        downloadSRT(e.ctrlKey);
      }, false);

      const panelElem = document.createElement('div');
      panelElem.style.cssText = 'position: absolute; z-index: 1000; top: 0; right: 0; font-size: 16px; color: white';
      panelElem.appendChild(toggleDisplayButtonElem);
      panelElem.appendChild(selectElem);
      panelElem.appendChild(downloadButtonElem);

      const containerElem = document.createElement('div');
      containerElem.id = SUBS_LIST_ELEM_ID;
      containerElem.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; right: 0; bottom: 0; left: 0';
      containerElem.appendChild(panelElem);

      document.body.appendChild(containerElem);

      updateToggleDisplay();
      disableDownloadButton();

      handleSubsListSetOrChange(selectElem);
    }

    function removeSubsList() {
      const el = document.getElementById(SUBS_LIST_ELEM_ID);
      if (el) {
        el.remove();
      }
    }

    function addTrackElem(videoElem, blob, srclang) {
      const trackElem = document.createElement('track');
      trackElem.id = TRACK_ELEM_ID;
      trackElem.src = URL.createObjectURL(blob);
      trackElem.kind = 'subtitles';
      trackElem.default = true;
      trackElem.srclang = srclang;
      videoElem.appendChild(trackElem);
      trackElem.track.mode = 'hidden'; // this can only be set after appending

      trackElem.addEventListener('load', function() {
        enableDownloadButton();
      }, false);

      const customSubsElem = document.createElement('div');
      customSubsElem.id = CUSTOM_SUBS_ELEM_ID;
      customSubsElem.style.cssText = 'position: absolute; bottom: 20vh; left: 0; right: 0; color: white; font-size: 3vw; text-align: center; user-select: text; -moz-user-select: text; z-index: 100; pointer-events: none';

      trackElem.addEventListener('cuechange', function(e) {
        // Remove all children
        while (customSubsElem.firstChild) {
          customSubsElem.removeChild(customSubsElem.firstChild);
        }

        const track = e.target.track;
        // console.log('active now', track.activeCues);
        for (const cue of track.activeCues) {
          const cueElem = document.createElement('div');
          cueElem.style.cssText = 'background: rgba(0,0,0,0.8); white-space: pre-wrap; padding: 0.2em 0.3em; margin: 10px auto; width: fit-content; width: -moz-fit-content; pointer-events: auto';

          var simpleText = vttTextToSimple(cue.text, true); // may contain simple tags like <i> etc.
          cueElem.innerHTML = makeTextBlurred(simpleText);  // for language practice make some part of the text not visible
          customSubsElem.appendChild(cueElem);
        }
      }, false);

      // Appending this to the player rather than the document fixes some issues:
      // 1) Clicking on subtitle text doesn't take focus (keyboard events) away from player
      // 2) Hover on subtitle prevents the "sleep" title screen from coming up, which is nice
      const playerElem = document.querySelector('.NFPlayer');
      if (!playerElem) {
        throw new Error("Couldn't find player element to append subtitles to");
      }
      playerElem.appendChild(customSubsElem);

      updateToggleDisplay();
    }

    function removeTrackElem() {
      const trackElem = document.getElementById(TRACK_ELEM_ID);
      if (trackElem) {
        trackElem.remove();
      }

      const customSubsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);
      if (customSubsElem) {
        customSubsElem.remove();
      }

      disableDownloadButton();
    }

    // Determine what subs list should be
    if (urlMovieId && (document.readyState === 'complete') && trackListCache.has(urlMovieId)) {
      targetSubsList = trackListCache.get(urlMovieId);
    } else {
      targetSubsList = null;
    }

    // Reconcile DOM if necessary
    if (targetSubsList !== displayedSubsList) {
      // console.log('updating subs list DOM', targetSubsList, displayedSubsList);

      removeSubsList();
      if (targetSubsList) {
        addSubsList(targetSubsList);
      }

      displayedSubsList = targetSubsList;
    }

    // Determine what subs blob should be
    const videoElem = document.querySelector('video');
    if (urlMovieId && selectedTrackId && videoElem) {
      const cacheKey = urlMovieId + '/' + selectedTrackId;
      if (webvttCache.has(cacheKey)) {
        targetTrackBlob = webvttCache.get(cacheKey);
      } else {
        targetTrackBlob = null;
      }
    } else {
      targetTrackBlob = null;
    }

    // Reconcile DOM if necessary
    if (targetTrackBlob !== displayedTrackBlob) {
      // console.log('need to update track blob', targetTrackBlob, displayedTrackBlob);

      removeTrackElem();
      if (targetTrackBlob) {
        // NOTE: super hacky to get the language code this way
        const languageCode = getSelectedTrackInfo().language;
        addTrackElem(videoElem, targetTrackBlob, languageCode);
      }

      displayedTrackBlob = targetTrackBlob;
    }
  }

  function isSubtitlesProperty(key, value) {
    return key === 'profiles' || value.some(item => NETFLIX_PROFILES.includes(item))
  }

  function findSubtitlesProperty(obj) {
    for (let key in obj) {
      let value = obj[key];
      if (Array.isArray(value)) {
          if (isSubtitlesProperty(key, value)) {
              return value;
          }
      }
      if (typeof value === 'object') {
        const prop = findSubtitlesProperty(value);
        if (prop) {
            return prop;
        }
      }
    }
    return null;
  }

  const originalStringify = JSON.stringify;
  JSON.stringify = function(value) {
    // Don't hardcode property names here because Netflix
    // changes them a lot; search instead
    let prop = findSubtitlesProperty(value);
    if (prop) {
      prop.unshift(WEBVTT_FMT);
    }
    return originalStringify.apply(this, arguments);
  };

  const originalParse = JSON.parse;
  JSON.parse = function() {
    const value = originalParse.apply(this, arguments);
    if (value && value.result && value.result.movieId && value.result.timedtexttracks) {
      // console.log('parse', value);
      extractMovieTextTracks(value.result);
    }
    return value;
  }

  // Poll periodically to see if current movie has changed
  setInterval(function() {
    let videoId;
    const videoContainerElem = document.querySelector('.VideoContainer');
    if (videoContainerElem) {
      const dsetIdStr = videoContainerElem.dataset.videoid;
      if (dsetIdStr) {
        videoId = +dsetIdStr;
      }
    }

    urlMovieId = videoId;
    if (!urlMovieId) {
      selectedTrackId = null;
    }

    renderAndReconcile();
  }, POLL_INTERVAL_MS);

  document.body.addEventListener('keydown', function(e) {
    if ((e.keyCode === 67) && !e.altKey && !e.ctrlKey && !e.metaKey) { // unmodified C key
      // console.log('copying subs text to clipboard');
      const subsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);
      if (subsElem) {
        const pieces = [];
        for (child of [...subsElem.children]) {
          pieces.push(child.textContent); // copy as plain text
        }
        const text = pieces.join('\\n');
        navigator.clipboard.writeText(text);
      }
    } else if ((e.keyCode === 83) && !e.altKey && !e.ctrlKey && !e.metaKey) { // unmodified S key
      const el = document.getElementById(TOGGLE_DISPLAY_BUTTON_ID);
      if (el) {
        el.click();
      }
    }
  }, false);

  let hideSubsListTimeout;
  function hideSubsListTimerFunc() {
    const el = document.getElementById(SUBS_LIST_ELEM_ID);
    if (el) {
      el.style.display = 'none';
    }
    hideSubsListTimeout = null;
  }

  document.body.addEventListener('mousemove', function(e) {
    // If there are any popups, make sure our subs don't block mouse events
    const subsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);
    if (subsElem) {
      const popup = document.querySelector('.popup-content');
      if (popup) {
        subsElem.style.display = 'none';
      } else {
        subsElem.style.display = 'block';
      }
    }

    // Show subs list and update timer to hide it
    const subsListElem = document.getElementById(SUBS_LIST_ELEM_ID);
    if (subsListElem) {
      subsListElem.style.display = 'block';
    }
    if (hideSubsListTimeout) {
      clearTimeout(hideSubsListTimeout);
    }
    hideSubsListTimeout = setTimeout(hideSubsListTimerFunc, 3000);
  }, false);
})();
`;
document.head.insertBefore(scriptElem, document.head.firstChild);

// console.log('content script finished');
