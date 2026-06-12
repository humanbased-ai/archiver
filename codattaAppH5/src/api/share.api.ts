import request from './base'

export const socialCodeMap = {
  [Codatta.Share.SocialName.Link]: Codatta.Share.SocialCode.Link,
  [Codatta.Share.SocialName.Telegram]: Codatta.Share.SocialCode.Telegram,
  [Codatta.Share.SocialName.Twitter]: Codatta.Share.SocialCode.Twitter,
}

export const shareTypeSourceTypeMap = {
  [Codatta.Share.Type.Validation]: 'VALIDATION',
  [Codatta.Share.Type.BountyAddress]: 'BOUNTY_ADDRESS',
  [Codatta.Share.Type.BountyEntity]: 'BOUNTY_ENTITY',
  [Codatta.Share.Type.Submission]: 'VALIDATION',
}

class ShareApi {
  getShareLink(type: Codatta.Share.Type, id: string, channel: string = 'link') {
    return request
      .post<Codatta.Share.ShareLinkDTO>('/tg/share/link', {
        source_type: shareTypeSourceTypeMap[type],
        source_id: id,
        share_channel: channel.toUpperCase(),
      })
      .then((res) => res.data)
  }
}

export default new ShareApi()
