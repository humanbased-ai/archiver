namespace Codatta.Api {
  interface PaginationParam {
    page?: number
    page_size?: number
  }

  interface PaginationRes {
    current: number
    pageSize: number
    total?: number
  }

  interface Response<T> {
    data: T
    success: boolean
    errorCode: number
    errorMessage: string
    file_path?: string
    task_finish_notice?: TaskFinishNoticItem[]
  }

  interface ResponseWithPagination<T> extends Response<T> {
    total_count: number
    total_page: number
    page: number
  }
}
