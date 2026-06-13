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
            const abandonDiv = document.getElementById('menuBarWarningArea');
            if (abandonDiv.querySelector('.menuButton')) {
                resolve(false);
                return;
            }

            abandonDiv.innerHTML = `
                <span style="color: var(--color-red)">&nbsp;${lang('WarnLost', '&nbsp;* Current will be lost!!!')}</span>
                <button class="menuButton" id="confirmYes">${lang('Yes', '<bright>Y</bright>es,')}</button>
                <button class="menuButton" id="confirmNo">${lang('No', '<bright>N</bright>o')}</button>
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
    const errorDiv = document.getElementById('menuBarWarningArea');
    errorDiv.innerHTML = `
        <span style="color: var(--color-red)">&nbsp;* Error: ${message}</span>
    `;
    setTimeout(() => {
        if (errorDiv.innerText.includes('Error:')) errorDiv.innerHTML = '';
    }, 2000);
}

async function openFont() {
    if (isDirty()) {
        updateTitle(true);
        return;
    }

    setTabData('mode', 'normal');

    const proceed = await askIsAbandon();
    if (!proceed) return;

    const fileInput = document.getElementById('OpenFontInput');
    fileInput.click();

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);

        let result = "";

        for (let i = 0; i < uint8.length; i++) {
            result += uint8[i].toString(2).padStart(8, '0');
        }

        let charLen = result.length / 256;
        if (charLen % 1 !== 0) {
            showError(lang('ErrorFont', "Font data error!"));
            return;
        }

        let fontHeight = charLen / 8;
        if (!(fontHeight > 0 && fontHeight <= 32)) {
            showError(lang('ErrorFont', "Font data error!"));
            return;
        }
        setFontData('height', fontHeight);

        for (let i = 0; i <= 255; i++) {
            let s = i * charLen;
            let e = (i + 1) * charLen;
            getFontData('data')[i] = result.slice(s, e);
        }

        setTabData('name', file.name);
        updateAllPreviews();
        openChar(getTabData('index'), true);
        fileInput.value = '';
        updateTabs();
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

function renameFont() {
    if (editorData.inputmode === 'goto') cancelGoto();

    editorData.inputmode = 'name';
    editorData.stringInput = getTabData('name');
    updateTabs();
}

function debug() {
    console.log(editorData);
}

function truncateText(text) {
    const maxLen = Number(lang('TruncateTextMaxLen', '32'));
    if (text.length > maxLen) {
        return text.slice(0, maxLen).trim() + '...';
    }
    return text;
}

function updateMenu() {
    const menuBarButtonArea = document.getElementById('menuBarButtonArea');

    let actionButtons = '';

    switch (editorData.menuMode) {
        case 'normal':
            actionButtons = `
                <button class="menuButton" onclick="menuNew()">${lang('New', 'Ne<bright>w</bright>')}</button>
                <button class="menuButton" onclick="renameFont()">${lang('Rename', '<bright>R</bright>ename')}</button>
                <button class="menuButton" onclick="openFont()">${lang('Open', '<bright>O</bright>pen')}</button>
                <button class="menuButton" onclick="saveFont()">${lang('Save', '<bright>S</bright>ave')}</button>
            `;
            break;
        case 'new':
            actionButtons = `
                <button class="menuButton" onclick="menuCancelNew()">${lang('CancelNew', 'Cancel ne<bright>w</bright>')}</button>
                <span>&nbsp;|&nbsp;</span>
                <span>Size:&nbsp;</span>
                <button class="menuButton" onclick="menuNewButton(16)">${lang('New16', '8x1<bright>6</bright>,')}</button>
                <button class="menuButton" onclick="menuNewButton(14)">${lang('New14', '8x1<bright>4</bright>,')}</button>
                <button class="menuButton" onclick="menuNewButton(8)">${lang('New8', '8x<bright>8</bright>')}</button>
            `;
            break;
    }

    menuBarButtonArea.innerHTML = actionButtons;
}

function updateTitle(isWarning = false) {
    const index = getTabData('index');
    const charTitle = document.getElementById('charTitle');

    let descriptionsText = '';
    if (getTabData('mode') === 'normal') {
        descriptionsText = toUniTag(truncateText(lang('CharDescriptions', charDescriptions, false)[index]));
    } else if (getTabData('mode') === 'edit') {
        descriptionsText = toUniTag((lang('CharDescriptions', charDescriptions, false)[index]).split(' - ')[0].trim());
    }

    const descriptions = getTabData('mode') === 'normal' || getTabData('mode') === 'edit'
        ? `
            <span>&nbsp;#${index}:&nbsp;</span>
                <span style="color: var(--color-light-gray)" title="${lang('CharDescriptions', charDescriptions, false)[index].replace(/"/g, '&quot;')}">
                    ${descriptionsText}
                </span>
            <span>&nbsp;&nbsp;|&nbsp;</span>
        ` : '';

    const saveTexts = isEditing() ? `
        <span>&nbsp;|&nbsp;&nbsp;</span>
        <span style="color: var(${isWarning ? '--color-brown' : '--color-white'})">${isWarning ? '* ' : ''}${lang('SaveQ', 'Save?')}</span>
        &nbsp;
        <button class="TitleButton" onclick="saveChanges()">${lang('Yes', '<bright>Y</bright>es,')}</button>
        <button class="TitleButton" onclick="undoChanges()">${lang('No', '<bright>N</bright>o')}</button>
    ` : '';

    let actionButtons = '';

    switch (getTabData('mode')) {
        case 'normal':
            const canPaste = isCharEmpty(getTabData('index'));
            actionButtons = `
                <button class="TitleButton" onclick="editChar()">${lang('Edit', '<bright>E</bright>dit')}</button>
                <span>&nbsp;|&nbsp;</span>
                <button class="TitleButton" onclick="layerCopy()">${lang('Copy', '<bright>C</bright>opy')}</button>
                ${canPaste
                    ? `<button class="TitleButton" onclick="layerPaste()">${lang('Paste', '<bright>P</bright>aste')}</button>`
                    : `<span style="color:var(--color-dark-gray)">&nbsp;${lang('Paste', '<bright>P</bright>aste')}&nbsp;</span>`
                }
            `;
            break;
        case 'edit':
            actionButtons = `
                <button class="TitleButton" onclick="editLayer()">${lang('Layer', '<bright>L</bright>ayer')}</button>
                <button class="TitleButton" onclick="editTransform()">${lang('Transform', '<bright>T</bright>ransform')}</button>
                <button class="TitleButton" onclick="editShift()">${lang('Shift', 'S<bright>h</bright>ift')}</button>
            `;
            break;
        case 'layer':
            actionButtons = `
                <button class="TitleButton" onclick="editBack()">${lang('Back', '<bright>B</bright>ack')}</button>
                <span>&nbsp;|&nbsp;</span>
                <button class="TitleButton" onclick="layerCopy()">${lang('Copy', '<bright>C</bright>opy')}</button>
                <button class="TitleButton" onclick="layerPaste()">${lang('Paste', '<bright>P</bright>aste')}</button>
                <button class="TitleButton" onclick="layerClear()">${lang('Clear', 'Cle<bright>a</bright>r')}</button>
            `;
            break;
        case 'transform':
            actionButtons = `
                <button class="TitleButton" onclick="editBack()">${lang('Back', '<bright>B</bright>ack')}</button>
                <span>&nbsp;|&nbsp;</span>
                <button class="TitleButton" onclick="transformReverse()">${lang('Reverse', 'Re<bright>v</bright>erse')}</button>
                <button class="TitleButton" onclick="transformFlipHorizontal()">${lang('FlipH', '<bright>F</bright>lip(↔)')}</button>
                <button class="TitleButton" onclick="transformFlipVertical()">${lang('FlipV', 'Fl<bright>i</bright>p(↕)')}</button>
            `;
            break;
        case 'shift':
            actionButtons = `
                <button class="TitleButton" onclick="editBack()">${lang('Back', '<bright>B</bright>ack')}</button>
                <span>&nbsp;|&nbsp;</span>
                <button class="TitleButton" onclick="shiftLeft()"><bright>←</bright></button>
                <button class="TitleButton" onclick="shiftDown()"><bright>↓</bright></button>
                <button class="TitleButton" onclick="shiftUp()"><bright>↑</bright></button>
                <button class="TitleButton" onclick="shiftRight()"><bright>→</bright></button>
            `
            break;
    }

    charTitle.innerHTML = `
        ${descriptions}${actionButtons}${saveTexts}
    `;
}

function menuCancelNew() {
    editorData.menuMode = 'normal';
    updateMenu();
}

function menuNew() {
    editorData.menuMode = 'new';
    updateMenu();
}

function menuNewButton(h) {
    resetCharsData(h);
    menuCancelNew();
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
        const lastActive = document.querySelector('.charButton.active');
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
    const canvas = document.getElementById('pixelCanvas');
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

function updatePreviews(i) {
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
            pixelsHTML += `<div class="prevPixel" ${isVisible}></div>`;
        }
        preview.innerHTML = pixelsHTML;
    }
}

function updateAllPreviews() {
    for (let i = 0; i < 256; i++) {
        updatePreviews(i);
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

    updatePreviews(getTabData('index'));
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
    const helpDiv = document.getElementById('helpText');
    if (helpDiv) {
        helpDiv.style.display = 'none';
        localStorage.setItem('helpDisenable', 'true');
    }
}

function updataGoto() {
    if (editorData.inputmode !== 'goto') {
        document.getElementById('stringInput').innerHTML = '__';
        return;
    }

    const gotoInputSpan = document.getElementById('stringInput');
    const val = editorData.stringInput;

    if (val.length === 0) gotoInputSpan.innerHTML = '<bright>_</bright>_';
    else if (val.length === 1) gotoInputSpan.innerHTML = val + '<bright>_</bright>';
    else gotoInputSpan.innerHTML = val.slice(0, 2);
}

function cancelGoto() {
    document.getElementById('stringInput').innerHTML = '__';

    editorData.inputmode = 'normal';
    editorData.stringInput = '';
    updataGoto();
}

function gotoJump() {
    if (isDirty()) {
        updateTitle(true);
        return;
    }

    document.getElementById('stringInput').innerHTML = '__';

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

    document.getElementById('stringInput').innerHTML = '__';

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
    const warningDiv = document.getElementById('menuBarWarningArea');
    const confirmNoBtn = warningDiv ? warningDiv.querySelector('#confirmNo') : null;
    if (confirmNoBtn) {
        confirmNoBtn.click();
    }

    if (editorData.inputmode === 'name') editorData.inputmode = 'normal';

    editorData.tab = tab;
    updateAllPreviews();
    openChar(getTabData('index'), false, true);
    updateTabs();
}

function addTab() {
    const newIndex = editorData.tabsData.length;

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
            <div class="${isSelecting ? 'tabButtonWhiteBG' : 'tabButtonDarkGrayBG'}">
                <button class="${isSelecting ? 'menuButton' : 'menuButtonDark'}" onclick='changeTab(${i})'>
                    ${displayName}
                </button>
            </div> 
        `;
    }

    tabs.innerHTML = tabsHTML;
}