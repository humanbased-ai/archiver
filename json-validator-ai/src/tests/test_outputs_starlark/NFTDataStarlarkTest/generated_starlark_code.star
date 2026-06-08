def validate_data(data):
    reasons = []
    
    if not (type(data.get('taskId')) == 'string' and data.get('taskId')):
        reasons.append("'taskId' must be a non-empty string.")
    
    if not (type(data.get('templateId')) == 'string' and data.get('templateId')):
        reasons.append("'templateId' must be a non-empty string.")
    
    if not (type(data.get('data')) == 'dict'):
        reasons.append("'data' must be an object.")
    else:
        nft_data = data.get('data')
        if not (type(nft_data.get('nft_image')) == 'string' and nft_data.get('nft_image')):
            reasons.append("'nft_image' must be a non-empty string.")
        
        if not (type(nft_data.get('nft_description')) == 'string' and nft_data.get('nft_description')):
            reasons.append("'nft_description' must be a non-empty string.")
    
    if reasons:
        return {"is_valid": False, "reason": " ".join(reasons)}
    
    return {"is_valid": True, "reason": "Data is valid."}