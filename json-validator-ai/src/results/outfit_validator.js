const data = JSON.parse(process.argv[2]);
let isValid = true; let reason = 'Outfit data is valid.';
if (!data || typeof data !== 'object') { isValid = false; reason = 'Data must be an object.'; }
else if (!data.taskId || typeof data.taskId !== 'string') { isValid = false; reason = 'Missing/invalid taskId'; }
else if (!data.templateId || typeof data.templateId !== 'string' || !data.templateId.startsWith('OOTD_TPL_')) { isValid = false; reason = 'Missing/invalid templateId'; }
else if (!data.data || typeof data.data !== 'object') { isValid = false; reason = 'Missing/invalid data object'; }
else {
    const d = data.data;
    const imageFields = ['top_image', 'bottom_image', 'full_outfit_image'];
    for (const field of imageFields) {
        if (!d[field] || !Array.isArray(d[field]) || d[field].length === 0) { isValid = false; reason = `Missing/invalid ${field} array or empty`; break; }
        for (const imgObj of d[field]) {
            if (typeof imgObj !== 'object') { isValid = false; reason = `Image object in ${field} is not an object`; break; }
            if (!imgObj.uid || typeof imgObj.uid !== 'string') { isValid = false; reason = `Missing/invalid uid in ${field}`; break; }
            if (!imgObj.url || typeof imgObj.url !== 'string' || !imgObj.url.match(/^https?:\/\//)) { isValid = false; reason = `Missing/invalid URL in ${field}`; break; }
            if (!imgObj.name || typeof imgObj.name !== 'string') { isValid = false; reason = `Missing/invalid name in ${field}`; break; }
        }
        if (!isValid) break;
    }
}
console.log(JSON.stringify({is_valid: isValid, reason: reason}));