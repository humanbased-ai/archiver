def validate_data(data):
    reasons = []

    if not (type(data.get('taskId')) == 'string' and data.get('taskId')):
        reasons.append("'taskId' must be a non-empty string.")
    
    if not (type(data.get('templateId')) == 'string' and data.get('templateId')):
        reasons.append("'templateId' must be a non-empty string.")
    
    if not type(data.get('data')) == 'dict':
        reasons.append("'data' must be an object.")
    else:
        images = data['data'].get('images')
        if not (type(images) == 'list' and len(images) > 0 and all(type(img) == 'string' and img for img in images)):
            reasons.append("'images' must be a list of at least one non-empty string.")
        
        food_description = data['data'].get('food_description')
        if not (type(food_description) == 'string' and food_description):
            reasons.append("'food_description' must be a non-empty string.")
    
    if reasons:
        return {"is_valid": False, "reason": "; ".join(reasons)}
    
    return {"is_valid": True, "reason": "Data is valid."}