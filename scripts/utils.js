function toShiftDownTag(str) {
    let whiteList = `☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00A0`;
    whiteList += '⌘'
    whiteList += '\r\n\t\v\h'
    const escapedList = whiteList.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`([^${escapedList}]+)`, 'gu');
    return str.replace(regex, `<shift-down style="top: ${lang('FullWidthYOffset', false)}">$1</shift-down>`);
}

function isMacOS() {
    // return 1
    if (navigator.userAgent) return navigator.userAgent.indexOf('Mac') !== -1;
    if (navigator.platform) return navigator.platform.startsWith('Mac');
    return false;
}

function isSettingOpen() {
    const settingsDiv = document.getElementById('settings');
    return !(settingsDiv.style.display === 'none' || settingsDiv.style.display === '');
}

function isPreviewOpen() {
    const previewDiv = document.getElementById('preview');
    return !(previewDiv.style.display === 'none' || previewDiv.style.display === '');
}

function escapeHTML(str) {
    return str.replace(/[&<>'" ]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
            ' ': '&nbsp;',
        }[tag] || tag)
    );
}

const getCSSVar = (varName) => getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();

let getTabData = (data, tab = editorData.tab) => {
    return editorData.tabsData[tab][data];
}

let setTabData = (data, val, tab = editorData.tab) => {
    editorData.tabsData[tab][data] = val;
}

let getFontData = (data, tab = editorData.tab) => {
    let font = editorData.tabsData[tab].fontInfo;
    return font[data];
}

let setFontData = (data, val, tab = editorData.tab) => {
    let font = editorData.tabsData[tab].fontInfo;
    font[data] = val;
}

const isEditing = (tab = editorData.tab) => getTabData('mode', tab) !== 'normal';

const isDirty = (tab = editorData.tab) => {
    if (!isEditing(tab)) return false;
    const changed = getTabData('changedData', tab);
    const original = getFontData('data', tab)[getTabData('index', tab)];
    return changed !== original;
};


const isCharEmpty = (i, tab = editorData.tab) => !getFontData('data', tab)[i].includes('1');

const isProjDirty = (tab = editorData.tab) => {
    for (let i = 0; i < getFontData('data', tab).length; i++) {
        if (!isCharEmpty(i, tab)) return true;
    }
    return false;
};

const isAnyTabDirty = () => {
    for (let i = 0; i < editorData.tabsData.length; i++) {
        if (isDirty(i)) return true;
    }
    return false;
};

const isAnyProjDirty = () => {
    for (let i = 0; i < editorData.tabsData.length; i++) {
        if (isProjDirty(i)) return true;
    }
    return false;
};

const getEmptyData = (h = getFontData('height')) => "0".repeat(8 * h)

const reverse = data => data.replace(/[01]/g, (match) => (match === '1' ? '0' : '1'));

function setEmptyData(h, tab) {
    setFontData('height', h, tab);

    const emptyData = getEmptyData(h);

    if (isNaN(editorData.clipboard.height)) {
        editorData.clipboard.data = emptyData;
        editorData.clipboard.height = h;
    }

    for (let i = 0; i <= 255; i++) {
        getFontData('data', tab)[i] = emptyData;
    }

    openChar(getTabData('index'), true);
    updateAllPreviews();
    updatePreviewCanvas()
}
