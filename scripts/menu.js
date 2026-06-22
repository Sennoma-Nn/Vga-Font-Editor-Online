function toggleSubmenu(el) {
    el.classList.toggle('submenu-open');
}

function closeMenu(id) {
    return `
        if (!event.shiftKey) {
            event.stopPropagation();
            menuManager.close('${id}');
        }
    `
}

const menuManager = {
    toggle(id, btn) {
        const menu = document.getElementById(id);
        if (!menu) return;

        this.closeAll(id);

        if (menu.classList.contains('show')) {
            menu.classList.remove('show');
            this.closeAllSubmenus(menu);
            btn.classList.remove('hover');
            return;
        }

        const rect = btn.getBoundingClientRect();
        menu.style.left = rect.left + 'px';
        menu.style.top = rect.bottom + 'px';
        menu.classList.add('show');
        btn.classList.add('hover');
    },

    closeAll(exceptId = null) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            if (menu.id !== exceptId) {
                menu.classList.remove('show');
                this.closeAllSubmenus(menu);
                const btn = document.querySelector(`button[onclick*="${menu.id}"]`);
                if (btn) btn.classList.remove('hover');
            }
        });
    },

    close(id) {
        const menu = document.getElementById(id);
        if (menu) {
            menu.classList.remove('show');
            this.closeAllSubmenus(menu);
            const btn = document.querySelector(`button[onclick*="${menu.id}"]`);
            if (btn) btn.classList.remove('hover');
        }
    },

    closeAllSubmenus(container) {
        container.querySelectorAll('.submenu-open').forEach(el => el.classList.remove('submenu-open'))
    }
}

document.addEventListener('click', (e) => {
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        const btn = document.querySelector(`button[onclick*="${menu.id}"]`);
        if (((!e.target.closest(`#${menu.id}`)) && (!btn || !btn.contains(e.target)))) {
            menu.classList.remove('show');
            menuManager.closeAllSubmenus(menu);
            if (btn) btn.classList.remove('hover');
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (editorData.inputmode === 'goto' || editorData.inputmode === 'name') return;

    const openMenus = document.querySelectorAll('.dropdown-menu.show');
    if (!openMenus.length) return;

    const lastMenu = openMenus[openMenus.length - 1];
    const submenus = lastMenu.querySelectorAll('.submenu-open');
    if (submenus.length) {
        submenus[submenus.length - 1].classList.remove('submenu-open');
    } else {
        lastMenu.classList.remove('show');
        const btn = document.querySelector(`button[onclick*="${lastMenu.id}"]`);
        if (btn) btn.classList.remove('hover')
    }
});
