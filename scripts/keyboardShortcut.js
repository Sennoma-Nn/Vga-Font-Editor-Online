let activePressedBtn = null;

document.addEventListener('keydown', (e) => {
    if (editorData.inputmode === 'name') {
        e.preventDefault();
        const k = e.key;

        if (k === 'Enter') {
            if (editorData.stringInput.trim().length > 0) {
                setTabData('name', editorData.stringInput);
            }
            editorData.inputmode = 'normal';
            updateTabs();
        } else if (k === 'Escape') {
            editorData.inputmode = 'normal';
            updateTabs();
        } else if (k === 'Backspace') {
            editorData.stringInput = editorData.stringInput.slice(0, -1);
            updateTabs();
        } else if (k.length === 1) {
            const invalidChars = /[<>:"/\\|?*]/;
            if (!invalidChars.test(k)) {
                editorData.stringInput += k;
                updateTabs();
            }
        }
        return;
    }

    if (editorData.inputmode === 'goto') {
        e.preventDefault();
        const k = e.key;

        if (k === 'Enter') {
            gotoJump();
        } else if (k === 'Escape') {
            cancelGoto();
        } else if (k === 'Backspace') {
            if (editorData.stringInput.length > 0) {
                editorData.stringInput = editorData.stringInput.slice(0, -1);
                updataGoto();
            }
        } else if (k.length === 1 && /^[0-9A-Fa-f+-]$/i.test(k)) {
            let newInput = editorData.stringInput + (k === '+' || k === '-' ? k : k.toUpperCase());

            const isHex = /^[0-9A-F]*$/i.test(newInput);
            const isAllPlus = /^\+*$/.test(newInput);
            const isAllMinus = /^-*$/.test(newInput);

            if ((isHex || isAllPlus || isAllMinus) && newInput.length <= 2) {
                editorData.stringInput = newInput;
                updataGoto();
            }
        }
        return;
    }

    if (e.repeat) return;

    if (activePressedBtn) {
        const prevBtn = activePressedBtn;
        activePressedBtn = null;
        prevBtn.classList.remove('pressed');
        prevBtn.dispatchEvent(new MouseEvent('click', { shiftKey: e.shiftKey }));
    }

    const k = key2Symbol(e.key.toUpperCase());

    const openMenus = document.querySelectorAll('.dropdown-menu.show');
    let scope = document;
    if (openMenus.length) {
        const lastMenu = openMenus[openMenus.length - 1];
        const submenus = lastMenu.querySelectorAll('.submenu-open');
        scope = submenus.length ? submenus[submenus.length - 1] : lastMenu;
    }

    const btn = Array.from(scope.querySelectorAll('button, .menu-item'))
        .find(b => {
            if (b.offsetParent === null && !b.closest('.dropdown-menu.show')) return false;
            const bk = getBrightKey(b);
            return bk && matchBrightKey(bk, k, e);
        });

    if (btn) {
        btn.classList.add('pressed');
        activePressedBtn = btn;
        e.preventDefault();
        return;
    }

    if (e.ctrlKey || e.altKey || e.metaKey) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (editorData.inputmode === 'goto' || editorData.inputmode === 'name') return;

    const k = key2Symbol(e.key.toUpperCase());

    if (activePressedBtn) {
        const bk = getBrightKey(activePressedBtn);
        if (bk && matchBrightKey(bk, k, e)) {
            const btn = activePressedBtn;
            activePressedBtn = null;
            btn.classList.remove('pressed');
            btn.dispatchEvent(new MouseEvent('click', { shiftKey: e.shiftKey }));
        } else if (bk && bk.key === k) {
            const btn = activePressedBtn;
            activePressedBtn = null;
            btn.classList.remove('pressed');
            btn.dispatchEvent(new MouseEvent('click', { shiftKey: e.shiftKey }));
        }
    } else {
        document.querySelectorAll('button, .menu-item').forEach(btn => {
            const bk = getBrightKey(btn);
            if (bk && matchBrightKey(bk, k, e)) {
                btn.classList.remove('pressed');
            }
        });
    }
});

function matchBrightKey(bk, key, e) {
    if (bk.none) return false;
    if (bk.key !== key) return false;
    if (bk.modifier === 'alt' && (!e.altKey || e.ctrlKey || e.metaKey)) return false;
    if (bk.modifier === 'ctrl' && (!e.ctrlKey || e.altKey || e.metaKey)) return false;
    if (bk.modifier === 'meta' && (!e.metaKey || e.altKey || e.ctrlKey)) return false;
    if (!bk.modifier && (e.altKey || e.ctrlKey || e.metaKey)) return false;
    return true;
}

function getBrightKey(button) {
    const bbs = button.querySelectorAll('bright');
    if (!bbs.length) return null;
    let bb = null;
    for (const b of bbs) {
        if (!b.hasAttribute('none')) {
            if (button.tagName === 'BUTTON') bb = b;
            else if (b.parentElement === button || b.parentElement.parentElement === button) bb = b;
        }
    }
    if (!bb) return null;
    return {
        key: bb.innerText.trim().toUpperCase(),
        modifier: bb.getAttribute('modifier'),
        none: bb.hasAttribute('none')
    };
}

function key2Symbol(k) {
    switch (k) {
        case 'ARROWUP': return '▲';
        case 'ARROWDOWN': return '▼';
        case 'ARROWLEFT': return '◄';
        case 'ARROWRIGHT': return '►';
        default: return k;
    }
}
