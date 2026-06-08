def validate_data(data):
    reasons = []

    if not (type(data.get('taskId')) == 'string' and data.get('taskId')):
        reasons.append("'taskId' must be a non-empty string.")
    
    if not (type(data.get('templateId')) == 'string' and data.get('templateId')):
        reasons.append("'templateId' must be a non-empty string.")
    
    if not (type(data.get('data')) == 'dict'):
        reasons.append("'data' must be an object.")
    else:
        data_obj = data.get('data')
        
        if not (type(data_obj.get('language')) == 'string' and data_obj.get('language')):
            reasons.append("'language' must be a non-empty string.")
        
        if not (type(data_obj.get('speech_audio')) == 'string' and data_obj.get('speech_audio')):
            reasons.append("'speech_audio' must be a non-empty string.")
        
        if not (type(data_obj.get('speech_text')) == 'string' and data_obj.get('speech_text')):
            reasons.append("'speech_text' must be a non-empty string.")
    
    if reasons:
        return {"is_valid": False, "reason": "; ".join(reasons)}
    return {"is_valid": True, "reason": "Data is valid."}