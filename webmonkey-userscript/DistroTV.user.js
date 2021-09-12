// ==UserScript==
// @name         DistroTV
// @description  Watch videos in external player.
// @version      1.0.0
// @match        *://distro.tv/*
// @match        *://*.distro.tv/*
// @icon         https://distro.tv/img/favicon.ico
// @run-at       document-end
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @homepage     https://github.com/warren-bank/crx-DistroTV/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-DistroTV/issues
// @downloadURL  https://github.com/warren-bank/crx-DistroTV/raw/webmonkey-userscript/es5/webmonkey-userscript/DistroTV.user.js
// @updateURL    https://github.com/warren-bank/crx-DistroTV/raw/webmonkey-userscript/es5/webmonkey-userscript/DistroTV.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// ----------------------------------------------------------------------------- constants

var user_options = {
  "redirect_to_webcast_reloaded": true,
  "force_http":                   true,
  "force_https":                  false
}

var strings = {
  "heading_filters":     "Filter Channels",
  "label_type":          "By Type:",
  "types": {
    "live_stream":       "Live Stream",
    "on_demand":         "On Demand"
  },
  "default_type":        "Show All",
  "label_name":          "By Name:",
  "button_filter":       "Apply",

  "heading_tools":       "Tools",
  "button_expand_all":   "Expand All",
  "button_collapse_all": "Collapse All",
  "button_clear_cache":  "Clear Persistent Cache",
  "button_reload":       "Reload",

  "heading_epg":         "Live Stream EPG",
  "label_epg_from":      "From:",
  "label_epg_to":        "To:",
  "button_download_epg": "Load/Refresh",

  "button_start_video":  "Start Video",

  "episode_labels": {
    "title":             "title:",
    "summary":           "summary:",
    "time_start":        "starts at:",
    "time_stop":         "ends at:",
    "time_duration":     "duration:"
  },
  "episode_units": {
    "duration_hour":     "hour",
    "duration_hours":    "hours",
    "duration_minutes":  "minutes"
  },
  "cache_units": {
    "item":              "item",
    "items":             "items"
  }
}

var constants = {
  "title":               "DistroTV",
  "target_url": {
    "pathname":          "/terms_of_use/"
  },
  "base_url": {
    "href":              "https://www.distro.tv/"
  },
  "dom_ids": {
    "div_root":          "DistroTV_EPG",
    "div_filters":       "EPG_filters",
    "div_tools":         "EPG_tools",
    "div_data":          "EPG_data",
    "select_type":       "channel_types",
    "text_query":        "channel_search_query"
  },
  "dom_classes": {
    "data_loaded":       "loaded",
    "toggle_collapsed":  "collapsible_state_closed",
    "toggle_expanded":   "collapsible_state_opened",
    "div_heading":       "heading",
    "div_toggle":        "toggle_collapsible",
    "div_collapsible":   "collapsible",
    "div_controls":      "EPG_controls",
    "select_epg_from":   "epg_from",
    "select_epg_to":     "epg_to",
    "div_episodes":      "episodes",
    "div_webcast_icons": "icons-container"
  },
  "img_urls": {
    "icon_expand":                    "https://github.com/warren-bank/crx-DistroTV/raw/webmonkey-userscript/es5/webmonkey-userscript/img/white.arrow_drop_down_circle.twotone.png",
    "icon_collapse":                  "https://github.com/warren-bank/crx-DistroTV/raw/webmonkey-userscript/es5/webmonkey-userscript/img/white.expand_less.round.png",
    "icon_delete":                    "https://github.com/warren-bank/crx-DistroTV/raw/webmonkey-userscript/es5/webmonkey-userscript/img/white.delete_forever.twotone.png",
    "icon_refresh":                   "https://github.com/warren-bank/crx-DistroTV/raw/webmonkey-userscript/es5/webmonkey-userscript/img/white.refresh.baseline.png",
    "base_webcast_reloaded_icons":    "https://github.com/warren-bank/crx-webcast-reloaded/raw/gh-pages/chrome_extension/2-release/popup/img/"
  },
  "cache_keys": {
    "epg_data":          "epg_data",
    "epg_data_count":    "epg_data_count"
  }
}

// ----------------------------------------------------------------------------- cache: channels data

var channels_data_cache = {
  data: null,
  initialize_data: function() {
    channels_data_cache.data = {
      "live_stream": [],    // {channel: {title, description, video_url, epg_id}}
      "on_demand":   []     // {channel: {title, description}, episodes: [{title, description, video_url, duration}]}
    }
  },
  is_persistent_storage_available: function() {
    return ((typeof GM_setValue === 'function') && (typeof GM_getValue === 'function'))
  },
  load_data_from_persistent_storage: function() {
    try {
      if (!channels_data_cache.is_persistent_storage_available()) throw ''

      var json = GM_getValue(constants.cache_keys.epg_data, '')
      if (!json) throw ''

      var data = JSON.parse(json)
      if ((typeof data !== 'object') || (data === null) || !Array.isArray(data.live_stream) || !Array.isArray(data.on_demand))
        throw ''
      if (!data.live_stream.length && !data.on_demand.length)
        throw ''

      channels_data_cache.data = data
      return true
    }
    catch(error) {
      return false
    }
  },
  save_data_to_persistent_storage: function() {
    try {
      if (!channels_data_cache.is_persistent_storage_available()) throw ''

      var json = JSON.stringify(channels_data_cache.data)
      GM_setValue(constants.cache_keys.epg_data, json)
      return true
    }
    catch(error) {
      return false
    }
  },
  get_item_count_in_persistent_storage: function() {
    try {
      if (!channels_data_cache.is_persistent_storage_available()) throw ''

      var count = GM_getValue(constants.cache_keys.epg_data_count, '')
      if (!count) return 0

      count = parseInt(count, 10)
      if (!count || isNaN(count)) return 0

      return count
    }
    catch(error) {
      return -1
    }
  },
  save_item_count_to_persistent_storage: function() {
    try {
      if (!channels_data_cache.is_persistent_storage_available()) throw ''

      var count = channels_data_cache.data.live_stream.length + channels_data_cache.data.on_demand.length
      GM_setValue(constants.cache_keys.epg_data_count, ('' + count))

      // fire an event that can be used to dynamically update the DOM
      unsafeWindow.postMessage({new_item_count_in_persistent_storage: count}, '*')

      return true
    }
    catch(error) {
      return false
    }
  },
  clear_persistent_storage: function() {
    try {
      if (!channels_data_cache.is_persistent_storage_available()) throw ''

      channels_data_cache.initialize_data()
      channels_data_cache.save_data_to_persistent_storage()
      channels_data_cache.save_item_count_to_persistent_storage()
      return true
    }
    catch(error) {
      return false
    }
  },
  update: function(data) {
    try {
      if (!channels_data_cache.is_persistent_storage_available()) throw ''

      if ((typeof data !== 'object') || (data === null) || !Array.isArray(data.live_stream) || !Array.isArray(data.on_demand))
        throw ''
      if (!data.live_stream.length && !data.on_demand.length)
        throw ''

      channels_data_cache.data = data
      channels_data_cache.save_data_to_persistent_storage()
      channels_data_cache.save_item_count_to_persistent_storage()
      return true
    }
    catch(error) {
      return false
    }
  }
}

// ----------------------------------------------------------------------------- helpers

// make GET request, parse JSON response, pass data to callback
var download_url = function(url, headers, callback, isJSON) {
  var xhr = new unsafeWindow.XMLHttpRequest()
  xhr.open("GET", url, true, null, null)

  if (headers && (typeof headers === 'object')) {
    var keys = Object.keys(headers)
    var key, val
    for (var i=0; i < keys.length; i++) {
      key = keys[i]
      val = headers[key]
      xhr.setRequestHeader(key, val)
    }
  }

  xhr.onload = function(e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          var text_data, json_data

          text_data = xhr.responseText

          if (isJSON) {
            json_data = JSON.parse(text_data)
            callback(json_data)
          }
          else {
            callback(text_data)
          }
        }
        catch(error) {
        }
      }
    }
  }

  xhr.send()
}

// -----------------------------------------------------------------------------

// https://stackoverflow.com/a/8888498
var get_12_hour_time_string = function(date, hour_padding) {
  if (!(date instanceof Date)) date = new Date()
  var hours = date.getHours()
  var minutes = date.getMinutes()
  var ampm = (hours >= 12) ? 'pm' : 'am'
  hours = hours % 12
  hours = hours ? hours : 12 // the hour '0' should be '12'
  hours = (hour_padding && (hours < 10)) ? (hour_padding + hours) : hours
  minutes = (minutes < 10) ? ('0' + minutes) : minutes
  return hours + ':' + minutes + ' ' + ampm
}

// -----------------------------------------------------------------------------

var convert_ms_to_mins = function(X) {
  // (X ms)(1 sec / 1000 ms)(1 min / 60 sec)
  return Math.ceil(X / 60000)
}

var get_ms_duration_time_string = function(ms) {
  var time_string = ''
  var mins = convert_ms_to_mins(ms)
  var hours

  if (mins >= 60) {
    hours       = Math.floor(mins / 60)
    time_string = hours + ' ' + ((hours < 2) ? strings.episode_units.duration_hour : strings.episode_units.duration_hours) + ', '
    mins        = mins % 60
  }

  return time_string + mins + ' ' + strings.episode_units.duration_minutes
}

// -----------------------------------------------------------------------------

var make_element = function(elementName, innerContent, isText) {
  var el = unsafeWindow.document.createElement(elementName)

  if (innerContent) {
    if (isText)
      el.innerText = innerContent
    else
      el.innerHTML = innerContent
  }

  return el
}

var make_span = function(text) {return make_element('span', text)}
var make_h4   = function(text) {return make_element('h4',   text)}

// -----------------------------------------------------------------------------

var string_contains = function(haystack, needle) {
  var index = haystack.toLowerCase().indexOf( needle.toLowerCase() )
  return (index >= 0)
}

var is_hls_url = function(video_url) {
  return string_contains(video_url, '.m3u8')
}

var is_mp4_url = function(video_url) {
  return string_contains(video_url, '.mp4')
}

// -----------------------------------------------------------------------------

var cdata = {
  str_start: '<![CDATA[',
  str_end:   ']]>',
  len_start: 9,
  len_end:   3
}

var sanitize_text = function(text) {
  if (!text || (typeof text !== 'string'))
    return ''

  text = text.trim()

  if (
       (text.length >= (cdata.len_start + cdata.len_end))
    && (text.substring(0, cdata.len_start) === cdata.str_start)
    && (text.substring(text.length - cdata.len_end, text.length) === cdata.str_end)
  ) {
    text = text.substring(cdata.len_start, text.length - cdata.len_end)
  }

  text = text.replace(/[<]/g, '&lt;')
  text = text.replace(/[>]/g, '&gt;')
  text = text.trim()

  return text
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, vtt_url, referer_url, force_http, force_https) {
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.force_https

  var encoded_video_url, encoded_vtt_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     = encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
  referer_url           = referer_url ? referer_url : constants.base_url.href
  encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))

  webcast_reloaded_base = {
    "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
    "http":  "http://webcast-reloaded.surge.sh/index.html"
  }

  webcast_reloaded_base = (force_http)
                            ? webcast_reloaded_base.http
                            : (force_https)
                               ? webcast_reloaded_base.https
                               : (video_url.toLowerCase().indexOf('http:') === 0)
                                  ? webcast_reloaded_base.http
                                  : webcast_reloaded_base.https

  webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_video_url + (encoded_vtt_url ? ('/subtitle/' + encoded_vtt_url) : '') + '/referer/' + encoded_referer_url
  return webcast_reloaded_url
}

var get_webcast_reloaded_url_chromecast_sender = function(video_url, vtt_url, referer_url) {
  return get_webcast_reloaded_url(video_url, vtt_url, referer_url, /* force_http= */ null, /* force_https= */ null).replace('/index.html', '/chromecast_sender.html')
}

var get_webcast_reloaded_url_airplay_sender = function(video_url, vtt_url, referer_url) {
  return get_webcast_reloaded_url(video_url, vtt_url, referer_url, /* force_http= */ true, /* force_https= */ false).replace('/index.html', '/airplay_sender.es5.html')
}

var get_webcast_reloaded_url_proxy = function(video_url, vtt_url, referer_url) {
  return get_webcast_reloaded_url(video_url, vtt_url, referer_url, /* force_http= */ true, /* force_https= */ false).replace('/index.html', '/proxy.html')
}

// ----------------------------------------------------------------------------- URL redirect

var redirect_to_url = function(url) {
  if (!url) return

  if (typeof GM_loadUrl === 'function') {
    if ((url[0] === '/') && (typeof GM_resolveUrl === 'function'))
      url = GM_resolveUrl(url, unsafeWindow.location.href)
    if (url.indexOf('http') === 0)
      GM_loadUrl(url, 'Referer', unsafeWindow.location.href)
  }
  else {
    try {
      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.window.location = url
    }
  }
}

var process_video_url = function(video_url, video_type, vtt_url, referer_url) {
  if (!referer_url)
    referer_url = constants.base_url.href

  if (typeof GM_startIntent === 'function') {
    // running in Android-WebMonkey: open Intent chooser

    var args = [
      /* action = */ 'android.intent.action.VIEW',
      /* data   = */ video_url,
      /* type   = */ video_type
    ]

    // extras:
    if (vtt_url) {
      args.push('textUrl')
      args.push(vtt_url)
    }
    if (referer_url) {
      args.push('referUrl')
      args.push(referer_url)
    }

    GM_startIntent.apply(this, args)
    return true
  }
  else if (user_options.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(video_url, vtt_url, referer_url))
    return true
  }
  else {
    return false
  }
}

var process_hls_url = function(hls_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ hls_url, /* video_type= */ 'application/x-mpegurl', vtt_url, referer_url)
}

var process_dash_url = function(dash_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ dash_url, /* video_type= */ 'application/dash+xml', vtt_url, referer_url)
}

var process_mp4_url = function(mp4_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ mp4_url, /* video_type= */ 'video/mp4', vtt_url, referer_url)
}

// ----------------------------------------------------------------------------- DOM: static skeleton

var reinitialize_dom = function() {
  var head = unsafeWindow.document.getElementsByTagName('head')[0]
  var body = unsafeWindow.document.body

  var html = {
    "head": [
      '<style>',

      // --------------------------------------------------- CSS: global

      'body {',
      '  background-color: #fff;',
      '  text-align: center;',
      '}',

      // --------------------------------------------------- CSS: EPG filters

      '#EPG_filters {',
      '}',

      '#EPG_filters > div {',
      '  margin: 1.25em 0;',
      '}',
      '#EPG_filters > div:first-child {',
      '  margin-top: 0;',
      '}',
      '#EPG_filters > div:last-child {',
      '  margin-bottom: 0;',
      '}',

      '#EPG_filters > div > h4 {',
      '  margin: 0;',
      '}',

      '#EPG_filters > div > input,',
      '#EPG_filters > div > select,',
      '#EPG_filters > div > button {',
      '  display: inline-block;',
      '  margin: 0px;',
      '}',

      '#EPG_filters > div > input,',
      '#EPG_filters > div > select {',
      '  margin-left: 0.75em;',
      '}',

      // --------------------------------------------------- CSS: EPG tools

      '#EPG_tools {',
      '}',

      '#EPG_tools > div {',
      '  margin: 1.25em 0;',
      '}',
      '#EPG_tools > div:first-child {',
      '  margin-top: 0;',
      '}',
      '#EPG_tools > div:last-child {',
      '  margin-bottom: 0;',
      '}',

      '#EPG_tools > div > h4 {',
      '  margin: 0;',
      '}',

      '#EPG_tools > div > button {',
      '  display: inline-block;',
      '  margin: 0px;',
      '}',
      '#EPG_tools > div > button + button {',
      '  margin-left: 1.25em;',
      '}',

      '#EPG_tools > div > button > * {',
      '  vertical-align: middle;',
      '}',
      '#EPG_tools > div > button > img {',
      '  display: inline-block;',
      '  background-color: #999;',
      '  margin-right: 0.5em;',
      '}',

      // --------------------------------------------------- CSS: EPG data

      '#EPG_data {',
      '  margin-top: 0.5em;',
      '  text-align: left;',
      '}',

      '#EPG_data > div {',
      '  border: 1px solid #333;',
      '}',

      '#EPG_data > div > div.heading {',
      '  position: relative;',
      '  z-index: 1;',
      '  overflow: hidden;',
      '}',

      '#EPG_data > div > div.heading > h2 {',
      '  display: block;',
      '  margin: 0;',
      '  margin-right: 94px;',
      '  background-color: #ccc;',
      '  padding: 0.25em;',
      '}',

      '#EPG_data > div > div.heading > div.toggle_collapsible {',
      '  display: block;',
      '  width: 94px;',
      '  background-color: #999;',
      '  position: absolute;',
      '  z-index: 1;',
      '  top: 0;',
      '  bottom: 0;',
      '  right: 0;',
      '  cursor: help;',
      '}',

      '#EPG_data > div > div.collapsible {',
      '  padding: 0.5em;',
      '}',

      '#EPG_data > div > div.collapsible > div.episodes > ul {',
      '  list-style: none;',
      '  margin: 0;',
      '  padding: 0;',
      '  padding-left: 1em;',
      '}',

      '#EPG_data > div > div.collapsible > div.episodes > ul > li {',
      '  list-style: none;',
      '  margin-top: 0.5em;',
      '  border-top: 1px solid #999;',
      '  padding-top: 0.5em;',
      '}',

      '#EPG_data > div > div.collapsible > div.episodes > ul > li > table td:first-child {',
      '  font-style: italic;',
      '  padding-right: 1em;',
      '}',

      '#EPG_data > div > div.collapsible > div.episodes > ul > li > blockquote {',
      '  display: block;',
      '  background-color: #eee;',
      '  padding: 0.5em 1em;',
      '  margin: 0;',
      '}',

      // --------------------------------------------------- CSS: EPG data (collapsible toggle state)

      '#EPG_data > div > div.heading > div.toggle_collapsible {',
      '  background-repeat: no-repeat;',
      '  background-position: center;',
      '}',

      '#EPG_data > div.collapsible_state_closed > div.heading > div.toggle_collapsible {',
      '  background-image: url("' + constants.img_urls.icon_expand + '");',
      '}',
      '#EPG_data > div.collapsible_state_closed > div.collapsible {',
      '  display: none;',
      '}',

      '#EPG_data > div.collapsible_state_opened > div.heading > div.toggle_collapsible {',
      '  background-image: url("' + constants.img_urls.icon_collapse + '");',
      '}',
      '#EPG_data > div.collapsible_state_opened > div.collapsible {',
      '  display: block;',
      '}',

      // --------------------------------------------------- CSS: EPG data (links to tools on Webcast Reloaded website)

      '#EPG_data > div > div.collapsible div.icons-container {',
      '  display: block;',
      '  position: relative;',
      '  z-index: 1;',
      '  float: right;',
      '  margin: 0.5em;',
      '  width: 60px;',
      '  height: 60px;',
      '  max-height: 60px;',
      '  vertical-align: top;',
      '  background-color: #d7ecf5;',
      '  border: 1px solid #000;',
      '  border-radius: 14px;',
      '}',

      '#EPG_data > div > div.collapsible div.icons-container > a.chromecast,',
      '#EPG_data > div > div.collapsible div.icons-container > a.chromecast > img,',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay,',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay > img,',
      '#EPG_data > div > div.collapsible div.icons-container > a.proxy,',
      '#EPG_data > div > div.collapsible div.icons-container > a.proxy > img,',
      '#EPG_data > div > div.collapsible div.icons-container > a.video-link,',
      '#EPG_data > div > div.collapsible div.icons-container > a.video-link > img {',
      '  display: block;',
      '  width: 25px;',
      '  height: 25px;',
      '}',

      '#EPG_data > div > div.collapsible div.icons-container > a.chromecast,',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay,',
      '#EPG_data > div > div.collapsible div.icons-container > a.proxy,',
      '#EPG_data > div > div.collapsible div.icons-container > a.video-link {',
      '  position: absolute;',
      '  z-index: 1;',
      '  text-decoration: none;',
      '}',

      '#EPG_data > div > div.collapsible div.icons-container > a.chromecast,',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay {',
      '  top: 0;',
      '}',
      '#EPG_data > div > div.collapsible div.icons-container > a.proxy,',
      '#EPG_data > div > div.collapsible div.icons-container > a.video-link {',
      '  bottom: 0;',
      '}',

      '#EPG_data > div > div.collapsible div.icons-container > a.chromecast,',
      '#EPG_data > div > div.collapsible div.icons-container > a.proxy {',
      '  left: 0;',
      '}',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay,',
      '#EPG_data > div > div.collapsible div.icons-container > a.video-link {',
      '  right: 0;',
      '}',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay + a.video-link {',
      '  right: 17px; /* (60 - 25)/2 to center when there is no proxy icon */',
      '}',

      // --------------------------------------------------- CSS: EPG data (live stream)

      '#EPG_data > div[x-channel-type="live_stream"] > div.heading > h2 {',
      '  color: blue;',
      '  cursor: pointer;',
      '}',

      '#EPG_data > div[x-channel-type="live_stream"].collapsible_state_opened > div.collapsible {',
      '  min-height: 80px;',
      '}',

      '#EPG_data > div[x-channel-type="live_stream"].collapsible_state_opened > div.collapsible > div.EPG_controls {',
      '  margin-top: 0.5em;',
      '  border-top: 1px solid #999;',
      '  padding-top: 0.5em;',
      '  text-align: center;',
      '}',

      '#EPG_data > div[x-channel-type="live_stream"].collapsible_state_opened > div.collapsible > div.EPG_controls > h4 {',
      '  margin: 0.5em 0;',
      '}',

      '#EPG_data > div[x-channel-type="live_stream"].collapsible_state_opened > div.collapsible > div.EPG_controls > select {',
      '  font-family: monospace;',
      '}',

      // --------------------------------------------------- CSS: EPG data (on demand)

      '#EPG_data > div[x-channel-type="on_demand"] > div.collapsible > div.episodes > ul > li > table {',
      '  min-height: 80px;',
      '}',

      '#EPG_data > div[x-channel-type="on_demand"] > div.collapsible > div.episodes > ul > li > button {',
      '  margin: 0.75em 0;',
      '}',

      '#EPG_data > div[x-channel-type="on_demand"] > div.collapsible > div.episodes > ul > li > div.icons-container {',
      '}',

      // --------------------------------------------------- CSS: separation between EPG sections

      '#DistroTV_EPG > #EPG_tools,',
      '#DistroTV_EPG > #EPG_data {',
      '  margin-top: 0.5em;',
      '  border-top: 1px solid #333;',
      '  padding-top: 0.5em;',
      '}',

      '#DistroTV_EPG > #EPG_filters,',
      '#DistroTV_EPG > #EPG_tools,',
      '#DistroTV_EPG > #EPG_data {',
      '  display: none;',
      '}',

      '#DistroTV_EPG.loaded > #EPG_filters,',
      '#DistroTV_EPG.loaded > #EPG_tools,',
      '#DistroTV_EPG.loaded > #EPG_data {',
      '  display: block;',
      '}',

      '</style>'
    ],
    "body": [
      '<div id="DistroTV_EPG">',
      '  <div id="EPG_filters"></div>',
      '  <div id="EPG_tools"></div>',
      '  <div id="EPG_data"></div>',
      '</div>'
    ]
  }

  head.innerHTML = '' + html.head.join("\n")
  body.innerHTML = '' + html.body.join("\n")

  unsafeWindow.document.title = constants.title
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - filters

var active_filters = {
  "type":       "",
  "text_query": ""
}

var process_filters = function(type, text_query) {
  if ((active_filters.type === type) && (active_filters.text_query === text_query)) return

  active_filters.type       = type
  active_filters.text_query = text_query

  var EPG_data = unsafeWindow.document.getElementById(constants.dom_ids.div_data)
  var channel_divs = EPG_data.childNodes
  var channel_div, is_visible, channel_type, channel_name

  for (var i=0; i < channel_divs.length; i++) {
    channel_div = channel_divs[i]

    if (channel_div && (channel_div instanceof HTMLElement) && (channel_div.nodeName === 'DIV')) {
      is_visible = true

      if (is_visible && type) {
        channel_type = channel_div.getAttribute('x-channel-type')

        if (channel_type !== type)
          is_visible = false
      }

      if (is_visible && text_query) {
        channel_name = channel_div.getAttribute('x-channel-name')

        if (channel_name.indexOf(text_query) === -1)
          is_visible = false
      }

      channel_div.style.display = is_visible ? 'block' : 'none'
    }
  }
}

var onclick_filter_button = function() {
  var type       = unsafeWindow.document.getElementById(constants.dom_ids.select_type).value
  var text_query = unsafeWindow.document.getElementById(constants.dom_ids.text_query).value.toLowerCase()

  process_filters(type, text_query)
}

var make_filter_button = function() {
  var button = make_element('button')

  button.innerHTML = strings.button_filter
  button.addEventListener("click", onclick_filter_button)

  return button
}

var make_type_select_element = function() {
  var select = make_element('select')
  select.setAttribute('id', constants.dom_ids.select_type)
  return select
}

var make_text_query_input_element = function() {
  var input = make_element('input')
  input.setAttribute('id', constants.dom_ids.text_query)
  input.setAttribute('type', 'text')
  return input
}

var populate_type_select_filter = function() {
  var select = unsafeWindow.document.getElementById(constants.dom_ids.select_type)
  var option, keys, value, name

  select.innerHTML = ''

  option = make_element('option')
  option.setAttribute('selected', 'selected')
  option.setAttribute('value', '')
  option.innerHTML = strings.default_type
  select.appendChild(option)

  keys = Object.keys(strings.types)
  if (!keys || !Array.isArray(keys) || !keys.length) return

  for (var i=0; i < keys.length; i++) {
    value = keys[i]
    name  = strings.types[value]

    if (value && name) {
      option = make_element('option')
      option.setAttribute('value', value)
      option.innerHTML = name
      select.appendChild(option)
    }
  }
}

var populate_dom_filters = function() {
  var select_type     = make_type_select_element()
  var text_query      = make_text_query_input_element()
  var filter_button   = make_filter_button()
  var EPG_filters     = unsafeWindow.document.getElementById(constants.dom_ids.div_filters)
  var div

  EPG_filters.innerHTML  = ''

  div = make_element('div')
  div.appendChild(make_h4(strings.heading_filters))
  EPG_filters.appendChild(div)

  div = make_element('div')
  div.appendChild(make_span(strings.label_type))
  div.appendChild(select_type)
  EPG_filters.appendChild(div)

  div = make_element('div')
  div.appendChild(make_span(strings.label_name))
  div.appendChild(text_query)
  EPG_filters.appendChild(div)

  div = make_element('div')
  div.appendChild(filter_button)
  EPG_filters.appendChild(div)

  populate_type_select_filter()
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - tools

var process_expand_or_collapse_all_button = function(expand, exclude_filtered_channels) {
  var EPG_data = unsafeWindow.document.getElementById(constants.dom_ids.div_data)
  var channel_divs = EPG_data.childNodes
  var channel_div, is_expanded, is_filtered_channel

  for (var i=0; i < channel_divs.length; i++) {
    channel_div = channel_divs[i]
    is_expanded = channel_div.classList.contains(constants.dom_classes.toggle_expanded)

    // short-circuit if nothing to do
    if (is_expanded == expand) continue

    if (exclude_filtered_channels) {
      is_filtered_channel = (channel_div.style.display === 'none')

      // short-circuit if filtered/nonvisible channels are excluded
      if (is_filtered_channel) continue
    }

    channel_div.className = (expand)
      ? constants.dom_classes.toggle_expanded
      : constants.dom_classes.toggle_collapsed
  }
}

var onclick_expand_all_button = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=false;

  process_expand_or_collapse_all_button(true, false)
}

var onclick_collapse_all_button = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=false;

  process_expand_or_collapse_all_button(false, false)
}

var onclick_clear_cache_button = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=false;

  channels_data_cache.clear_persistent_storage()

  // enable the reload button
  var clear_cache_button = event.target
  var reload_button      = clear_cache_button.nextSibling

  if (reload_button instanceof HTMLButtonElement)
    reload_button.disabled = false
}

var onclick_reload_button = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=false;

  unsafeWindow.location.reload()
}

var make_expand_all_button = function() {
  var button = make_element('button')

  button.innerHTML = '<img src="' + constants.img_urls.icon_expand + '" /> ' + strings.button_expand_all
  button.addEventListener("click", onclick_expand_all_button)

  return button
}

var make_collapse_all_button = function() {
  var button = make_element('button')

  button.innerHTML = '<img src="' + constants.img_urls.icon_collapse + '" /> ' + strings.button_collapse_all
  button.addEventListener("click", onclick_collapse_all_button)

  return button
}

var make_clear_cache_button = function() {
  var is_enabled = channels_data_cache.is_persistent_storage_available()
  var item_count = channels_data_cache.get_item_count_in_persistent_storage()

  var get_item_count_string = function(item_count) {
    if (item_count > 0)
      return ' (' + item_count + ' ' + ((item_count === 1) ? strings.cache_units.item : strings.cache_units.items) + ')'
    else
      return ''
  }

  var button = make_element('button')

  button.innerHTML = '<img src="' + constants.img_urls.icon_delete + '" /> ' + strings.button_clear_cache + get_item_count_string(item_count)

  if (is_enabled) {
    button.addEventListener("click", onclick_clear_cache_button)

    unsafeWindow.addEventListener('message', function(event) {
      if (event.data && (typeof event.data === 'object') && (typeof event.data.new_item_count_in_persistent_storage === 'number')) {
        var new_item_count = event.data.new_item_count_in_persistent_storage
        var html = button.innerHTML

        // update new item count
        html = html.replace(/ \(.*$/, '') + get_item_count_string(new_item_count)

        button.innerHTML = html
      }
    })
  }
  else {
    button.disabled = true
  }

  return button
}

var make_reload_button = function() {
  var button = make_element('button')

  button.innerHTML = '<img src="' + constants.img_urls.icon_refresh + '" /> ' + strings.button_reload
  button.addEventListener("click", onclick_reload_button)
  button.disabled = true

  return button
}

var populate_dom_tools = function() {
  var expand_all_button   = make_expand_all_button()
  var collapse_all_button = make_collapse_all_button()
  var clear_cache_button  = make_clear_cache_button()
  var reload_button       = make_reload_button()
  var EPG_tools           = unsafeWindow.document.getElementById(constants.dom_ids.div_tools)
  var div

  EPG_tools.innerHTML  = ''

  div = make_element('div')
  div.appendChild(make_h4(strings.heading_tools))
  EPG_tools.appendChild(div)

  div = make_element('div')
  div.appendChild(expand_all_button)
  div.appendChild(collapse_all_button)
  EPG_tools.appendChild(div)

  div = make_element('div')
  div.appendChild(clear_cache_button)
  div.appendChild(reload_button)
  EPG_tools.appendChild(div)
}

// ----------------------------------------------------------------------------- channels data: download, preprocess, save to cache

var fetch_channels_data = function() {
  var url = 'https://tv.jsrdn.com/tv_v5/getfeed.php'

  var callback = function(channels_data) {
    try {
      channels_data = preprocess_channels_data(channels_data)

      if (channels_data_cache.update(channels_data))
        process_channels_data()
    }
    catch(error) {}
  }

  download_url(url, null, callback, true)
}

var preprocess_channels_data = function(raw_data) {
  var preprocessed_data = {
    "live_stream": [],    // {channel: {title, description, video_url, epg_id}}
    "on_demand":   []     // {channel: {title, description}, episodes: [{title, description, video_url, duration}]}
  }

  if (
       (typeof raw_data       !== 'object') || (raw_data       === null)
    || (typeof raw_data.shows !== 'object') || (raw_data.shows === null)
  ) {
    return preprocessed_data
  }

  var sort_by_title = function(obj1, obj2) {
    var t1, t2

    t1 = (obj1.title || obj1.channel.title || '').toLowerCase()
    t2 = (obj2.title || obj2.channel.title || '').toLowerCase()

    return (t1 < t2)
      ? -1
      : (t1 > t2)
        ? 1
        : 0
  }

  var show_keys, show_key, show, is_live, channel, episodes, episode

  show_keys = Object.keys(raw_data.shows)

  for (var i1=0; i1 < show_keys.length; i1++) {
    show_key = show_keys[i1]
    show     = raw_data.shows[show_key]

    if ((typeof show !== 'object') || (show === null))
      continue

    is_live = (show.type === 'live')

    if (!show.title || !Array.isArray(show.seasons) || !show.seasons.length)
      continue
    if ((typeof show.seasons[0] !== 'object') || (show.seasons[0] === null))
      continue
    if (!Array.isArray(show.seasons[0].episodes) || !show.seasons[0].episodes.length)
      continue
    if ((typeof show.seasons[0].episodes[0] !== 'object') || (show.seasons[0].episodes[0] === null))
      continue

    if (is_live) {
      episode = show.seasons[0].episodes[0]

      if ((typeof episode.content !== 'object') || (episode.content === null) || !episode.content.url)
        continue
      if (!episode.id)
        continue

      channel = {
        title:       sanitize_text(show.title),
        description: sanitize_text(show.description),
        video_url:   episode.content.url,
        epg_id:      episode.id
      }

      preprocessed_data.live_stream.push({channel: channel})
    }
    else {
      channel = {
        title:       sanitize_text(show.title),
        description: sanitize_text(show.description)
      }

      episodes = []

      for (var i2=0; i2 < show.seasons[0].episodes.length; i2++) {
        episode = show.seasons[0].episodes[i2]

        if ((typeof episode.content !== 'object') || (episode.content === null) || !episode.content.url)
          continue
        if (!episode.title || !episode.content.duration)
          continue

        episodes.push({
          title:       sanitize_text(episode.title),
          description: sanitize_text(episode.description),
          video_url:   episode.content.url,
          duration:    (episode.content.duration * 1000)
        })
      }

      if (!episodes.length)
        continue

      episodes = episodes.sort(sort_by_title)

      preprocessed_data.on_demand.push({channel: channel, episodes: episodes})
    }
  }

  preprocessed_data.live_stream = preprocessed_data.live_stream.sort(sort_by_title)
  preprocessed_data.on_demand   = preprocessed_data.on_demand.sort(sort_by_title)

  return preprocessed_data
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - channels data

var populate_channels_data = function() {
  if (channels_data_cache.load_data_from_persistent_storage())
    process_channels_data()
  else
    fetch_channels_data()
}

// -----------------------------------------------------------------------------

var onclick_start_video = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=false;

  var node        = event.target
  var video_url   = node.getAttribute('x-video-url')
  var video_type  = node.getAttribute('x-video-type')
  var vtt_url     = node.getAttribute('x-vtt-url')
  var referer_url = node.getAttribute('x-referer-url')

  if (video_url) {
    if (!video_type)
      video_type = is_mp4_url(video_url) ? 'video/mp4' : 'application/x-mpegurl'

    process_video_url(video_url, video_type, vtt_url, referer_url)
  }
}

var onclick_channel_toggle = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=false;

  var toggle_div = event.target
  if (!toggle_div || !(toggle_div instanceof HTMLElement)) return

  var channel_div = toggle_div.parentNode.parentNode
  if (!channel_div || !(channel_div instanceof HTMLElement)) return

  channel_div.className = (channel_div.classList.contains(constants.dom_classes.toggle_expanded))
    ? constants.dom_classes.toggle_collapsed
    : constants.dom_classes.toggle_expanded
}

var make_episode_listitem_html = function(type, data) {
  var dates = {
    obj: {},
    str: {}
  }

  var temp

  if (data.start) {
    temp            = new Date(data.start)
    dates.obj.start = temp
    dates.str.start = temp.toLocaleDateString() + ' ' + get_12_hour_time_string(temp, '&nbsp;')
  }

  if (data.stop) {
    temp           = new Date(data.stop)
    dates.obj.stop = temp
    dates.str.stop = temp.toLocaleDateString() + ' ' + get_12_hour_time_string(temp, '&nbsp;')
  }

  if (data.duration) {
    dates.str.duration = get_ms_duration_time_string(data.duration)
  }

  var tr = []

  var append_tr = function(td, colspan) {
    if (Array.isArray(td))
      tr.push('<tr><td>' + td.join('</td><td>') + '</td></tr>')
    else if ((typeof colspan === 'number') && (colspan > 1))
      tr.push('<tr><td colspan="' + colspan + '">' + td + '</td></tr>')
    else
      tr.push('<tr><td>' + td + '</td></tr>')
  }

  if (data.title)
    append_tr([strings.episode_labels.title, data.title])
  if (dates.str.start)
    append_tr([strings.episode_labels.time_start, dates.str.start])
  if (dates.str.stop)
    append_tr([strings.episode_labels.time_stop, dates.str.stop])
  if (dates.str.duration)
    append_tr([strings.episode_labels.time_duration, dates.str.duration])
  if (data.description)
    append_tr(strings.episode_labels.summary, 2)

  var html = [
    '<table>' + tr.join("\n") + '</table>'
  ]

  if (data.description) {
    html.push(
      '<blockquote>' + data.description + '</blockquote>'
    )
  }

  if ((type === 'on_demand') && (data.video_url)) {
    html.push(
      '<button x-video-url="' + data.video_url + '">' + strings.button_start_video + '</button>'
    )
  }

  return '<li>' + html.join("\n") + '</li>'
}

var make_webcast_reloaded_div = function(video_url, referer_url) {
  var exclude_proxy = !is_hls_url(video_url)

  var webcast_reloaded_urls = {
//  "index":             get_webcast_reloaded_url(                  video_url, /* vtt_url= */ null, referer_url),
    "chromecast_sender": get_webcast_reloaded_url_chromecast_sender(video_url, /* vtt_url= */ null, referer_url),
    "airplay_sender":    get_webcast_reloaded_url_airplay_sender(   video_url, /* vtt_url= */ null, referer_url),
    "proxy":             get_webcast_reloaded_url_proxy(            video_url, /* vtt_url= */ null, referer_url)
  }

  var div = make_element('div')

  var html = [
    '<a target="_blank" class="chromecast" href="' + webcast_reloaded_urls.chromecast_sender + '" title="Chromecast Sender"><img src="'       + constants.img_urls.base_webcast_reloaded_icons + 'chromecast.png"></a>',
    '<a target="_blank" class="airplay" href="'    + webcast_reloaded_urls.airplay_sender    + '" title="ExoAirPlayer Sender"><img src="'     + constants.img_urls.base_webcast_reloaded_icons + 'airplay.png"></a>',
    '<a target="_blank" class="proxy" href="'      + webcast_reloaded_urls.proxy             + '" title="HLS-Proxy Configuration"><img src="' + constants.img_urls.base_webcast_reloaded_icons + 'proxy.png"></a>',
    '<a target="_blank" class="video-link" href="' + video_url                               + '" title="direct link to video"><img src="'    + constants.img_urls.base_webcast_reloaded_icons + 'video_link.png"></a>'
  ]

  if (exclude_proxy)
    delete html[2]

  div.setAttribute('class', constants.dom_classes.div_webcast_icons)
  div.innerHTML = html.join("\n")

  return div
}

var insert_webcast_reloaded_div = function(webcast_reloaded_div_parent, video_url, referer_url) {
  var webcast_reloaded_div = make_webcast_reloaded_div(video_url, referer_url)

  if (webcast_reloaded_div_parent.childNodes.length)
    webcast_reloaded_div_parent.insertBefore(webcast_reloaded_div, webcast_reloaded_div_parent.childNodes[0])
  else
    webcast_reloaded_div_parent.appendChild(webcast_reloaded_div)
}

var make_channel_div = function(type, data) {
  var episodes_map = make_episode_listitem_html.bind(null, type)
  var html, div, webcast_reloaded_div_parent
  var list_items, item, item_button

  switch(type) {
    case 'live_stream':
      html = [
        '<div class="' + constants.dom_classes.div_heading + '">',
        '  <h2 x-video-url="' + data.channel.video_url + '">' + data.channel.title + '</h2>',
        '  <div class="' + constants.dom_classes.div_toggle + '"></div>',
        '</div>',
        '<div class="' + constants.dom_classes.div_collapsible + '">',
        '  <div><p>' + data.channel.description + '</p></div>',
        '  <div class="' + constants.dom_classes.div_controls + '" x-epg-id="' + data.channel.epg_id + '"></div>',
        '  <div class="' + constants.dom_classes.div_episodes + '"></div>',
        '</div>'
      ]
      break
    case 'on_demand':
      if (Array.isArray(data.episodes) && data.episodes.length) {
        html = [
          '<div class="' + constants.dom_classes.div_heading + '">',
          '  <h2>' + data.channel.title + '</h2>',
          '  <div class="' + constants.dom_classes.div_toggle + '"></div>',
          '</div>',
          '<div class="' + constants.dom_classes.div_collapsible + '">',
          '  <div><p>' + data.channel.description + '</p></div>',
          '  <div class="' + constants.dom_classes.div_episodes + '">',
          '    <ul>' + data.episodes.map(episodes_map).join("\n") + '</ul>',
          '  </div>',
          '</div>'
        ]
      }
      break
    default:
      break
  }

  if (!html)
    return null

  div = make_element('div', html.join("\n"))

  div.setAttribute('class',          constants.dom_classes.toggle_collapsed)
  div.setAttribute('x-channel-type', type)
  div.setAttribute('x-channel-name', data.channel.title.toLowerCase())

  div.querySelector(':scope > div.' + constants.dom_classes.div_heading + ' > div.' + constants.dom_classes.div_toggle).addEventListener("click", onclick_channel_toggle)

  if (type === 'live_stream') {
    div.querySelector(':scope > div.' + constants.dom_classes.div_heading + ' > h2[x-video-url]').addEventListener("click", onclick_start_video)

    webcast_reloaded_div_parent = div.querySelector(':scope > div.' + constants.dom_classes.div_collapsible)

    insert_webcast_reloaded_div(webcast_reloaded_div_parent, data.channel.video_url)
  }

  if (type === 'on_demand') {
    list_items = div.querySelectorAll(':scope > div.' + constants.dom_classes.div_collapsible + ' > div.' + constants.dom_classes.div_episodes + ' > ul > li')

    for (var i=0; i < list_items.length; i++) {
      item        = list_items[i]
      item_button = item.querySelector(':scope > button[x-video-url]')

      item_button.addEventListener("click", onclick_start_video)

      insert_webcast_reloaded_div(item, item_button.getAttribute('x-video-url'))
    }
  }

  return div
}

// -----------------------------------------------------------------------------

var fetch_epg_data = function(div_controls, div_episodes) {
  var epg_id, epg_from, epg_to, url

  epg_id = div_controls.getAttribute('x-epg-id')
  if (!epg_id)
    return

  epg_from = div_controls.querySelector('select.' + constants.dom_classes.select_epg_from).value
  epg_to   = div_controls.querySelector('select.' + constants.dom_classes.select_epg_to  ).value

  url = 'https://tv.jsrdn.com/epg/query.php?id=' + epg_id + '&range='

  if ((epg_from === 'now') && (epg_to === 'now'))
    url += 'current'
  else
    url += epg_from + ',' + epg_to

  var callback = function(epg_data) {
    try {
      epg_data = preprocess_epg_data(epg_id, epg_data)

      process_epg_data(epg_data, div_episodes)
    }
    catch(error) {}
  }

  download_url(url, null, callback, true)
}

var preprocess_epg_data = function(epg_id, raw_data) {
  var episodes = []

  if (
       (typeof raw_data             !== 'object') || (raw_data             === null)
    || (typeof raw_data.epg         !== 'object') || (raw_data.epg         === null)
    || (typeof raw_data.epg[epg_id] !== 'object') || (raw_data.epg[epg_id] === null)
    || !Array.isArray(raw_data.epg[epg_id].slots) || !raw_data.epg[epg_id].slots.length
  ) {
    return episodes
  }

  var offset, episode, start, stop, duration

  if (
       (typeof raw_data.env !== 'object') || (raw_data.env === null)
    || !raw_data.env.st
  ) {
    offset = 0
  }
  else {
    offset = new Date() - new Date(raw_data.env.st)
  }

  for (var i=0; i < raw_data.epg[epg_id].slots.length; i++) {
    episode = raw_data.epg[epg_id].slots[i]

    if (
         (typeof episode !== 'object') || (episode === null)
      || !episode.title
    ) {
      continue
    }

    start    = episode.start   ? (new Date((new Date(episode.start)).getTime() + offset)) : null
    stop     = episode.end     ? (new Date((new Date(episode.end  )).getTime() + offset)) : null
    duration = (start && stop) ? (stop - start)                                           : null

    episodes.push({
      title:       sanitize_text(episode.title),
      description: sanitize_text(episode.description),
      start:       start,
      stop:        stop,
      duration:    duration
    })
  }

  return episodes
}

var process_epg_data = function(epg_data, div_episodes) {
  if (!Array.isArray(epg_data) || !epg_data.length)
    return

  var type, episodes_map, html

  type         = 'live_stream'
  episodes_map = make_episode_listitem_html.bind(null, type)
  html         = '<ul>' + epg_data.map(episodes_map).join("\n") + '</ul>'

  div_episodes.innerHTML = html
}

// -----------------------------------------------------------------------------

var make_epg_dom_controls = function() {
  var epg_options, html

  epg_options = []
  for (var i = -24; i <= 24; i++) {
    epg_options.push(
      (i === 0)
        ? ('<option value="now" selected="selected">now</option>')
        : ('<option value="' + i + 'h">now' + ((i < 0) ? ' - ' : ' + ') + ((Math.abs(i) < 10) ? '&nbsp;' : '') + Math.abs(i) + ' hours</option>')
    )
  }
  epg_options = epg_options.join("\n  ")

  html = [
    '<h4>' + strings.heading_epg + '</h4>',

    '<span>' + strings.label_epg_from + '</span>',
    '<select class="' + constants.dom_classes.select_epg_from + '">',
    '  ' + epg_options,
    '</select>',

    '<span>' + strings.label_epg_to + '</span>',
    '<select class="' + constants.dom_classes.select_epg_to + '">',
    '  ' + epg_options,
    '</select>',

    '<button>' + strings.button_download_epg + '</button>'
  ]
  html = html.join("\n")

  return html
}

var onclick_download_epg = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=false;

  var div_controls, div_episodes

  div_controls = event.target.parentNode
  div_episodes = div_controls.nextElementSibling

  fetch_epg_data(div_controls, div_episodes)
}

var populate_epg_dom_controls = function() {
  var div_controls  = unsafeWindow.document.querySelectorAll('#' + constants.dom_ids.div_data + ' > div > div.' + constants.dom_classes.div_collapsible + ' > div[x-epg-id].' + constants.dom_classes.div_controls)
  var html_controls = make_epg_dom_controls()
  var div

  for (var i=0; i < div_controls.length; i++) {
    div = div_controls[i]
    div.innerHTML = html_controls

    div.querySelector('button').addEventListener("click", onclick_download_epg)
  }
}

// -----------------------------------------------------------------------------

var process_channels_data = function() {
  var data     = channels_data_cache.data
  var EPG_root = unsafeWindow.document.getElementById(constants.dom_ids.div_root)
  var EPG_data = unsafeWindow.document.getElementById(constants.dom_ids.div_data)

  EPG_root.className = ''
  EPG_data.innerHTML = ''

  if ((typeof data !== 'object') || (data === null))
    return

  var channel_types = Object.keys(data)

  var channel_type, channel_list, channel_data, div

  for (var i1=0; i1 < channel_types.length; i1++) {
    channel_type = channel_types[i1]
    channel_list  = data[channel_type]

    if (!Array.isArray(channel_list) || !channel_list.length)
      continue

    for (var i2=0; i2 < channel_list.length; i2++) {
      channel_data = channel_list[i2]

      if ((typeof channel_data !== 'object') || (channel_data === null))
        continue

      div = make_channel_div(channel_type, channel_data)
      if (div)
        EPG_data.appendChild(div)
    }
  }

  populate_epg_dom_controls()

  EPG_root.className = constants.dom_classes.data_loaded
}

// ----------------------------------------------------------------------------- bootstrap

var init = function() {
  if (('function' === (typeof GM_getUrl)) && (GM_getUrl() !== unsafeWindow.location.href)) return

  var pathname = unsafeWindow.location.pathname

  if (pathname.indexOf(constants.target_url.pathname) === 0) {
    reinitialize_dom()
    populate_dom_filters()
    populate_dom_tools()
    populate_channels_data()
  }
  else {
    redirect_to_url(constants.target_url.pathname)
  }
}

init()

// -----------------------------------------------------------------------------
