import { AxiosProgressEvent } from 'axios'
import request from './base'

class CommonApi {
  uploadFile(file: File, onProgress?: (event: AxiosProgressEvent) => void) {
    const formData = new FormData()

    formData.append('file', file)

    return request.post('/file/upload', formData, {
      params: { content_type: 'multipart/form-data' },
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    })
  }
}

export default new CommonApi()
