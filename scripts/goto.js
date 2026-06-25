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
    if (editorData.inputmode === 'goto') {
        editorData.inputmode = 'normal';
        updateTabs();
        updataGoto();
        return;
    }

    if (editorData.inputmode === 'name') {
        editorData.inputmode = 'normal';
        updateTabs();
    }

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
