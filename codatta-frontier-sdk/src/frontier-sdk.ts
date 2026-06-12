import axios, { AxiosError, AxiosInstance, AxiosProgressEvent } from 'axios'
import Cookies from 'js-cookie'
import type {
  Response,
  PaginationResponse,
  TPagination,
  TaskDetail,
  FrontierItemType,
  SubmissionRecord,
  TaskInfo
} from './types'

export class FrontierSDK {
  private request: AxiosInstance

  constructor() {
    this.request = axios.create({
      timeout: 30000
    })

    this.setupRequestInterceptor()
    this.setupResponseInterceptor()
  }

  // ─── Interceptors ──────────────────────────────────────────────────────────

  private setupRequestInterceptor() {
    this.request.interceptors.request.use((config) => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isApp = userAgent.includes('codatta') || location.hash?.toLowerCase().includes('codatta')
      const token = Cookies.get('auth') || localStorage.getItem('auth')
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)

      if (token) config.headers['token'] = token
      config.headers['channel'] = isApp ? 'codatta-ios-app' : 'codatta-platform-website'
      config.headers['device'] = isMobile ? 'mobile' : 'web'

      return config
    })
  }

  private setupResponseInterceptor() {
    this.request.interceptors.response.use(
      (res) => {
        const data = res.data
        const isResTypeA = Object.getOwnPropertyNames(data).includes('code')
        const isResTypeB = Object.getOwnPropertyNames(data).includes('success')

        if (isResTypeA && data?.code !== '000000') {
          return Promise.reject(new AxiosError(data?.message, data?.code, res.config, res.request, res))
        }

        if (isResTypeB && data?.success !== true) {
          return Promise.reject(new AxiosError(data?.errorMessage, data?.errorCode, res.config, res.request, res))
        }

        return res
      },
      (err: AxiosError) => {
        if (err.status === 401) {
          localStorage.removeItem('uid')
          localStorage.removeItem('token')
          localStorage.removeItem('auth')
          const url = new URL(window.location.href)
          const from = url.pathname + url.search
          window.location.href = `/account/signin?from=${encodeURIComponent(from)}`
        }
        return Promise.reject(err)
      }
    )
  }

  // ─── API Methods ───────────────────────────────────────────────────────────

  /**
   * Fetch the full detail of a frontier task.
   * @param taskId - Unique task ID.
   * @returns Task detail including display data, submission state, and reward info.
   */
  async getTaskDetail(taskId: string): Promise<Response<TaskDetail>> {
    const res = await this.request.post<Response<TaskDetail>>('/api/v2/frontier/task/detail', { task_id: taskId })
    return res.data
  }

  /**
   * Submit user-provided data for a frontier task.
   * @param taskId - Unique task ID.
   * @param data - Submission payload. Shape depends on the task template.
   * @returns Updated task detail after submission.
   */
  async submitTask(taskId: string, data: object, uid?: string): Promise<Response<TaskDetail>> {
    const res = await this.request.post<Response<TaskDetail>>('/api/v2/frontier/task/submit', {
      task_id: taskId,
      data_submission: {
        uid,
        data,
        task_id: taskId,
      }
    })
    return res.data
  }

  /**
   * Fetch a paginated list of tasks for a given frontier.
   * @param params.frontier_id - The frontier to query tasks for.
   * @param params.page_num - Page number (1-based).
   * @param params.page_size - Number of tasks per page.
   * @param params.task_types - Optional comma-separated task type filter (e.g. `'submission,validation'`).
   * @returns Paginated list of task details.
   */
  async getTaskList(params: {
    frontier_id: string
    page_num: number
    page_size: number
    task_types?: string
  }): Promise<PaginationResponse<TaskDetail[]>> {
    const res = await this.request.post<PaginationResponse<TaskDetail[]>>('/api/v2/frontier/task/list', params)
    return res.data
  }

  /**
   * Fetch the current user's paginated submission history.
   * @param data.page_num - Page number (1-based).
   * @param data.page_size - Number of items per page.
   * @param data.frontier_id - Optional filter by frontier ID.
   * @param data.task_ids - Optional comma-separated list of task IDs to filter by.
   * @returns Paginated list of submission records.
   */
  async getSubmissionList(
    data: TPagination & {
      frontier_id?: string
      task_ids?: string
    }
  ): Promise<PaginationResponse<TaskDetail[]>> {
    const res = await this.request.post<PaginationResponse<TaskDetail[]>>('/api/v2/submission/list', data)
    return res.data
  }

  /**
   * Fetch metadata and configuration for a frontier.
   * @param frontierId - Unique frontier ID.
   * @returns Frontier info including name, description, rewards, and media links.
   */
  async getFrontierInfo(frontierId: string): Promise<Response<FrontierItemType>> {
    const res = await this.request.get<Response<FrontierItemType>>(`/api/v2/frontier/info?frontier_id=${frontierId}`)
    return res.data
  }

  /**
   * Fetch the detail of a single submission record.
   * @param submissionId - Unique submission ID.
   * @returns Full submission record including status, rating, and rewards.
   */
  async getSubmissionDetail(submissionId: string): Promise<Response<SubmissionRecord>> {
    const res = await this.request.get<Response<SubmissionRecord>>('/api/v2/submission/user/detail', {
      params: { submission_id: submissionId }
    })
    return res.data
  }

  /**
   * Upload a file to the Codatta file service.
   * @param file - The `File` object to upload.
   * @param onProgress - Optional callback invoked during upload with Axios progress events.
   * @returns An object containing `file_path` (server-side storage path) and `original_name`.
   */
  async uploadFile(
    file: File,
    onProgress?: (event: AxiosProgressEvent) => void
  ): Promise<{ file_path: string; original_name: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await this.request.post('/api/file/upload', formData, {
      params: {"content_type": file.type},
      onUploadProgress: onProgress
    })
    return res.data
  }

  /**
   * Fetch the info of a single spec task.
   * @param taskId - Unique task ID.
   * @returns Task info including status (`1` = pending, `2` = completed) and optional content.
   */
  async getSpecTaskInfo(taskId: string): Promise<Response<TaskInfo>> {
    const res = await this.request.get<Response<TaskInfo>>(`/api/v2/spec/task/info?task_id=${taskId}`)
    return res.data
  }

  /**
   * Fetch info for multiple spec tasks in a single request.
   * @param taskIds - Comma-separated list of task IDs (e.g. `'id1,id2,id3'`).
   * @returns Array of task info objects.
   */
  async getSpecTaskInfos(taskIds: string): Promise<Response<TaskInfo[]>> {
    const res = await this.request.get<Response<TaskInfo[]>>(`/api/v2/spec/task/infos?task_ids=${taskIds}`)
    return res.data
  }

  /**
   * Submit or update a spec task.
   * @param taskId - Unique task ID.
   * @param content - Optional freeform content to attach to the submission.
   * @param status - Submission status: `1` = reject, `2` = accept (default `2`).
   * @returns Updated task info after submission.
   */
  async submitSpecTask(taskId: string, content?: string, status?: 1 | 2): Promise<Response<TaskInfo>> {
    const res = await this.request.post<Response<TaskInfo>>('/api/v2/spec/task/submit', {
      task_id: taskId,
      status: status ?? 2,
      content
    })
    return res.data
  }

  /**
   * Request a verification code to be sent to the user's account.
   * @param params.account_type - Account type. Accepted values: `'email'` (default) | `'block_chain'`.
   * @param params.email - Target email address (e.g. `'xxx@gmail.com'`). Required when `account_type` is `'email'`.
   * @param params.opt - Operation type: `'verify'` (default) for email verification, `'vivolight'` for vivolight-related operations.
   * @returns The verification code string (relay it to `checkEmail` to complete verification).
   */
  async getVerificationCode({
    account_type,
    email,
    opt
  }: {
    account_type?: string
    email?: string
    opt?: string
  }): Promise<string> {
    const res = await this.request.post<Response<string>>('/api/v2/user/get_code', {
      account_type: account_type ?? 'email',
      email: email ?? '',
      opt: opt ?? 'verify'
    })
    return res.data.data
  }

  /**
   * Verify a user's email address against a task requirement.
   * @param params.email - The email address to verify.
   * @param params.code - The verification code obtained via `getVerificationCode`.
   * @param params.task_id - The task ID that requires email verification.
   * @returns `{ flag: true }` if verification passed; `{ flag: false, info: '<reason>' }` otherwise.
   */
  async checkEmail({
    email,
    code,
    task_id
  }: {
    email: string
    code: string
    task_id: string
  }): Promise<{ flag: boolean; info: string }> {
    const res = await this.request.post<Response<{ flag: boolean; info: string }>>('/api/v2/frontier/email/check', {
      email,
      code,
      task_id
    })
    return res.data.data
  }
}
