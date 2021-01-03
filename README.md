# Subfilter for Netflix

This project is a modified version of ***Subadub*** browser extension. 
It helps with learning languages by watching Netflix movies. It is designed for language learners with a focus on practicing listening skills. 
Movie subtitles are displayed with some letters/words filtered out. This forces you to focus more on listening.
There are several subtitle modes, some easier, others more difficult, you can try which one suits your learning level.
Code is tested mainly with English and Spanish subtitles but could be used with most languages based on the Latin alphabet.
If it doesn't work correctly with your preferred language, you can open an issue and I can try to fix this.

All code is available under MIT license, except where otherwise stated.

Testers are wanted. Especially to test the project with more languages.

## Acknowledgment
- This project use code base on the original [Subadub extension](https://github.com/rsimmons/subadub). MIT License.
- The lists of stop words are from [Alir3z4/stop-words](https://github.com/Alir3z4/stop-words) project. CC BY 4.0 License and from [stopwords-iso](https://github.com/stopwords-iso/stopwords-iso). MIT License.
- For Spanish text is used [Lorca library](https://github.com/dmarman/lorca). MIT License.

# Subadub (original project of Russel Simmons)

Subadub is a browser extension for Chrome and Firefox that enhances Netflix subtitles for foreign language study.

- Subtitles are displayed as selectable text, so you can copy+paste them to make flash cards and look up words in a dictionary (e.g. using the Yomichan or Rikaikun extensions for Japanese)
- Full subtitles for a video can be downloaded in SRT format for personal study/review

## Installation

- [Subadub for Google Chrome](https://chrome.google.com/webstore/detail/subadub/jamiekdimmhnnemaaimmdahnahfmfdfk)
- [Subadub for Mozilla Firefox](https://addons.mozilla.org/en-US/firefox/addon/subadub/)

## Process to Publish a New Version

- make changes to dist/content_script.js
- bump version number in dist/manifest.json
- (best to commit+push these changes, but not required)
- run archive.sh to produce new subadub.zip
- upload subadub.zip to Chrome Web Store (https://chrome.google.com/webstore/developer/dashboard) and Firefox Add-on Developer Hub (https://addons.mozilla.org/en-US/developers/)
