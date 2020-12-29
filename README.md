# Subadub - focus on listening edition

## My Changes to Subadub

This project ***Subadub focus on listening edition*** is a modified version of ***Subadub*** browser extension. 
It helps with learning languages by watching Netflix movies. It is designed for language learners with focus on practising listening skills. 
Movie subtitles are displayed with some letters/words missing. This force you to focus more on listening.
There are several subtitle modes, some more easy, others more difficult, you can try which one suits to your learning level.
Code is tested mainly with English and Spanish subtitles, but could be used with most of languages based on latin alphabet.
If it doesn't work correctly with your prefered language, you can open an issue and I can try to fix this.

All code is available under MIT licence, except where otherwise stated.

Testers are wanted. Especially to test project on more languages.

## Acknowledgment
- This project use code base of original [Subadub extension](https://github.com/rsimmons/subadub). MIT Licence.
- List of stop words are from [Alir3z4/stop-words](https://github.com/Alir3z4/stop-words) project. CC BY 4.0 Licence.
- For Spanish text is used [Lorca library](https://github.com/dmarman/lorca). MIT Licence.

# Subadub (original)

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
