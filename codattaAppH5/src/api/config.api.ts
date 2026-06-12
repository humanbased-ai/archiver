import request from './base'

class ConfigApi {
  getNetworks() {
    return request.post<string[]>('/tg/config/networks').then((res) => res.data)
  }

  getCategories(entity?: string) {
    return request
      .post<{ key: string; children: Codatta.Config.Category }[]>('/tg/config/categories', { entity })
      .then((res) => res.data)
  }

  getEntities() {
    return request.post<string[]>('/tg/config/entries').then((res) => res.data)
  }

  getExplorer(network: string) {
    return request.post('/tg/config/network/get_explorer', { network })
  }
}

export default new ConfigApi()
