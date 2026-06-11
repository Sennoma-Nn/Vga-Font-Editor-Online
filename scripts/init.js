(async () => {
    await loadLanguage();
    document.getElementById('new16Button').innerHTML = lang('New16', 'New (8x1<bright>6</bright>)');
    document.getElementById('new14Button').innerHTML = lang('New14', 'New (8x1<bright>4</bright>)');
    document.getElementById('new8Button').innerHTML = lang('New8', 'New (8x<bright>8</bright>)');
    document.getElementById('renameButton').innerHTML = lang('Rename', '<bright>R</bright>ename');
    document.getElementById('openButton').innerHTML = lang('Open', '<bright>O</bright>pen');
    document.getElementById('saveButton').innerHTML = lang('Save', '<bright>S</bright>ave');

    document.getElementById('gotoButtonText').innerHTML = lang('Goto', '<bright>G</bright>oto:');
    document.getElementById('stringInput').innerHTML = '__';

    document.body.style.fontFamily = lang('UiFont', 'MBytePC230')

    const charButtonArea = document.getElementById('charButtonArea');
    let buttonsHTML = '';

    for (let i = 0; i < 256; i++) {
        buttonsHTML += `
            <button id="openChar${i}" onclick="openChar(${i}, true)" class="charButton">
                <div id="prev${i}" class="charPreview"></div>
                <span class="charIndex">${i.toString(16).padStart(2, '0').toUpperCase()}</span>
            </button>
        `;
    }
    charButtonArea.insertAdjacentHTML('beforeend', buttonsHTML);

    const container = document.querySelector('.canvarsAndHelp');
    const isDisabled = localStorage.getItem('helpDisenable') === 'true';

    if (!isDisabled) {
        const defaultHelp = `
            <div class="helpText" id="helpText">
                <p>╔═ Help ════════════════╗</p>
                <p>║ Click the Edit button ║</p>
                <p>║ to edit the glyph.&nbsp;&nbsp;&nbsp; ║</p>
                <p>║ Left-click to draw,&nbsp;&nbsp; ║</p>
                <p>║ right-click to erase. ║</p>
                <p>╚══════════════<button class="menuButton" id="closeHelpBtn" onclick="helpDisenable()">I <bright>k</bright>now</button>═╝</p>
            </div>
        `
        container.insertAdjacentHTML('beforeend', lang('HelpBlock', defaultHelp));
    }

    setEmptyData(16);
    updateTabs();
})();

window.addEventListener('beforeunload', (event) => {
    if (isAnyProjDirty() || isAnyTabDirty()) event.preventDefault();
});

window.addEventListener('keydown', function (e) {
    const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (arrows.includes(e.key)) {
        e.preventDefault();
    }
});