import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import uploadApi from '@/api/common.api'
import { Toast } from 'react-vant'
import Trash from '@/assets/images/ads/trash.svg'
import adsApi from '@/api/ads.api'
import PageHead from '@/components/page/page-head'

type UploadFileComProps = {
  type: string
  imageUrl?: string
  onUpload: (type: string, url: string) => void
  onDelete: (type: string) => void
  customClass?: string // Add this line
  customStyle?: React.CSSProperties
}

function UploadFileCom(props: UploadFileComProps) {
  const uploadBoxRef = useRef(null)
  const { type, imageUrl, onUpload, onDelete, customClass, customStyle } = props

  const handleFileChange = async (type: string, event: React.ChangeEvent<HTMLInputElement>) => {
    Toast({
      message: 'Loading...',
      type: 'loading',
      duration: 0,
      teleport: uploadBoxRef.current as unknown as HTMLElement,
    })
    const files = event.target.files
    if (files) {
      const res = (await uploadApi.uploadFile(files[0])) as unknown as {
        errorCode: number
        file_path: string
        message: string
      }
      if (!res || res.errorCode !== 0) {
        Toast.clear()
        Toast({ message: res.message, type: 'fail' })
        return
      }
      onUpload(type, res.file_path)
    }
    Toast.clear()
  }

  return (
    <div
      ref={uploadBoxRef}
      className={`flex h-[120px] items-center justify-center overflow-hidden rounded-xl border border-white border-opacity-15 ${customClass}`}
      style={customStyle}
    >
      {imageUrl ? (
        <div className="relative h-full w-full">
          <img src={imageUrl} className="h-full w-full object-contain" alt="" />

          <img
            src={Trash}
            alt=""
            className="absolute bottom-2 left-[50%] z-20 h-6 w-6"
            style={{ transform: 'translateX(-50%)' }}
            onClick={() => onDelete(type)}
          />
          <div className="absolute bottom-0 top-0 z-10 h-full w-full bg-[#00000033]"></div>
        </div>
      ) : (
        <label htmlFor="file-upload" className="flex h-full w-full cursor-pointer items-center justify-center">
          <Plus />
          <input
            id="file-upload"
            type="file"
            onChange={(e) => handleFileChange(type, e)}
            style={{ display: 'none' }}
            accept="image/*"
          />
        </label>
      )}
    </div>
  )
}

export function Component() {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>()
  const [eduAndOccUrls, setEduAndOccUrls] = useState<Array<string>>([])
  const [web3AssetPhotoUrl, setWeb3AssetPhotoUrl] = useState<string>()
  const [linkedinUrl, setLinkedinUrl] = useState<string>()
  const [isDisabled, setIsDisabled] = useState<boolean>(false)
  const navigate = useNavigate()

  const onUploadFn = (type: string, url: string) => {
    switch (type) {
      case '1':
        setProfilePhotoUrl(url)
        break
      case '2-1':
        eduAndOccUrls.push(url)
        setEduAndOccUrls([...eduAndOccUrls])
        break
      case '2-2':
        eduAndOccUrls.push(url)
        setEduAndOccUrls([...eduAndOccUrls])
        break
      case '3':
        setWeb3AssetPhotoUrl(url)
        break
    }
  }

  const deleteImageUrl = (type: string) => {
    switch (type) {
      case '1':
        setProfilePhotoUrl('')
        break
      case '2-1':
        eduAndOccUrls.splice(0, 1)
        setEduAndOccUrls([...eduAndOccUrls])
        break
      case '2-2':
        eduAndOccUrls.splice(1, 1)
        setEduAndOccUrls([...eduAndOccUrls])
        break
      case '3':
        setWeb3AssetPhotoUrl('')
        break
    }
  }

  async function onNextClick() {
    try {
      const res = await adsApi.saveVerification({
        profile_photo_url: profilePhotoUrl as string,
        education_photo_url: eduAndOccUrls[0],
        occupation_photo_url: eduAndOccUrls[1],
        web3_asset_photo_url: web3AssetPhotoUrl as string,
        linkedin_url: linkedinUrl as string,
      })
      console.log(res)
      navigate(-1)

      Toast({ message: 'Vefify success' })
    } catch (err: any) {
      Toast({ message: err.message, type: 'fail' })
    }
  }

  function handleChange(value: any) {
    const regex = /\b(?:https?:\/\/)?(?:www\.)?(.*?linkedin\.com)(?:\/[^\s]*)?\b/i
    if (regex.test(value)) {
      setLinkedinUrl(value)
    } else {
      Toast({
        message: 'Please provide the page address within the linkedin.com website',
        type: 'fail',
      })
    }
  }

  useEffect(() => {
    if (profilePhotoUrl && web3AssetPhotoUrl && linkedinUrl && eduAndOccUrls.length === 2) {
      setIsDisabled(false)
    } else {
      setIsDisabled(true)
    }
  }, [profilePhotoUrl, web3AssetPhotoUrl, linkedinUrl, eduAndOccUrls])

  return (
    <>
      <PageHead title="User annotation staking verification"></PageHead>
      <div className="p-4">
        <div className="mb-4">
          <h2 className="mb-1 text-base font-bold">1. Verifier Photo（Age & Gender）</h2>
          <p className="mb-3 text-sm text-[#bbbbbe]">Verifier Photo (Age & Gender)</p>
          <UploadFileCom key="1" type="1" imageUrl={profilePhotoUrl} onUpload={onUploadFn} onDelete={deleteImageUrl} />
        </div>

        <div className="mb-4">
          <h2 className="mb-1 text-base font-bold">2. Verify through either of the following methods:</h2>
          <p className="mb-3 text-sm text-[#bbbbbe]">1.Connect your LinkedIn account.</p>
          <div>
            <input
              className="flex w-full items-center gap-2 rounded-xl border border-white border-opacity-10 bg-transparent p-3 text-sm font-bold leading-[22px] placeholder:text-[#404049]"
              type="text"
              value={linkedinUrl}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Enter LinkedIn Address"
            />
          </div>
          <p className="mb-3 mt-4 text-sm text-[#bbbbbe]">
            2.Supporting images for educational background and occupation
          </p>
          {
            <div className="flex items-center gap-3">
              <UploadFileCom
                type="2-1"
                key="2-1"
                customStyle={{ width: 'calc(50% - 6px)' }}
                imageUrl={eduAndOccUrls[0]}
                onUpload={onUploadFn}
                onDelete={deleteImageUrl}
              />
              {eduAndOccUrls[0] && (
                <UploadFileCom
                  key="2-2"
                  type="2-2"
                  customStyle={{ width: 'calc(50% - 6px)' }}
                  imageUrl={eduAndOccUrls[1]}
                  onUpload={onUploadFn}
                  onDelete={deleteImageUrl}
                />
              )}
            </div>
          }
        </div>

        <div className="mb-4">
          <h2 className="mb-3 text-base font-bold">3. Proof of Assets</h2>
          <UploadFileCom
            key="3"
            type="3"
            imageUrl={web3AssetPhotoUrl}
            onUpload={onUploadFn}
            onDelete={deleteImageUrl}
          />
        </div>

        <div>
          <button
            className="w-full rounded-full bg-primary py-3 text-white disabled:bg-opacity-10 disabled:text-opacity-50"
            disabled={isDisabled}
            onClick={onNextClick}
          >
            Next
          </button>
        </div>
      </div>
    </>
  )
}
