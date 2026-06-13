let currentLangData = {}

function lang(key, defaultValue, callUni = true) {
    let r = currentLangData[key] || defaultValue;
    if (callUni) return toUniTag(r);
    return r;
}

async function loadLanguage() {
    const params = new URLSearchParams(window.location.search);
    const langCode = params.get('lang');

    const response = await fetch('scripts/local.json');
    const data = await response.json();
    if (data[langCode]) {
        currentLangData = data[langCode]
    }

}

function toUniTag(str) {
    let whiteList = `☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00A0`;
    whiteList += '\r\n\t\v\h'
    const escapedList = whiteList.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`([^${escapedList}]+)`, 'gu');
    return str.replace(regex, '<uni>$1</uni>');
}
