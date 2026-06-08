def validate_image_object(img_obj, field_name):
    if type(img_obj) != 'dict': return (False, 'Image object in %s is not a dict' % field_name)
    if not img_obj.get('uid') or type(img_obj.get('uid')) != 'string': return (False, 'Missing/invalid uid in %s' % field_name)
    if not img_obj.get('url') or type(img_obj.get('url')) != 'string' or not (img_obj.get('url').startswith('http://') or img_obj.get('url').startswith('https://')) : return (False, 'Missing/invalid URL in %s' % field_name)
    if not img_obj.get('name') or type(img_obj.get('name')) != 'string': return (False, 'Missing/invalid name in %s' % field_name)
    return (True, '')

def validate_data(data):
    if type(data) != 'dict': return {"is_valid": False, "reason": "Data must be a dict."}
    if not data.get('taskId') or type(data.get('taskId')) != 'string': return {"is_valid": False, "reason": "Missing/invalid taskId"}
    if not data.get('templateId') or type(data.get('templateId')) != 'string' or not data.get('templateId').startswith('OOTD_TPL_'): return {"is_valid": False, "reason": "Missing/invalid templateId"}
    d = data.get('data')
    if not d or type(d) != 'dict': return {"is_valid": False, "reason": "Missing/invalid data object"}
    
    image_fields = ['top_image', 'bottom_image', 'full_outfit_image']
    for field in image_fields:
        if not d.get(field) or type(d.get(field)) != 'list' or len(d.get(field)) == 0:
            return {"is_valid": False, "reason": 'Missing/invalid %s array or empty' % field}
        for img_obj in d[field]:
            is_img_valid, reason = validate_image_object(img_obj, field)
            if not is_img_valid: return {"is_valid": False, "reason": reason}
    return {"is_valid": True, "reason": "Outfit data is valid."}