(async () => {
    await loadLanguage();

    document.getElementById('goto-button-text').innerHTML = lang('Goto');
    document.getElementById('string-input').innerHTML = '__';

    document.body.style.fontFamily = lang('UiFont')

    const charButtonArea = document.getElementById('char-button-area');
    let buttonsHTML = '';

    for (let i = 0; i < 256; i++) {
        buttonsHTML += `
            <button id="openChar${i}" onclick="openChar(${i}, true)" class="char-button">
                <div id="prev${i}" class="char-preview"></div>
                <span class="char-index">${i.toString(16).padStart(2, '0').toUpperCase()}</span>
            </button>
        `;
    }
    charButtonArea.insertAdjacentHTML('beforeend', buttonsHTML);

    const container = document.querySelector('.canvars-and-help');
    const showHelp = localStorage.getItem('showHelp') === 'true';
    const metaKey = localStorage.getItem('metaKey') === 'alt' ? 'alt' : 'meta';

    editorData.setting.showHelp = showHelp;
    editorData.setting.metaKey = metaKey;

    if (showHelp) container.insertAdjacentHTML('beforeend', lang('HelpBlock'));

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
