let editorData = {
    tab: 0,
    menuMode: 'normal',
    tabsData: [
        {
            name: 'UNTITLED.RAW',
            index: 0,
            changedData: '',
            mode: 'normal',
            fontInfo: {
                height: 16,
                data: []
            }
        }
    ],
    inputmode: 'normal',
    stringInput: '',
    clipboard: {
        data: '',
        height: NaN
    }
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

async function resetCharsData(h) {
    if (isDirty()) {
        updateTitle(true);
        return;
    }

    setTabData('mode', 'normal');

    const proceed = await askIsAbandon();
    if (!proceed) return;

    setEmptyData(h);
}

function askIsAbandon() {
    return new Promise((resolve) => {
        if (isProjDirty()) {
            const abandonDiv = document.getElementById('menu-bar-warning-area');
            if (abandonDiv.querySelector('.menu-button')) {
                resolve(false);
                return;
            }

            abandonDiv.innerHTML = `
                <span style="color: var(--color-red)">&nbsp;${lang('WarnLost')}</span>
                <button class="menu-button" id="confirmYes">${lang('Yes')}</button>
                <button class="menu-button" id="confirmNo">${lang('No')}</button>
            `;

            const handleChoice = (choice) => {
                abandonDiv.innerHTML = '';
                resolve(choice);
            };

            document.getElementById('confirmYes').onclick = () => { if (!isDirty()) { handleChoice(true) } else { updateTitle(true) } };
            document.getElementById('confirmNo').onclick = () => { if (!isDirty()) { handleChoice(false) } else { updateTitle(true) } };
        } else resolve(true);
    });
}

function showError(message) {
    const errorDiv = document.getElementById('menu-bar-warning-area');
    errorDiv.innerHTML = `
        <span style="color: var(--color-red)">&nbsp;* Error: ${message}</span>
    `;
    setTimeout(() => {
        if (errorDiv.innerText.includes('Error:')) errorDiv.innerHTML = '';
    }, 2000);
}

function parseFontData(uint8) {
    let result = "";

    for (let i = 0; i < uint8.length; i++) {
        result += uint8[i].toString(2).padStart(8, '0');
    }

    let charLen = result.length / 256;
    if (charLen % 1 !== 0) {
        showError(lang('ErrorFont'));
        return false;
    }

    let fontHeight = charLen / 8;
    if (!(fontHeight > 0 && fontHeight <= 32)) {
        showError(lang('ErrorFont'));
        return false;
    }
    setFontData('height', fontHeight);

    for (let i = 0; i <= 255; i++) {
        let s = i * charLen;
        let e = (i + 1) * charLen;
        getFontData('data')[i] = result.slice(s, e);
    }

    updateAllPreviews();
    openChar(getTabData('index'), true);
    updateTabs();
    updatePreviewCanvas();

    if (editorData.inputmode === 'name') {
        editorData.inputmode = 'normal';
        updateTabs();
    }

    return true;
}

async function openFontFromURL(url) {
    if (isDirty()) {
        updateTitle(true);
        return;
    }

    setTabData('mode', 'normal');

    const proceed = await askIsAbandon();
    if (!proceed) return;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            showError(lang('ErrorFetch'));
            return;
        }

        const buffer = await response.arrayBuffer();
        const uint8 = new Uint8Array(buffer);

        if (!parseFontData(uint8)) return;

        const urlParts = url.split('/');
        const fontName = urlParts[urlParts.length - 1]
        setTabData('name', fontName);
        updateTabs()
    } catch (err) {
        showError(lang('ErrorFetch'));
    }
}

async function openFont() {
    if (isDirty()) {
        updateTitle(true);
        return;
    }

    setTabData('mode', 'normal');

    const proceed = await askIsAbandon();
    if (!proceed) return;

    const fileInput = document.getElementById('open-font-input');
    fileInput.click();

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);

        if (!parseFontData(uint8)) return;

        setTabData('name', file.name);
        updateTabs()

        fileInput.value = '';
    };
}

async function saveFont() {
    if (isDirty()) {
        updateTitle(true);
        return;
    }

    setTabData('mode', 'normal');

    const totalBytes = 256 * getFontData('height');
    const byteArray = new Uint8Array(totalBytes);

    for (let i = 0; i < 256; i++) {
        const charData = getFontData('data')[i];
        for (let row = 0; row < getFontData('height'); row++) {
            const rowString = charData.substring(row * 8, (row + 1) * 8);
            byteArray[i * getFontData('height') + row] = parseInt(rowString, 2);
        }
    }

    if ('showSaveFilePicker' in window) {
        try {
            const opts = {
                suggestedName: getTabData('name'),
                types: [{
                    description: 'VGA Bitmap Font File',
                    accept: { 'application/octet-stream': ['.RAW'] }
                }]
            };
            const fileHandle = await window.showSaveFilePicker(opts);
            const writable = await fileHandle.createWritable();
            await writable.write(byteArray);
            await writable.close();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
            }
        }
        return;
    }

    const blob = new Blob([byteArray], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = getTabData('name');

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function previewFont() {
    updatePreviewCanvas();
    const previewDiv = document.getElementById('preview');
    if (previewDiv.style.display === 'none' || previewDiv.style.display === '') {
        previewDiv.style.display = 'block';
    } else previewDiv.style.display = 'none'
}

function renameFont() {
    if (editorData.inputmode === 'name') {
        editorData.inputmode = 'normal';
        updateTabs();
        return;
    }

    if (editorData.inputmode === 'goto') cancelGoto();

    editorData.inputmode = 'name';
    editorData.stringInput = getTabData('name');
    updateTabs();
}

function debug() {
    console.log(editorData);
}

function updateMenu() {
    const menuBarButtonArea = document.getElementById('menu-bar-button-area');

    let actionButtons = '';

    switch (editorData.menuMode) {
        case 'normal':
            actionButtons = `
                <button class="menu-button" onclick="menuReset()">${lang('Reset')}</button>
                <button class="menu-button" onclick="renameFont()">${lang('Rename')}</button>
                <button class="menu-button" onclick="openFont()">${lang('Open')}</button>
                <button class="menu-button" onclick="saveFont()">${lang('Save')}</button>
                <button class="menu-button" onclick="previewFont()">${lang('Preview')}</button>
            `;
            break;
        case 'reset':
            actionButtons = `
                <button class="menu-button" onclick="resetCancelReset()">${lang('CancelReset')}</button>
                <span>|</span>
                <button class="menu-button" onclick="resetLoadTemplates()">${lang('LoadTemplates')}</button>
                <span>|&nbsp;</span>
                <span>${lang('Size')}:&nbsp;</span>
                <button class="menu-button" onclick="resetResetButton(16)">8x1<bright>6</bright>,</button>
                <button class="menu-button" onclick="resetResetButton(14)">8x1<bright>4</bright>,</button>
                <button class="menu-button" onclick="resetResetButton(8)">8x<bright>8</bright></button>
            `;
            break;
        case 'templates':
            actionButtons = `
                <button class="menu-button" onclick="templatesCancelLoadTemplates()">${lang('CancelLoadTemplates')}</button>
                <span>|&nbsp;</span>
                <span>${lang('Select')}:&nbsp;</span>
                <button class="menu-button" onclick="loadTemplatesFrom('IBM_8X16.RAW')"><bright>1</bright>.IBM_8X16,</button>
                <button class="menu-button" onclick="loadTemplatesFrom('QUADBM_8X8.RAW')"><bright>2</bright>.QUADBM_8X8</button>
            `;
            break;
    }

    menuBarButtonArea.innerHTML = actionButtons;
}

function truncateText(text) {
    const maxLen = Number(lang('TruncateTextMaxLen'));
    if (text.length > maxLen) {
        return text.slice(0, maxLen).trim() + '...';
    }
    return text;
}

function shortName(text) {
    if (text.indexOf(' - ') !== -1) return text.split(' - ')[0].trim()
    if (text.indexOf(' (') !== -1) return text.split(' (')[0].trim()
    return text;
}

function updateTitle(isWarning = false) {
    const index = getTabData('index');
    const charTitle = document.getElementById('char-title');

    let descriptionsText = '';
    if (getTabData('mode') === 'normal') {
        descriptionsText = toFullWidthTag(truncateText(lang('CharDescriptions', false)[index]));
    } else if (getTabData('mode') === 'edit') {
        descriptionsText = toFullWidthTag(shortName((lang('CharDescriptions', false)[index])));
    }

    const descriptions = getTabData('mode') === 'normal' || getTabData('mode') === 'edit'
        ? `
            <span>&nbsp;#${index}:&nbsp;</span>
                <span style="color: var(--color-light-gray)" title="${lang('CharDescriptions', false)[index].replace(/"/g, '&quot;')}">
                    ${descriptionsText}
                </span>
            <span>&nbsp;&nbsp;|&nbsp;</span>
        ` : '';

    const saveTexts = isEditing() ? `
        <span>&nbsp;|&nbsp;&nbsp;</span>
        <span style="color: var(${isWarning ? '--color-brown' : '--color-white'})">${isWarning ? '* ' : ''}${lang('SaveQ')}</span>
        &nbsp;
        <button class="title-button" onclick="saveChanges()">${lang('Yes')}</button>
        <button class="title-button" onclick="undoChanges()">${lang('No')}</button>
    ` : '';

    let actionButtons = '';

    switch (getTabData('mode')) {
        case 'normal':
            const canPaste = isCharEmpty(getTabData('index'));
            actionButtons = `
                <button class="title-button" onclick="editChar()">${lang('Edit')}</button>
                <span>&nbsp;|&nbsp;</span>
                <button class="title-button" onclick="layerCopy()">${lang('Copy')}</button>
                ${canPaste
                    ? `<button class="title-button" onclick="layerPaste()">${lang('Paste')}</button>`
                    : `<span style="color:var(--color-dark-gray)">&nbsp;${lang('Paste')}&nbsp;</span>`
                }
            `;
            break;
        case 'edit':
            actionButtons = `
                <button class="title-button" onclick="editLayer()">${lang('Glyph')}</button>
                <button class="title-button" onclick="editTransform()">${lang('Transform')}</button>
                <button class="title-button" onclick="editShift()">${lang('Shift')}</button>
            `;
            break;
        case 'layer':
            actionButtons = `
                <button class="title-button" onclick="editBack()">${lang('Back')}</button>
                <span>&nbsp;|&nbsp;</span>
                <button class="title-button" onclick="layerCopy()">${lang('Copy')}</button>
                <button class="title-button" onclick="layerPaste()">${lang('Paste')}</button>
                <button class="title-button" onclick="layerClear()">${lang('Clear')}</button>
            `;
            break;
        case 'transform':
            actionButtons = `
                <button class="title-button" onclick="editBack()">${lang('Back')}</button>
                <span>&nbsp;|&nbsp;</span>
                <button class="title-button" onclick="transformReverse()">${lang('Reverse')}</button>
                <button class="title-button" onclick="transformFlipHorizontal()">${lang('FlipH')}</button>
                <button class="title-button" onclick="transformFlipVertical()">${lang('FlipV')}</button>
            `;
            break;
        case 'shift':
            actionButtons = `
                <button class="title-button" onclick="editBack()">${lang('Back')}</button>
                <span>&nbsp;|&nbsp;</span>
                <button class="title-button" onclick="shiftLeft()"><bright>←</bright></button>
                <button class="title-button" onclick="shiftDown()"><bright>↓</bright></button>
                <button class="title-button" onclick="shiftUp()"><bright>↑</bright></button>
                <button class="title-button" onclick="shiftRight()"><bright>→</bright></button>
            `
            break;
    }

    charTitle.innerHTML = `
        ${descriptions}${actionButtons}${saveTexts}
    `;
}

const getCSSVar = (varName) => getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();

function drawChar(ctx, i, x, y, fh) {
    const charData = getFontData('data')[i];
    if (!charData) return;

    const offsetX = (x - 1) * 8 * 2;
    const offsetY = (y - 1) * fh * 2;

    ctx.fillStyle = getCSSVar('color-white');

    for (let yy = 0; yy < fh; yy++) {
        for (let xx = 0; xx < 8; xx++) {
            const bitIndex = yy * 8 + xx;
            if (charData[bitIndex] === '1') {
                ctx.fillRect(offsetX + xx * 2, offsetY + yy * 2, 2, 2);
            }
        }
    }
}

function drawStr(ctx, str, x, y, fh) {
    for (let c = 0; c < str.length; c++) {
        drawChar(ctx, str.charCodeAt(c), x + c, y, fh);
    }
}

function drawArr(ctx, arr, x, y, fh) {
    for (let c = 0; c < arr.length; c++) {
        drawChar(ctx, arr[c], x + c, y, fh);
    }
}

function drawGrid(ctx, grid, x, y, fh) {
    for (let line = 0; line < grid.length; line++) {
        const row = grid[line];
        if (typeof row === 'string') {
            drawStr(ctx, row, x, y + line, fh);
        } else {
            drawArr(ctx, row, x, y + line, fh);
        }
    }
}

function updatePreviewCanvas() {
    const canvas = document.getElementById('preview-canvas')
    canvas.width = 1280;
    canvas.height = 32 * (25 - 2);

    const ctx = canvas.getContext('2d');
    const fontHeight = getFontData('height');

    ctx.fillStyle = getCSSVar('color-dark-gray');
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 256; i++) {
        const y = Math.floor(i / 64);
        const x = i % 64;
        const sx = Math.floor(x / 8) * 2;
        const tx = 2 + x + sx;
        const r = 2 + y;

        drawChar(ctx, i, tx, r, fontHeight)
    }

    const testBox = [
        [0xDA, 0xC4, 0xC2, 0xC4, 0xBF, 0x20, 0xC9, 0xCD, 0xCB, 0xCD, 0xBB, 0x20, 0xD5, 0xCD, 0xD1, 0xCD, 0xB8, 0x20, 0xD6, 0xC4, 0xD2, 0xC4, 0xB7],
        [0xC3, 0xC4, 0xC5, 0xC4, 0xB4, 0x20, 0xCC, 0xCD, 0xCE, 0xCD, 0xB9, 0x20, 0xC6, 0xCD, 0xD8, 0xCD, 0xB5, 0x20, 0xC7, 0xC4, 0xD7, 0xC4, 0xB6],
        [0xC0, 0xC4, 0xC1, 0xC4, 0xD9, 0x20, 0xC8, 0xCD, 0xCA, 0xCD, 0xBC, 0x20, 0xD4, 0xCD, 0xCF, 0xCD, 0xBE, 0x20, 0xD3, 0xC4, 0xD0, 0xC4, 0xBD]
    ]

    drawGrid(ctx, testBox, 2, 7, fontHeight);

    const testMath = [
        [0xF4, 0xE3, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0xE3],
        [0xB3, 0x20, 0x20, 0x73, 0x69, 0x6E, 0xFD, 0x20, 0xE9, 0x20, 0x64, 0xE9, 0x20, 0x3D, 0x20, 0x2D],
        [0xF5, 0x30, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x32],
    ]

    drawGrid(ctx, testMath, 27, 7, fontHeight);

    const testEnglish = [
        'A Quick Brown Fox Jumps Over The Lazy Dog',
        'a quick brown fox jumps over the lazy dog',
        'A QUICK BROWN FOX JUMPS OVER THE LAZY DOG',
    ];

    drawGrid(ctx, testEnglish, 2, 11, fontHeight);

    const testCode = [
        '1 #include <stdio.h>',
        '2 ',
        '3 int main() {',
        '4     char text[] = "Test Display";',
        '5     printf("%s\\n", text);',
        '6     return 0;',
        '7 }'
    ];

    for (let line = 0; line < testCode.length; line++) {
        drawChar(ctx, 0xB3, 44, 7 + line, fontHeight);
    }
    drawGrid(ctx, testCode, 46, 7, fontHeight);

    const testPrice = [
        0x9C, 0x39, 0x2E, 0x31, 0x35, 0x20, 0x24, 0x38, 0x2E, 0x32, 0x34, 0x20, 0x9B, 0x37, 0x2E,
        0x33, 0x33, 0x20, 0x9D, 0x36, 0x2E, 0x34, 0x32, 0x20, 0x9E, 0x35, 0x2E, 0x35, 0x31,
    ];
    drawArr(ctx, testPrice, 2, 16, fontHeight);
}

function menuReset() {
    editorData.menuMode = 'reset';
    updateMenu();
}

function resetCancelReset() {
    editorData.menuMode = 'normal';
    updateMenu();
}

function resetLoadTemplates() {
    editorData.menuMode = 'templates';
    updateMenu();
}

function templatesCancelLoadTemplates() {
    editorData.menuMode = 'reset';
    updateMenu();
}

function resetResetButton(h) {
    resetCharsData(h);
    resetCancelReset();
}

function loadTemplatesFrom(name) {
    openFontFromURL(`../fontTemplates/${name}`)
    resetCancelReset();
}

function transformFlipHorizontal() {
    const h = getFontData('height');
    let newData = "";

    for (let row = 0; row < h; row++) {
        let start = row * 8;
        let rb = getTabData('changedData').substring(start, start + 8);
        let fr = rb.split('').reverse().join('');
        newData += fr;
    }

    setTabData('changedData', newData);
    renderCanvas();
}

function transformFlipVertical() {
    const h = getFontData('height');
    let r = [];

    for (let row = 0; row < h; row++) {
        let start = row * 8;
        r.push(getTabData('changedData').substring(start, start + 8));
    }

    r.reverse();
    let newData = r.join('');

    setTabData('changedData', newData);
    renderCanvas();
}

function editBack() {
    setTabData('mode', 'edit')
    updateTitle()
}

function editLayer() {
    setTabData('mode', 'layer')
    updateTitle()
}

function editTransform() {
    setTabData('mode', 'transform')
    updateTitle()
}

function editShift() {
    setTabData('mode', 'shift')
    updateTitle()
}

function shiftUp() {
    const h = getFontData('height');
    let r = [];

    for (let i = 0; i < h; i++) {
        r.push(getTabData('changedData').substring(i * 8, (i + 1) * 8));
    }

    r.shift();
    r.push("0".repeat(8));

    setTabData('changedData', r.join(''));
    renderCanvas();
}

function shiftDown() {
    const h = getFontData('height');
    let r = [];

    for (let i = 0; i < h; i++) {
        r.push(getTabData('changedData').substring(i * 8, (i + 1) * 8));
    }

    r.pop();
    r.unshift("0".repeat(8));

    setTabData('changedData', r.join(''));
    renderCanvas();
}

function shiftLeft() {
    const h = getFontData('height');
    let r = [];

    for (let i = 0; i < h; i++) {
        let s = getTabData('changedData').substring(i * 8, (i + 1) * 8).slice(1) + "0";
        r.push(s);
    }

    setTabData('changedData', r.join(''));
    renderCanvas();
}

function shiftRight() {
    const h = getFontData('height');
    let r = [];

    for (let i = 0; i < h; i++) {
        let s = "0" + getTabData('changedData').substring(i * 8, (i + 1) * 8).slice(0, -1);
        r.push(s);
    }

    setTabData('changedData', r.join(''));
    renderCanvas();
}

function layerCopy() {
    if (isEditing()) {
        editorData.clipboard.data = getTabData('changedData');
    } else {
        editorData.clipboard.data = getFontData('data')[getTabData('index')];
    }
    editorData.clipboard.height = getFontData('height');
}

function layerPaste() {
    if (!isEditing()) {
        setTabData('mode', 'edit');
    }

    let layerHeight = getFontData('height');

    if (layerHeight === editorData.clipboard.height) {
        setTabData('changedData', editorData.clipboard.data);
        renderCanvas();
        updateTitle();
    } else if (layerHeight > editorData.clipboard.height) {
        let newData = editorData.clipboard.data.padEnd(8 * layerHeight, '0');

        setTabData('changedData', newData);
        renderCanvas();
        updateTitle();
        editShift();
    } else {
        let truncated = editorData.clipboard.data.slice(0, 8 * layerHeight);

        setTabData('changedData', truncated);
        renderCanvas();
        updateTitle();
    }
}

function layerClear() {
    setTabData('changedData', getEmptyData());
    renderCanvas();
}

const reverse = data => data.replace(/[01]/g, (match) => (match === '1' ? '0' : '1'));

function transformReverse() {
    setTabData('changedData', reverse(getTabData('changedData')));
    renderCanvas();
}

function highlightCharButton(index, updateHighlight) {
    const currentBtn = document.getElementById(`openChar${index}`);

    if (updateHighlight) {
        const lastActive = document.querySelector('.char-button.active');
        if (lastActive) lastActive.classList.remove('active');
        currentBtn.classList.add('active');
    }

    currentBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

async function openChar(index, toNormal, updateHighlight) {
    if (isDirty()) {
        highlightCharButton(index, updateHighlight)
        renderCanvas();
        updateTitle(getTabData('index') !== index);
        return;
    }

    if (toNormal) setTabData('mode', 'normal');

    highlightCharButton(index, true)
    setTabData('index', index);
    renderCanvas();
    updateTitle();
}

function renderCanvas() {
    const index = getTabData('index');
    const canvas = document.getElementById('pixel-canvas');
    const h = getFontData('height');
    const wh = h <= 24 ? 32 : 16;
    const charData = isEditing() ? getTabData('changedData') : getFontData('data')[index];

    canvas.oncontextmenu = (e) => e.preventDefault();
    canvas.style.gridTemplateColumns = `repeat(8, ${wh}px)`;
    canvas.style.gridTemplateRows = `repeat(${h}, ${wh}px)`;

    let pixelsHTML = '';
    for (let i = 0; i < charData.length; i++) {
        const color = Number(charData[i]) ? 'var(--color-black)' : 'var(--color-white)';
        pixelsHTML += `<div class="pixel" 
            style="background-color: ${color}; width: ${wh}px; height: ${wh}px" 
            onmousedown="pixelInput(${i}, event)" 
            onmouseenter="pixelInput(${i}, event)">
        </div>`;
    }
    canvas.innerHTML = pixelsHTML;
}

function updatePreviewCanvass(i) {
    const preview = document.getElementById(`prev${i}`);
    const h = getFontData('height');
    const isEmpty = isCharEmpty(i);

    if (isEmpty) {
        preview.innerHTML = '';
    } else {
        const charData = getFontData('data')[i];
        preview.style.gridTemplateRows = `repeat(${h}, 2px)`;

        let pixelsHTML = '';
        for (let j = 0; j < charData.length; j++) {
            const isVisible = Number(charData[j]) ? '' : 'style="background-color: transparent"';
            pixelsHTML += `<div class="prev-pixel" ${isVisible}></div>`;
        }
        preview.innerHTML = pixelsHTML;
    }
}

function updateAllPreviews() {
    for (let i = 0; i < 256; i++) {
        updatePreviewCanvass(i);
    }
}

function pixelInput(i, e) {
    if (!isEditing()) return;
    if (e.buttons !== 1 && e.buttons !== 2) return;

    const newValue = e.buttons === 1 ? "1" : "0";

    let dataArr = getTabData('changedData').split('');
    dataArr[i] = newValue;
    setTabData('changedData', dataArr.join(''));

    e.target.style.backgroundColor = newValue === "1" ? 'var(--color-black)' : 'var(--color-white)';
}

function editChar() {
    setTabData('mode', 'edit');
    setTabData('changedData', getFontData('data')[getTabData('index')]);
    renderCanvas();
    updateTitle();
}

function saveChanges() {
    getFontData('data')[getTabData('index')] = getTabData('changedData');
    setTabData('mode', 'normal');

    updatePreviewCanvass(getTabData('index'));
    renderCanvas();
    updateTitle();
}

function undoChanges() {
    setTabData('mode', 'normal');
    setTabData('changedData', "");
    renderCanvas();
    updateTitle();
}

function helpDisenable() {
    const helpDiv = document.getElementById('help-text');
    if (helpDiv) {
        helpDiv.style.display = 'none';
        localStorage.setItem('helpDisenable', 'true');
    }
}

function updataGoto() {
    if (editorData.inputmode !== 'goto') {
        document.getElementById('string-input').innerHTML = '__';
        return;
    }

    const gotoInputSpan = document.getElementById('string-input');
    const val = editorData.stringInput;

    if (val.length === 0) gotoInputSpan.innerHTML = '<bright>_</bright>_';
    else if (val.length === 1) gotoInputSpan.innerHTML = val + '<bright>_</bright>';
    else gotoInputSpan.innerHTML = val.slice(0, 2);
}

function cancelGoto() {
    document.getElementById('string-input').innerHTML = '__';

    editorData.inputmode = 'normal';
    editorData.stringInput = '';
    updataGoto();
}

function gotoJump() {
    if (isDirty()) {
        updateTitle(true);
        return;
    }

    document.getElementById('string-input').innerHTML = '__';

    const val = editorData.stringInput;

    if (val.includes('+')) {
        const index = getTabData('index');
        const step = val == '++' ? 4 : 1;
        cancelGoto();
        openChar(Math.min(index + step, 0xFF), true);
        return;
    }

    if (val.includes('-')) {
        const index = getTabData('index');
        const step = val == '--' ? 4 : 1;
        cancelGoto();
        openChar(Math.max(index - step, 0), true);
        return;
    }

    if (val.length <= 2) {
        const nweIndex = parseInt(val, 16);
        if (!isNaN(nweIndex) && nweIndex >= 0 && nweIndex <= 255) {
            cancelGoto();
            openChar(nweIndex, true);
            return;
        }
    }
    cancelGoto();
}

function gotoInputStart() {
    if (editorData.inputmode === 'name') {
        editorData.inputmode = 'normal';
        updateTabs();
    }

    if (editorData.inputmode === 'goto') return;

    document.getElementById('string-input').innerHTML = '__';

    if (isDirty()) {
        updateTitle(true);
        return;
    }

    setTabData('mode', 'normal');
    editorData.inputmode = 'goto';
    editorData.stringInput = '';
    updataGoto();
}

function changeTab(tab) {
    const warningDiv = document.getElementById('menu-bar-warning-area');
    const previewDiv = document.getElementById('preview');

    const confirmNoBtn = warningDiv ? warningDiv.querySelector('#confirmNo') : null;
    if (confirmNoBtn) {
        confirmNoBtn.click();
    }

    if (editorData.inputmode === 'name') editorData.inputmode = 'normal';

    editorData.tab = tab;
    updateAllPreviews();
    openChar(getTabData('index'), false, true);
    updateTabs();

    if (!(previewDiv.style.display === 'none' || previewDiv.style.display === '')) {
        updatePreviewCanvas();
    }
}

function addTab() {
    const newIndex = editorData.tabsData.length;

    if (editorData.inputmode === 'name') {
        editorData.inputmode = 'normal';
        updateTabs();
    }

    editorData.tabsData = [
        ...editorData.tabsData,
        {
            name: 'UNTITLED.RAW',
            index: 0,
            changedData: '',
            mode: 'normal',
            fontInfo: {
                height: 16,
                data: []
            }
        }
    ];

    setEmptyData(16, newIndex);
    changeTab(newIndex);
    updateTabs();
}

async function removeTab() {
    if (isDirty()) {
        updateTitle(true);
        return;
    }

    if (editorData.inputmode === 'name') {
        editorData.inputmode = 'normal';
        updateTabs();
    }

    setTabData('mode', 'normal');

    const proceed = await askIsAbandon();
    if (!proceed) return;

    const currentTab = editorData.tab;
    const tabsCount = editorData.tabsData.length;

    if (tabsCount <= 1) {
        editorData.tabsData = [
            {
                name: 'UNTITLED.RAW',
                index: 0,
                changedData: '',
                mode: 'normal',
                fontInfo: {
                    height: 16,
                    data: []
                }
            }
        ];

        setEmptyData(16);
        updateTabs();

        return;
    }

    editorData.tabsData.splice(currentTab, 1);

    changeTab(Math.max(editorData.tab - 1, 0));
    updateTabs();
}

function updateTabs() {
    const tabs = document.getElementById('tabs');

    let tabsHTML = '';
    for (let i = 0; i < editorData.tabsData.length; i++) {
        const tabData = editorData.tabsData[i];
        const isSelecting = (i === editorData.tab);
        const inpusName = tabData.name;

        let displayName = '';
        if (isSelecting && editorData.inputmode === 'name') {
            displayName = escapeHTML(editorData.stringInput) + '<bright>_</bright>';
        } else {
            displayName = escapeHTML(inpusName);
        }

        tabsHTML += `
            <div class="${isSelecting ? 'tab-button-white-bg' : 'tab-button-dark-gray-bg'}">
                <button class="${isSelecting ? 'menu-button' : 'menu-button-dark'}" onclick='changeTab(${i})'>
                    ${displayName}
                </button>
            </div> 
        `;
    }

    tabs.innerHTML = tabsHTML;
}