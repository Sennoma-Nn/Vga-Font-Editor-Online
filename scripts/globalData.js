const emptyTabData = {
    name: 'UNTITLED.RAW',
    index: 0,
    changedData: '',
    mode: 'normal',
    codePage: '437',
    fontInfo: {
        height: 16,
        data: []
    }
}

let editorData = {
    about: {
        version: '0.2.3',
        github: 'https://github.com/Sennoma-Nn/Vga-Font-Editor-Online'
    },
    tab: 0,
    page: 'editor',
    tabsData: [
        structuredClone(emptyTabData)
    ],
    inputmode: 'normal',
    stringInput: '',
    clipboard: {
        data: '',
        height: NaN
    },
    setting: {
        showHelp: true,
        metaKey: 'alt'
    }
}
