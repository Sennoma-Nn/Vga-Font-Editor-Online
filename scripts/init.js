(async () => {
    await loadLanguage();

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

    updateTabs();
    updateMenu();
    setEmptyData(16);
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