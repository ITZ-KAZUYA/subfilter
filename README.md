# Subfilter for Netflix

With Subfilter you can improve your listening skills. If you watch movies with Subfilter every day you can feel results in 1-2 weeks.

[Subfilter for Netflix](https://github.com/met/subfilter/wiki) is a browser extension that helps you **practice your listening skills** by watching Netflix movies in a foreign language. Movie **subtitles** are displayed with some words **filtered out**. This helps you to focus on listening.

There are several subtitle filters, some easier, others more difficult. You can select the one that suits your learning level.

![Screenshot of Subfilter User Interface](https://github.com/met/subfilter/raw/master/img/subfilter-ui-small.png)

## Installation

- [Subfilter for Google Chrome](https://chrome.google.com/webstore/detail/subfilter-for-netflix/knglefkdmonaaodmfkipllpnjhoaelmn)
- [Subfilter for Mozilla Firefox](https://addons.mozilla.org/cs/firefox/addon/subfilter/)


[Check wiki](https://github.com/met/subfilter/wiki) for help and more information.

Subfilter is tested mainly with English and Spanish subtitles but *should work with every language based on the Latin alphabet* and on some non-Latin too.
If it doesn't work correctly with your preferred language, please open an [issue](https://github.com/met/subfilter/issues) or write me e-mail and I will try to fix it.

## Base on Subadub

This project is a modified version of ***[Subadub](https://github.com/rsimmons/subadub)*** browser extension, which is project of Russel Simmons. Without Rusells' code I would have never been able to create this project. Thank you Russel.

All code is available under MIT license, except where otherwise stated.

## Acknowledgment
- This project use code base on the original [Subadub extension](https://github.com/rsimmons/subadub). MIT License.
- The lists of stop words are from [Alir3z4/stop-words](https://github.com/Alir3z4/stop-words) project (CC BY 4.0 License) and from [stopwords-iso](https://github.com/stopwords-iso/stopwords-iso) (MIT License).


## Wanted - How can you help
There are many ways how can be this project improved and you could be part of it. I am looking especially for:

- testers
- UX designers
- polyglots and language lovers
- language teachers
- learning scientists
- NLP (natural language processing) programmers

Please connect with me and stay it touch. You can do it in [Discussions](https://github.com/met/subfilter/discussions) or write me an e-mail (my email address is on my [profile page](https://github.com/met).

## For Developers

### Process to Publish a New Version

- make changes to dist/content_script.js
- bump version number in dist/manifest.json
- (best to commit+push these changes, but not required)
- run archive.sh to produce new subadub.zip
- upload subadub.zip to Chrome Web Store (https://chrome.google.com/webstore/developer/dashboard) and Firefox Add-on Developer Hub (https://addons.mozilla.org/en-US/developers/)
