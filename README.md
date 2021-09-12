### [DistroTV](https://github.com/warren-bank/crx-DistroTV/tree/webmonkey-userscript/es5)

[Userscript](https://github.com/warren-bank/crx-DistroTV/raw/webmonkey-userscript/es5/webmonkey-userscript/DistroTV.user.js) to run in both:
* the [WebMonkey](https://github.com/warren-bank/Android-WebMonkey) application for Android
* the [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) web browser extension for Chrome/Chromium

Its purpose is to:
* provide a simplified interface to access video content hosted by [DistroTV](https://distro.tv/) that works in all web browsers
  - special attention is given to Android 4.x WebView, which is based on Chrome v30, to ensure support for older Android devices
* enable watching video content in an external player

#### Notes:

* all URLs for the [distro.tv](https://distro.tv/) domain are redirected to a single [target page](https://distro.tv/terms_of_use/)
  - chosen because its original content contains a minimal amount of script and style
* after the target page has been loaded
  - its original content is replaced by a new single-page app (SPA) that only requires ES5
* local storage is used to cache the following data:
  - list of all live channels
  - list of all on-demand video content
  - URLs to access all live channels and on-demand video content
* this cache can be cleared by the user, which enables the option to redownload (and subsequently cache) fresh data
* epg data for each live channel can be:
  - configured to specify the desired period of time
  - downloaded, but never cached
  - displayed with ability to manually refresh as-needed

#### Video Content Protections:

* access to the data API endoint and video hosts does _not_ depend upon:
  - HTTP request headers
    * such as:
      - _Cookie_ that may contain a website login session ID
      - _Referer_ that may indicate the website from which the request was made
    * consequently, video content will play directly on Chromecast

#### Legal:

* copyright: [Warren Bank](https://github.com/warren-bank)
* license: [GPL-2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt)
