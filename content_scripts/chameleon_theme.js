/*
    Current known issues:
    - Youtube and another pages return sometimes rbga(0, 0, 0, 0) - transparent - when
        computedStyle is consulted.

    Pending:
    - Check impact on performance.
    - Reduce the number of the MutationObserver targets as much as possible.
*/

class ChameleonTheme {

    currentRGBStyle;

    constructor(){
        this.currentRGBStyle = this.getCalculatedBodyBackground();
        this.applyAdaptedHudCSS();
        this.handleChameleonTheme();

        this.handleChameleonTheme();
    }

    handleChameleonTheme() {
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
        //  Make a regular expression to extract the RBG colors,
        //  whether from an rgb or an rgba string.
        this.currentRGBStyle = this.getCalculatedBodyBackground();
        let rgb = this.currentRGBStyle.replace(/[^\d,]/g, '').split(',');

        //  We create a set of colors here
        let rgbStronger = this.getCalculatedRGB(rgb, 10);
        let rgbWeaker = this.getCalculatedRGB(rgb, -5);

        let injectedCSS = `
      #vomnibar input {
        background-color: DARK1 !important; 
      }
    `
            .replace("DARK1", rgbStronger)
            .replace("DARK2", rgbWeaker);

        let vimium_chameleon_style = document.createElement('style');
        vimium_chameleon_style.type = 'text/css';
        vimium_chameleon_style.innerHTML = injectedCSS;
        vimium_chameleon_style.id = 'vimium_chameleon_style';

        if (this.shadowDOM.append('vimium_chameleon_style')) {
            this.shadowDOM.append('vimium_chameleon_style').remove();
        }

        this.shadowDOM.appendChild(vimium_chameleon_style);
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

global.ChameleonTheme = ChameleonTheme;
console.log('dummy');