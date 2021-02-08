# Subfilter for Netflix

**Watch your favourite series on Netflix and improve foreign language at the same time.**

1. Install Subfilter Chrome+Firefox extension
2. Enjoy support of over 20 languages available on Netflix
3. Improve your listening skills


<a href="https://raw.githubusercontent.com/met/subfilter/master/img/subfilter-ui.png"><img src="https://github.com/met/subfilter/raw/master/img/subfilter-ui-small.png" alt="Screenshot of Subfilter User Interface"></a>


## Installation (for <a href="https://chrome.google.com/webstore/detail/subfilter-for-netflix/knglefkdmonaaodmfkipllpnjhoaelmn">Chrome</a>/<a href="https://addons.mozilla.org/cs/firefox/addon/subfilter/">Firefox</a>)

<a href="https://chrome.google.com/webstore/detail/subfilter-for-netflix/knglefkdmonaaodmfkipllpnjhoaelmn"><img src="https://user-images.githubusercontent.com/59498/105509797-2e9d2100-5cce-11eb-8f9c-937d3a0c4f44.png" alt="Install Subfilter for Google Chrome" title="Install Subfilter for Firefox"></a>  <a href="https://addons.mozilla.org/cs/firefox/addon/subfilter/"><img src="https://user-images.githubusercontent.com/59498/105511058-c3ece500-5ccf-11eb-9468-d33eb49e05ab.png" alt="Install Subfilter for Firefox" title="Install Subfilter for Firefox"></a>

- [Project details and Documentation](https://github.com/met/subfilter/wiki)
- [Changelog](https://github.com/met/subfilter/wiki/Changelog)
- [Support forum](https://github.com/met/subfilter/discussions)
- [Bug reports](https://github.com/met/subfilter/issues)

## Open-source

Subfilter is free and open-source software. 
All code is available under MIT license, except where otherwise stated.

## Based on Subadub project of Russel Simmons

This project is a modified version of ***[Subadub](https://github.com/rsimmons/subadub)*** browser extension, which is project of Russel Simmons. Without Rusells' code I would have never been able to create this project. Thank you Russel.

## Acknowledgment

- Part of this project code is from the original [Subadub extension](https://github.com/rsimmons/subadub). MIT License.
- The lists of stop words are from [Alir3z4/stop-words](https://github.com/Alir3z4/stop-words) (CC BY 4.0 License) and from [stopwords-iso](https://github.com/stopwords-iso/stopwords-iso) (MIT License).


## Wanted - How can you help
There are many ways how this can be project improved and you could be part of it. I am looking especially for:

- testers
- UX designers
- polyglots and language lovers
- language teachers
- learning scientists
- NLP (natural language processing) programmers

Please connect with me and stay it touch. You can do it in [Discussions](https://github.com/met/subfilter/discussions) or write me an e-mail (my email address is on my [profile page](https://github.com/met)).

## For Developers

### Process to Publish a New Version

- make changes to `dist/*`
- bump version number in `dist/manifest.json`
- (best to commit+push these changes, but not required)
- tag [new release](https://github.com/met/subfilter/releases/)
- update [Changelog](https://github.com/met/subfilter/wiki/Changelog)
- close finished [Milestone](https://github.com/met/subfilter/milestones), create a new Milestone and move any unfinished issues from the old Milestone to the new one
- run `archive.sh` to produce new `subadub.zip`
- upload `subadub.zip` to [Chrome Web Store](https://chrome.google.com/webstore/developer/dashboard) and [Firefox Add-on Developer Hub](https://addons.mozilla.org/en-US/developers/)
