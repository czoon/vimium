/*
  This class allows the Vimium components to adapt their background colors
  to the one which is currently being shown in the browser.

  It is used in ui_component.js
*/

class ChameleonTheme {
/*
    Current known issues:
    - Youtube and another pages return sometimes rbga(0, 0, 0, 0) - transparent - when
        computedStyle is consulted.

    Pending:
    - Check impact on performance.
    - Reduce the number of the MutationObserver targets as much as possible.
*/

    handleChameleonTheme(port) {
        this.port = port;

        const chameleonCallBack = () => {
            this.checkDiff();
        }

        this.mutationObserver = new window.MutationObserver(chameleonCallBack);
        this.mutationObserver.observe(document.body, {
            attributes: true,
            childList: true,
            characterData: true,
            subtree: true,
            //attributeFilter: ["style"]  //  We need something more than just style
        });
    }

    getCalculatedBodyBackground() {
        return window.getComputedStyle(document.body)["backgroundColor"];
    }

    checkDiff() {
        if (this.currentRGBStyle != this.getCalculatedBodyBackground()) {
            this.applyAdaptedHudCSS();
        }
    }

    applyAdaptedHudCSS() {
        this.currentRGBStyle = this.getCalculatedBodyBackground();
        let rgb = this.currentRGBStyle.replace(/[^\d,]/g, '').split(',');

        //  We create a set of colors here
        let rgbStronger = this.getCalculatedRGB(rgb, 15);
        let rgbWeaker = this.getCalculatedRGB(rgb, -10);
        let rgbEmphasis = this.getCalculatedRGB(rgb, 30);

        let chameleonCSS = `
          #vomnibar input {
            background-color: ${rgbWeaker} !important; 
          }
          
          #vomnibar, #vomnibar .vomnibarSearchArea {
            background-color: ${rgbStronger} !important;
          }

          #vomnibar ul {
            background-color: ${rgbWeaker} !important;
          }

          .vomnibarSelected {
            background-color: ${rgbEmphasis} !important;
          }

          .vimiumHUDSearchArea{
            background-color: ${rgbWeaker} !important;
          }
        `;

          this.iframeElement.addEventListener("load", () => {
            console.log('loadListener chameleon_theme');
            chrome.storage.local.get("vimiumSecret", ({ vimiumSecret }) => {
                var componentMessage = {
                  "vimiumSecret" : vimiumSecret,
                  "chameleonCSS" : chameleonCSS
                };

                // I am afraid it's not possible to share ports between clases since
                // Javascript 'neuteres' them, therefore we have to declare a new one:
                // https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API
                const { port3, port4 } = new MessageChannel;

                this.iframeElement.contentWindow.postMessage(componentMessage, chrome.runtime.getURL(""), [ port3 ]);
            });
          });
    }

    getCalculatedRGB(rgb, tone) {
        let calcRGB = [];

        for (let i = 0; i < 3; i++) {
            calcRGB[i] = this.getColorTone(rgb[i], tone);
        }

        return "rgb(R, G, B)"
            .replace("R", calcRGB[0])
            .replace("G", calcRGB[1])
            .replace("B", calcRGB[2]);
    }

    //  We pass the percentage of color variation we want
    //  to create our diferent colors for our theme.
    getColorTone(intColor, tone) {
        let conversion = Math.min(Math.max(intColor, 10), 245);
        conversion += Math.round(conversion * (tone / 100));

        return Math.min(conversion, 245);
    }
}