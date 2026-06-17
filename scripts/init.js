(async () => {
    await loadLanguage();

    document.getElementById('gotoButtonText').innerHTML = lang('Goto');
    document.getElementById('stringInput').innerHTML = '__';

    document.body.style.fontFamily = lang('UiFont')

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
        container.insertAdjacentHTML('beforeend', lang('HelpBlock'));
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