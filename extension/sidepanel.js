// The hosted site currently sends X-Frame-Options: SAMEORIGIN, so Chrome
// refuses to embed it in an extension side panel. Use the local Vite app for
// unpacked-extension QA; a production package must point this at a deployment
// that explicitly allows framing from the extension origin.
const APP_URL = "http://localhost:5174/production-coach/"
const frame = document.getElementById("dr-zay-app")

if (frame instanceof HTMLIFrameElement) {
  const open = (context) => {
    const url = new URL(APP_URL)
    url.searchParams.set("extension", "1")
    if (typeof context?.project === "string" && context.project !== "") {
      url.searchParams.set("project", context.project)
    }
    frame.src = url.toString()
  }

  chrome.runtime.sendMessage({ type: "drzay:get-context" }, open)
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "drzay:ptt-toggle") {
      frame.contentWindow?.postMessage({ source: "dr-zay-extension", type: message.type }, new URL(APP_URL).origin)
    }
  })
}
