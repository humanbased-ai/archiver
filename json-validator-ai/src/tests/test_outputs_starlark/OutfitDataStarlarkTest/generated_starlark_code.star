def validate_data(data):
    reasons = []

    if not (type(data.get('taskId')) == 'string' and data.get('taskId')):
        reasons.append("'taskId' must be a non-empty string.")
    
    if not (type(data.get('templateId')) == 'string' and data.get('templateId')):
        reasons.append("'templateId' must be a non-empty string.")
    
    if not type(data.get('data')) == 'dict':
        reasons.append("'data' must be an object.")
    else:
        data_obj = data.get('data')
        if not (type(data_obj.get('top_image')) == 'string' and data_obj.get('top_image')):
            reasons.append("'top_image' must be a non-empty string.")
        
        if not (type(data_obj.get('bottom_image')) == 'string' and data_obj.get('bottom_image')):
            reasons.append("'bottom_image' must be a non-empty string.")
        
        if not (type(data_obj.get('full_outfit_image')) == 'string' and data_obj.get('full_outfit_image')):
            reasons.append("'full_outfit_image' must be a non-empty string.")

    if reasons:
        return {"is_valid": False, "reason": "; ".join(reasons)}
    
    return {"is_valid": True, "reason": "Data is valid."}