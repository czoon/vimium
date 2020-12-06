// Fetch the Vimium secret, register the port received from the parent window, and stop listening for messages
// on the window object. vimiumSecret is accessible only within the current instance of Vimium.  So a
// malicious host page trying to register its own port can do no better than guessing.

var registerPort = function(event) {
  chrome.storage.local.get("vimiumSecret", function({vimiumSecret: secret}) {

    if ((event.source !== window.parent)) {
      return;
    }

    switch(typeof event.data){
      case "object":
        if(checkSecret(secret, event.data.vimiumSecret)) {
          if(event.data.chameleonCSS) {
            UIComponentServer.injectChameleonCSS(event.data.chameleonCSS);
            break;
          }
        }
        return;

      case "number":
        if(checkSecret(secret, event.data) == false) {
          return;
        }
        UIComponentServer.portOpen(event.ports[0]);
        break;
      
      default: 
        return;
    }

  });
};
window.addEventListener("message", registerPort);

var checkSecret = function(vimiumSecret, receivedSecret) {  
  if(vimiumSecret && receivedSecret && (vimiumSecret === receivedSecret)){
    return true;
  }
  return false;
};

var UIComponentServer = {
  ownerPagePort: null,
  handleMessage: null,

  portOpen(ownerPagePort) {
    this.ownerPagePort = ownerPagePort;
    this.ownerPagePort.onmessage = event => {
      if (this.handleMessage)
        return this.handleMessage(event);
    };
    this.registerIsReady();
  },

  registerHandler(handleMessage) {
    this.handleMessage = handleMessage;
  },

  postMessage(message) {
    if (this.ownerPagePort)
      this.ownerPagePort.postMessage(message);
  },

  hide() { this.postMessage("hide"); },

  injectChameleonCSS(receivedCSS){
    let chameleonCSS = document.createElement("style");
    chameleonCSS.type = "text/css";
    chameleonCSS.id = "chameleon-theme";
    chameleonCSS.innerHTML = receivedCSS;

    if(document.getElementById(chameleonCSS.id)){
      document.getElementById(chameleonCSS.id).remove();
    }

    document.head.append(chameleonCSS);
  },

  // We require both that the DOM is ready and that the port has been opened before the UI component is ready.
  // These events can happen in either order.  We count them, and notify the content script when we've seen
  // both.
  registerIsReady: (function() {
    let uiComponentIsReadyCount;
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", () => UIComponentServer.registerIsReady());
      uiComponentIsReadyCount = 0;
    } else {
      uiComponentIsReadyCount = 1;
    }

    return function() {
      if (++uiComponentIsReadyCount === 2) {
        if (window.frameId != null)
          this.postMessage({name: "setIframeFrameId", iframeFrameId: window.frameId});
        this.postMessage("uiComponentIsReady");
      }
    };
  })()
};

global.UIComponentServer = UIComponentServer;
