const APP_URL = "https://zaylegend.com/production-coach/"
const frame = document.getElementById("dr-zay-app")

if (frame instanceof HTMLIFrameElement) {
  frame.src = APP_URL
}
