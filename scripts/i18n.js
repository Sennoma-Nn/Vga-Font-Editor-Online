let currentLangData = {}

function lang(key, defaultValue, fw = true) {
    let r = currentLangData[key] ?? defaultValue;
    if (fw) return toFullWidthTag(r);
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

function toFullWidthTag(str) {
    let whiteList = `☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00A0`;
    whiteList += '\r\n\t\v\h'
    const escapedList = whiteList.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`([^${escapedList}]+)`, 'gu');
    return str.replace(regex, `<full-width style="top: ${lang('FullWidthOffset', '4px', false)}">$1</full-width>`);
}
