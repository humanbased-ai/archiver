namespace Codatta.Share {
  enum Type {
    Validation = 'VALIDATION',
    BountyAddress = 'BOUNTY_ADDRESS',
    BountyEntity = 'BOUNTY_ENTITY',
    Submission = 'SUBMISSION',
  }

  enum SocialName {
    Link = '',
    Telegram = 'telegram',
    Twitter = 'twitter',
  }

  enum SocialCode {
    Link,
    Telegram,
    Twitter,
  }

  interface ShareLinkDTO {
    source_id: string
    source_type: Type
    share_id: string
    link: string
  }
}
