namespace Codatta.Validation {
  interface ListItem {
    id: number
    gmt_create: string
    gmt_modified: string
    submission_id: string
    stage: number
    current_stage: string
    address: string
    network: string
    category: string
    entity: string
    current_vote: number
    max_vote: number
    points_every_voter: number
    status: string
    ext_info: any
    point: number
    send_point: number
    gmt_expiration: string
    send_point?: number
    task_type: string
    submission_evidence:string
  }

  interface Detail {
    adopt?: boolean
    submission_id: string
    validation_id: null
    user_id: string
    task_type:string,
      point: number
      basic_info: {
      address: string
      network: string
      category: string
      entity: string
      evidence: string
      source: string
      submit_time: string
      status: string
    }
    decision: null | {
      decision: string
    send_point:number,
    reason: string
    }
    explorer_link: {
      address_link: string
      base_link?: string
      hash_match?: string
    }
    existing_data: string[]
    submitter_info: {
      hunting_count: number
      hunting_s2_pass_count: number
      hunting_s2_pass_proportion: number
      hunting_s2_review_count: number
      points: number
      reputation: number
      s2_pass_count: number
      s2_pass_proportion: number
      s2_review_count: number
      s2_review_proportion: number
      submission_count: number
    }
  }

  interface Evidence {
    text: string
    date: number
    link: string
    hash: string
    translation: string
    files: {
      filename: string
      path: string
    }[]
  }

  interface ListParams extends Api.PaginationParam {
    status: 'NotStart' | 'OnHold' | 'InProgress' | 'Completed'
    stage: number
    network: string
    category: string
    entity: string
    address: string
    sort: 'DESC' | 'ASC' // ASC
    type: 'Point' | 'Date' // Date
    decision: string
    data_type: string
    task_type?: string
  }

  interface ValidateParams {
    submission_id: string
    decision: string
    reason: {
      text: string
      files: { filename: string; path: string }[]
    }
    task_type?: string
  }

  
}
