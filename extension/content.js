/**
 * Dr. Zay push-to-talk content script (issue #55).
 *
 * Classic MV3 content script — it cannot import ES modules, so the event name
 * is inlined here. It MUST match PTT_EVENT in lib/protocol.js; a drift test
 * (protocol.drift.test.js) fails if the two ever diverge.
 *
 * Job: receive the background worker's toggle message and re-emit it as a
 * window event on the page, which the app's useExtensionPtt hook listens for.
 */
;(function () {
  var PTT_EVENT = "drzay:ptt-toggle"

  chrome.runtime.onMessage.addListener(function (message) {
    if (message && message.type === PTT_EVENT) {
      window.dispatchEvent(new CustomEvent(PTT_EVENT))
    }
  })
})()
