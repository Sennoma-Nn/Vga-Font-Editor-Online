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

function clickConfirmNo() {
    const abandonDiv = document.getElementById('top-menu-bar-warning-area');
    const existingNoBtn = abandonDiv.querySelector('#confirmNo');
    if (existingNoBtn) {
        existingNoBtn.click();
    }

}

function askIsAbandon() {
    clickConfirmNo()
    return new Promise((resolve) => {
        if (isProjDirty()) {
            const abandonDiv = document.getElementById('top-menu-bar-warning-area');
            if (abandonDiv.querySelector('.menu-button')) {
                resolve(false);
                return;
            }

            abandonDiv.innerHTML = `
                <span style="color: var(--color-red)">&nbsp;${lang('WarnLost')}&nbsp;</span>
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
    clickConfirmNo()
    const errorDiv = document.getElementById('top-menu-bar-warning-area');
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

function updateMenu() {
    const menuBarButtonArea = document.getElementById('top-menu-bar-button-area');

    let actionButtons = `
        <button class="menu-button" onclick="menuManager.toggle('reset-dropdown-menu', this)">${lang('Reset')}</button>
        <div id="reset-dropdown-menu" class="dropdown-menu">
            <ul>
                <span style="color: var(--color-light-gray)">&nbsp;${lang('Size')}:</span>
                <li class="menu-item" onclick="resetResetButton(16)">8x1<bright>6</bright></li>
                <li class="menu-item" onclick="resetResetButton(14)">8x1<bright>4</bright></li>
                <li class="menu-item" onclick="resetResetButton(8)">8x<bright>8</bright></li>

                <br>

                <li class="menu-item has-submenu" onclick="toggleSubmenu(this)">
                    ${lang('Templates')} ►
                    <ul class="submenu">
                        <li class="menu-item" onclick="event.stopPropagation(); loadTemplatesFrom('VGA-ROM.F16')"><bright>1</bright> VGA-ROM.F16</li>
                        <li class="menu-item" onclick="event.stopPropagation(); loadTemplatesFrom('VGA-ROM.F14')"><bright>2</bright> VGA-ROM.F14</li>
                        <li class="menu-item" onclick="event.stopPropagation(); loadTemplatesFrom('VGA-ROM.F08')"><bright>3</bright> VGA-ROM.F08</li>
                        <li class="menu-item" onclick="event.stopPropagation(); loadTemplatesFrom('QUADBM.F08')"><bright>4</bright> QUADBM.F08</li>
                    </ul>
                </li>
            </ul>
        </div>
        <button class="menu-button" onclick="menuRenameFont()">${lang('Rename')}</button>
        <button class="menu-button" onclick="menuOpenFont()">${lang('Open')}</button>
        <button class="menu-button" onclick="menuSaveFont()">${lang('Save')}</button>
        <button class="menu-button" onclick="menuPreviewFont()">${lang('Preview')}</button>
        <button class="menu-button" onclick="menuSettings()">${lang('Settings')}</button>
    `;

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

function getCharDescriptionsList() {
    let cp = getTabData('codePage')
    let list = lang('CharDescriptions', false)[cp] ?? lang('CharDescriptions', false)['437']
    return list;
}

function updateTitle(isWarning = false) {
    const index = getTabData('index');
    const charTitle = document.getElementById('char-title');

    let descriptionsText = '';
    if (getTabData('mode') === 'normal') {
        descriptionsText = toShiftDownTag(truncateText(getCharDescriptionsList()[index]));
    } else if (getTabData('mode') === 'edit') {
        descriptionsText = toShiftDownTag(shortName((getCharDescriptionsList()[index])));
    }

    const descriptions = getTabData('mode') === 'normal' || getTabData('mode') === 'edit'
        ? `
            <span>&nbsp;#${index}:&nbsp;</span>
                <span style="color: var(--color-light-gray)" title="${getCharDescriptionsList()[index].replace(/"/g, '&quot;')}">
                    ${descriptionsText}
                </span>
            <span>&nbsp;|</span>
        ` : '';

    const saveTexts = isEditing() ? `
        <button class="title-button" onclick="menuManager.toggle('change-dropdown-menu', this)" ${isWarning ? 'style="color: var(--color-brown)"' : ''}>${isWarning ? '☼ ' : ''}${lang('Change')}</button>
        <div id="change-dropdown-menu" class="dropdown-menu">
            <ul>
                <li class="menu-item" onclick="${closeMenu('change-dropdown-menu')}; saveChanges()">${lang('SaveGlyph')}</li>
                <li class="menu-item" onclick="${closeMenu('change-dropdown-menu')}; undoChanges()">${lang('DontSaveGlyph')}</li>
            </ul>
        </div>
    ` : '';

    let actionButtons = '';

    switch (getTabData('mode')) {
        case 'normal':
            const canPaste = isCharEmpty(getTabData('index'));
            actionButtons = `
                <button class="title-button" onclick="editChar()">${lang('Edit')}</button>
                <button class="title-button" onclick="layerCopy()">${lang('FastCopy')}</button>
                ${canPaste
                    ? `<button class="title-button" onclick="layerPaste()">${lang('FastPaste')}</button>`
                    : `<span style="color:var(--color-dark-gray)">&nbsp;${lang('FastPaste')}&nbsp;</span>`
                }
            `;
            break;
        case 'edit':
            actionButtons = `
                <button class="title-button" onclick="menuManager.toggle('glyph-dropdown-menu', this)">${lang('Glyph')}</button>
                <div id="glyph-dropdown-menu" class="dropdown-menu">
                    <ul>
                        <li class="menu-item" onclick="${closeMenu('glyph-dropdown-menu')}; layerCopy()">${lang('Copy')}</li>
                        <li class="menu-item" onclick="${closeMenu('glyph-dropdown-menu')}; layerPaste()">${lang('Paste')}</li>
                        <li class="menu-item" onclick="${closeMenu('glyph-dropdown-menu')}; layerClear()">${lang('Clear')}</li>
                    </ul>
                </div>
                <button class="title-button" onclick="menuManager.toggle('transform-dropdown-menu', this)">${lang('Transform')}</button>
                <div id="transform-dropdown-menu" class="dropdown-menu">
                    <ul>
                        <li class="menu-item" onclick="${closeMenu('transform-dropdown-menu')}; transformReverse()">${lang('Reverse')}</li>
                        <li class="menu-item" onclick="${closeMenu('transform-dropdown-menu')}; transformFlipHorizontal()">${lang('FlipH')}</li>
                        <li class="menu-item" onclick="${closeMenu('transform-dropdown-menu')}; transformFlipVertical()">${lang('FlipV')}</li>
                    </ul>
                </div>
                <button class="title-button" onclick="menuManager.toggle('shift-dropdown-menu', this)">${lang('Shift')}</button>
                <div id="shift-dropdown-menu" class="dropdown-menu">
                    <ul>
                    <li class="menu-item" onclick="${closeMenu('shift-dropdown-menu')}; shiftUp()"><bright>▲</bright> ${lang('Up')}</li>
                    <li class="menu-item" onclick="${closeMenu('shift-dropdown-menu')}; shiftDown()"><bright>▼</bright> ${lang('Down')}</li>
                        <li class="menu-item" onclick="${closeMenu('shift-dropdown-menu')}; shiftLeft()"><bright>◄</bright> ${lang('Left')}</li>
                        <li class="menu-item" onclick="${closeMenu('shift-dropdown-menu')}; shiftRight()"><bright>►</bright> ${lang('Right')}</li>
                    </ul>
                </div>
            `;
            break;
    }

    charTitle.innerHTML = `
        ${descriptions}${actionButtons}${saveTexts}
    `;
}

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
    drawArr(ctx, testPrice, 2, 15, fontHeight);

    const commandPrompt = 'C:\\>DIR /S /B \\ | FIND ".COM"'.split('').map(c => c.charCodeAt(0));
    drawArr(ctx, commandPrompt, 2, 16, fontHeight);

    let testBlock = [0xB0, 0xB0, 0xB0, 0xB0, 0x20, 0x20, 0xB1, 0xB1, 0xB1, 0xB1, 0x20, 0x20, 0xB2, 0xB2, 0xB2, 0xB2];
    drawArr(ctx, testBlock, 33, 15, fontHeight);
    drawArr(ctx, testBlock, 33, 16, fontHeight);
}

function updateSetting(settingsDiv) {
    const showHelp = editorData.setting.showHelp;
    const metaKey = editorData.setting.metaKey;
    const metaText = isMacOS() ? lang('CmdKey') : lang('MetaKey')
    settingsDiv.innerHTML = `
        <span style="position: absolute; top: calc(32px * 1); left: 32px">
            VGA FONT EDITOR ONLINE -- V${editorData.about.version}
        </span>

        <button style="position: absolute; top: calc(32px * 2); left: 32px" class="hyper-link-button" onclick="viewOnGitHub()">
            ${lang('ViewOnGitHub')}
        </button>

        <span style="position: absolute; top: calc(32px * 4); left: 16px">
            <button class="menu-button" onclick="toggleShowHelp()">
                ${lang('ShowHelp')}: ${showHelp ? lang('ShowHelpYes') : lang('ShowHelpNo')}
            </button>
        </span>

        <span style="position: absolute; top: calc(32px * 5); left: 16px">
            <button class="menu-button" onclick="toggleMetaKey()">
                ${lang('MetaKeyIs')}: ${metaKey === 'alt' ? lang('AltKey') : metaText}
            </button>
        </span>

        <span style="position: absolute; bottom: calc(32px * 1); right: 16px">
            <button class="menu-button" onclick="menuSettings()">
                ${lang('CloseSettings')}
            </button>
        </span>
    `
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

function closeHelp() {
    const helpDiv = document.getElementById('help-text');
    if (helpDiv) {
        helpDiv.style.display = 'none';
    }
}

function changeTab(tab) {
    clickConfirmNo()
    const warningDiv = document.getElementById('top-menu-bar-warning-area');

    const confirmNoBtn = warningDiv ? warningDiv.querySelector('#confirmNo') : null;
    if (confirmNoBtn) {
        confirmNoBtn.click();
    }

    if (editorData.inputmode === 'name') editorData.inputmode = 'normal';

    editorData.tab = tab;
    updateAllPreviews();
    openChar(getTabData('index'), false, true);
    updateTabs();

    if (isPreviewOpen()) {
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
        structuredClone(emptyTabData)
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
