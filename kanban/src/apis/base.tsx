import axios from 'axios'

const request = axios.create()

// Get method with caching support
const get = async (url: string, params = {}) => {
  const response = await request.get(url, {
    params,
  })

  return response.data
}

// Post method with caching support
const post = async (url: string, data = {}) => {
  const response = await request.post(url, data)

  return response.data
}

export { get, post }

