import re

def validate_data(data):
    if not isinstance(data, dict): return {"is_valid": False, "reason": "Data must be a dict."}
    if not data.get('taskId') or not isinstance(data.get('taskId'), str): return {"is_valid": False, "reason": "Missing/invalid taskId"}
    if not data.get('templateId') or not isinstance(data.get('templateId'), str) or not data['templateId'].startswith('OOTD_TPL_'): return {"is_valid": False, "reason": "Missing/invalid templateId"}
    d = data.get('data')
    if not d or not isinstance(d, dict): return {"is_valid": False, "reason": "Missing/invalid data object"}
    
    image_fields = ['top_image', 'bottom_image', 'full_outfit_image']
    for field in image_fields:
        if not d.get(field) or not isinstance(d.get(field), list) or len(d.get(field)) == 0:
            return {"is_valid": False, "reason": f"Missing/invalid {field} array or empty"}
        for img_obj in d[field]:
            if not isinstance(img_obj, dict): return {"is_valid": False, "reason": f"Image object in {field} is not a dict"}
            if not img_obj.get('uid') or not isinstance(img_obj.get('uid'), str): return {"is_valid": False, "reason": f"Missing/invalid uid in {field}"}
            if not img_obj.get('url') or not isinstance(img_obj.get('url'), str) or not re.match(r'^https?://', img_obj['url']): return {"is_valid": False, "reason": f"Missing/invalid URL in {field}"}
            if not img_obj.get('name') or not isinstance(img_obj.get('name'), str): return {"is_valid": False, "reason": f"Missing/invalid name in {field}"}
    return {"is_valid": True, "reason": "Outfit data is valid."}