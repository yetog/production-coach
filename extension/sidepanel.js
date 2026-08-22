const APP_URL = "https://zaylegend.com/production-coach/"
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
