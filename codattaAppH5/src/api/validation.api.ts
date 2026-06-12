import request from './base'

export enum TaskType {
  // # 提交的信息中source字段为空则为私有，创建类型1任务
  SUBMISSION_PRIVATE = 'SUBMISSION_PRIVATE',
  // # 提交的信息中交易hash和提交地址都存在，创建类型2的任务
  SUBMISSION_HASH_ADDRESS = 'SUBMISSION_HASH_ADDRESS',
  // # 提交的信息中图文和提交地址都存在，创建类型3的任务
  SUBMISSION_IMAGE_ADDRESS = 'SUBMISSION_IMAGE_ADDRESS',
  // # 提交的信息中图文和entity都存在，创建类型4的任务
  SUBMISSION_IMAGE_ENTITY = 'SUBMISSION_IMAGE_ENTITY',
  // # 查询仅只有1,3,4和旧的
  SUBMISSION_ONLY_IMAGE = 'SUBMISSION_ONLY_IMAGE',
  // SUBMISSION_OLD = null,
}
class ValidationApi {
  async getList(
    params: Codatta.Validation.ListParams,
  ): Promise<Codatta.Api.ResponseWithPagination<Codatta.Validation.ListItem[]>> {
    return await request.post('/tg/validation/query', params)
  }

  async getDetail(
    submission_id: string | number,
    task_type?: string | null,
    current_stage?: string,
  ): Promise<Codatta.Api.Response<Codatta.Validation.Detail>> {
    if(current_stage){
      return await request.post('/tg/validation/detail', {
        submission_id: submission_id,
        task_type,
        current_stage:  parseInt(current_stage || '', 10) 
      })
    }
    return await request.post('/tg/validation/detail', {
      submission_id: submission_id,
      task_type,
    })
  }

  validate(params: Codatta.Validation.ValidateParams) {
    return request.post('/tg/validation/post', {
      submission_id: params.submission_id,
      reason: JSON.stringify(params.reason),
      decision: params.decision,
      task_type: params.task_type,
    })
  }

  hold(validation_id: string | number, stage: number, task_type?: string) {
    return request.post('/tg/certificate/claim', {
      biz_type: `VALIDATION_S${stage}`,
      biz_id: validation_id,
      task_type,
    })
  }
}

export default new ValidationApi()
