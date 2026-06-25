async function menuOpenFont() {
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

async function menuSaveFont() {
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

function menuPreviewFont() {
    updatePreviewCanvas();
    const previewDiv = document.getElementById('preview');
    const settingsDiv = document.getElementById('settings');

    if (isPreviewOpen()) previewDiv.style.display = 'none';
    else previewDiv.style.display = 'block'

    settingsDiv.style.display = 'none'
}

function menuRenameFont() {
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

function toggleMetaKey() {
    editorData.setting.metaKey = editorData.setting.metaKey === 'alt' ? 'meta' : 'alt';
    localStorage.setItem('metaKey', editorData.setting.metaKey);

    const settingsDiv = document.getElementById('settings');
    updateSetting(settingsDiv);
}

function toggleShowHelp() {
    editorData.setting.showHelp = !editorData.setting.showHelp;
    localStorage.setItem('showHelp', editorData.setting.showHelp);

    const settingsDiv = document.getElementById('settings');
    updateSetting(settingsDiv);
}

function viewOnGitHub() {
    window.open(editorData.about.github);
}

function resetResetButton(h) {
    resetCharsData(h);
    updateMenu();
}

function loadTemplatesFrom(name) {
    openFontFromURL(`./fontTemplates/${name}`)
    updateMenu();
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

function transformReverse() {
    setTabData('changedData', reverse(getTabData('changedData')));
    renderCanvas();
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
