let currentLangData = {}

function lang(key, sd = true) {
    let r = currentLangData[key];
    if (r === undefined) return '';
    if (typeof r !== 'string') return r;
    if (sd) return toShiftDownTag(r);
    return r;
}

async function loadLanguage() {
    const params = new URLSearchParams(window.location.search);
    const langCode = params.get('lang');

    const response = await fetch('scripts/local.json');
    const data = await response.json();

    currentLangData = { ...data['en'] };

    if (langCode && data[langCode]) {
        currentLangData = { ...currentLangData, ...data[langCode] };
    }

}
