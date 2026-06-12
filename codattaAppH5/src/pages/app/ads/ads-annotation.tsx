import { cn } from '@udecode/cn'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Check, CircleX, Search, Loader2, X } from 'lucide-react'
import { Popup, Toast } from 'react-vant'
import adsApi from '@/api/ads.api'
import { useBackButton } from '@/features/tg/hooks/use-back-button'
import { useLocation, useNavigate } from 'react-router-dom'
import usdtIcon from '@/assets/images/ads/usdt-icon.png'
import PageHead from '@/components/page/page-head'

function Agreement(props: { visible: boolean; onAgree: () => Promise<void>; onClose: () => void }) {
  const [canAgree, setCanAgree] = useState(false)
  const [countDown, setCountDown] = useState(10)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 倒计时10s用户才可以点击按钮
    // 每秒变化时，需要更新按钮的文案
    let timer: NodeJS.Timeout
    let count = 10
    if (props.visible) {
      timer = setInterval(() => {
        count = count - 1
        setCountDown(count)
        if (count === 0) {
          setCanAgree(true)
          clearInterval(timer)
        }
      }, 1000)
    }

    return () => {
      clearInterval(timer)
    }
  }, [props.visible])

  async function handleAgree() {
    setLoading(true)
    await props.onAgree()
    setLoading(false)
  }

  function handleClose() {
    props.onClose()
  }

  return (
    <Popup visible={props.visible} position="bottom" className="h-[95%] rounded-t-3xl bg-gray-800">
      <div className="relative flex h-full flex-col px-4 py-6">
        <button disabled={loading} className="absolute right-4 top-4 text-white" onClick={handleClose}>
          <X></X>
        </button>
        <h1 className="shrink-0 text-center text-base font-bold leading-6 text-white">User Agreement</h1>
        <div className="mb-4 mt-4 overflow-scroll leading-[18px]">
          <h2 className="text-base font-bold text-white">Software User Agreement</h2>
          <p className="text-xs text-gray-300">
            This Software User Agreement ("Agreement") is made between Codatta ("Company") and the user ("User"). By
            participating in our exclusive ad program, the User agrees to the following terms and conditions:
          </p>
          <ol type="i" className="list-decimal pl-5">
            <li className="text-white">
              <h1 className="text-4 font-bold leading-6">Eligibility and User Information</h1>
              <ol style={{ listStyleType: 'lower-alpha' }} className="pl-3">
                <li className="text-xs text-gray-300">
                  The program is only available for selected users. The User agrees to provide accurate basic
                  information as requested. Misrepresentation may result in forfeiture of stakes and termination of the
                  program.
                </li>
              </ol>
            </li>
            <li className="font-bold text-white">
              <h1 className="text-4 font-bold leading-6">Ad Engagement and Staking</h1>
              <ol style={{ listStyleType: 'lower-alpha' }} className="pl-3">
                <li className="text-xs text-gray-300">
                  The User will have the option to select from a list of ads and engage with preferred ones.
                </li>
                <li className="text-xs text-gray-300">
                  Users may be offered the option to stake and earn rewards. Redemption of stakes can be requested after
                  7 days, following the provided instructions.
                </li>
              </ol>
            </li>
            <li className="font-bold text-white">
              <h1 className="text-4 font-bold leading-6">Rewards and Forfeiture</h1>
              <ol style={{ listStyleType: 'lower-alpha' }} className="pl-3">
                <li className="text-xs text-gray-300">
                  Rewards for staking are determined by the Company and may change.
                </li>
                <li className="text-xs text-gray-300">
                  The Company reserves the right to forfeit stakes if the User abuses the program, including providing
                  false information.
                </li>
              </ol>
            </li>
            <li className="font-bold text-white">
              <h1 className="text-4 font-bold leading-6">Termination and Modifications</h1>
              <ol style={{ listStyleType: 'lower-alpha' }} className="pl-3">
                <li className="text-xs text-gray-300">
                  The Company reserves the right to terminate participation at any time, with or without cause.
                </li>
                <li className="text-xs text-gray-300">
                  The Company may modify this Agreement at any time. Continued participation constitutes acceptance of
                  the modified terms.
                </li>
              </ol>
            </li>
            <li className="font-bold text-white">
              <h1 className="text-4 font-bold leading-6">Governing Law</h1>
              <ol style={{ listStyleType: 'lower-alpha' }} className="pl-3">
                <li className="text-xs text-gray-300">
                  This Agreement is governed by the laws of the British Virgin Islands.
                </li>
                <li className="text-xs text-gray-300">
                  By participating, the User acknowledges reading, understanding, and agreeing to this Agreement.
                </li>
              </ol>
            </li>
          </ol>
          <p className="mt-2 text-xs text-gray-300">
            By participating, the User acknowledges reading, understanding, and agreeing to this Agreement.
          </p>
          <br />
          <p className="text-xs text-gray-300">
            *Codatta reserves the right to final interpretation of this event. In cases where malicious activities aimed
            at manipulating the experiment are detected, any additional rewards from staking will be forfeited. However,
            the stake principal will be refunded.
          </p>
        </div>
        <div className="flex">
          <button
            disabled={!canAgree || loading}
            onClick={handleAgree}
            className="flex w-full justify-center rounded-full bg-[#D355FF] px-4 py-3 text-sm text-white disabled:bg-white disabled:bg-opacity-10 disabled:text-opacity-50"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              `I have read and agree to this agreement. ${countDown > 0 ? `(${countDown})s` : ''}`
            )}
          </button>
        </div>
      </div>
    </Popup>
  )
}

function SelectOption(props: {
  icon?: string
  selected: boolean
  text: string
  key: string | number
  onSelected: (key: string | number) => void
}) {
  const { selected, text, key, onSelected, icon } = props

  return (
    <div
      className="flex items-center border-b border-b-white border-opacity-10 px-6 py-4 text-sm last:border-b-0"
      onClick={() => onSelected(key)}
    >
      {icon && <img src={icon} className="mr-2 h-5 w-5" alt="" />}
      <span>{text}</span>
      <div
        className={cn(
          'ml-auto flex h-5 w-5 items-center justify-center rounded-full border border-white bg-transparent transition-all',
          selected ? 'bg-white' : '',
        )}
      >
        <Check size={12} className={cn('text-transparent', selected ? 'text-[#252532]' : '')}></Check>
      </div>
    </div>
  )
}

function FormItem(props: { title: string; value?: string; placeholder: string; onClick: () => void }) {
  const { title, value, placeholder, onClick } = props

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div
        className="flex cursor-pointer items-center rounded-xl border border-white border-opacity-15 p-3"
        onClick={onClick}
      >
        <div className={cn('min-w-0 truncate whitespace-nowrap', !value ? 'text-gray-400' : '')}>
          {!value ? placeholder : value}
        </div>
        <div className="ml-auto shrink-0">
          <ChevronDown size={20} />
        </div>
      </div>
    </div>
  )
}

function PopupSelector(props: {
  visible: boolean
  options: Codatta.Ads.AdsAnnoationDictItem[]
  onChange: (option: Codatta.Ads.AdsAnnoationDictItem) => void
  onClose: () => void
  value: Codatta.Ads.AdsAnnoationDictItem | null
}) {
  const { options, onChange, visible, onClose, value } = props

  return (
    <Popup className="rounded-t-3xl bg-[#252532] text-white" visible={visible} position="bottom" onClose={onClose}>
      <div className="py-2">
        {options.map((item) => {
          return (
            <SelectOption
              icon={item.icon}
              key={item.dict_id}
              text={item.display_name}
              selected={value?.dict_id === item.dict_id}
              onSelected={() => onChange(item)}
            ></SelectOption>
          )
        })}
      </div>
    </Popup>
  )
}

function PopupSearchSelector(props: {
  visible: boolean
  options: Codatta.Ads.AdsAnnoationDictItem[]
  onChange: (option: Codatta.Ads.AdsAnnoationDictItem) => void
  onClose: () => void
  value: Codatta.Ads.AdsAnnoationDictItem | null
}) {
  const { options, onChange, visible, onClose, value } = props
  const [search, setSearch] = useState('')

  const filteredOptions = useMemo(() => {
    if (!search) return options
    return options.filter((item) => {
      return item.display_name.toLowerCase().includes(search.toLowerCase())
    })
  }, [search, visible])

  return (
    <Popup
      className="h-[86%] overflow-hidden rounded-t-3xl bg-[#252532] text-white"
      visible={visible}
      position="bottom"
      onClose={onClose}
    >
      <div className="h-full overflow-y-scroll [&:-webkit-scrollbar]:hidden">
        <div className="sticky top-0 bg-[#252532] p-4">
          <div className="flex w-full items-center rounded-full border border-white border-opacity-15 bg-transparent px-4">
            <Search className="h-5 w-5 opacity-40"></Search>
            <input
              className="w-full appearance-none border-none bg-transparent outline-none active:shadow-none"
              placeholder="Search"
              onInput={(e: any) => setSearch(e.target.value)}
            ></input>
          </div>
        </div>
        <div className="px-6">
          {filteredOptions.length > 0
            ? filteredOptions.map((item) => {
                return (
                  <div
                    key={item.dict_id}
                    className="border-b border-b-white border-opacity-15 py-3 active:bg-white active:bg-opacity-10"
                    onClick={() => onChange(item)}
                  >
                    {item.display_name}
                  </div>
                )
              })
            : 'This occupation is currently unavailable for selection. You may choose “Other.”'}
        </div>
      </div>
    </Popup>
  )
}

function AnnotationProgress(props: { score: number; total: number }) {
  const { score, total } = props
  const [finalScore, setFinalScore] = useState(score)
  const len = Math.PI * 2 * 77

  useEffect(() => {
    const targetNumber = score
    const duration = 200
    const interval = 10
    const totalSteps = duration / interval
    const step = (targetNumber - finalScore) / totalSteps

    const timer = setInterval(() => {
      setFinalScore((prevNumber) => {
        if (prevNumber === targetNumber) {
          clearInterval(timer)
          return targetNumber
        }

        const newValue = prevNumber + step
        return Math.round(newValue)
      })
    }, interval)

    return () => clearInterval(timer)
  }, [score])

  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute top-12">
        <div className="text-center text-2xl font-extrabold">{finalScore}</div>
        <div className="text-xs text-gray-300">Vault Completeness</div>
      </div>
      <svg width={160} height={160}>
        <circle
          r="77"
          cx="80"
          cy="80"
          stroke-linecap="round"
          stroke-width="6"
          stroke="#D355FF"
          fill="none"
          strokeDasharray={`${(len - 120) * (score / total)} ${len}`}
          className="origin-center rotate-[134deg] transition-all"
        ></circle>
        <circle
          r="77"
          cx="80"
          cy="80"
          stroke-linecap="round"
          stroke-width="6"
          stroke="#ffffff30"
          fill="none"
          strokeDasharray={`${len - 120} ${len}`}
          className="origin-center rotate-[134deg]"
        ></circle>
      </svg>
    </div>
  )
}

export function Component() {
  const [submitLoading, setSubmitLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  // selected values
  const [gender, setGender] = useState<Codatta.Ads.AdsAnnoationDictItem | null>(null)
  const [age, setAge] = useState<Codatta.Ads.AdsAnnoationDictItem | null>(null)
  const [country, setCountry] = useState<Codatta.Ads.AdsAnnoationDictItem | null>(null)
  const [education, setEducation] = useState<Codatta.Ads.AdsAnnoationDictItem | null>(null)
  const [vocation, setVocation] = useState<Codatta.Ads.AdsAnnoationDictItem | null>(null)
  const [assets, setAssets] = useState<Codatta.Ads.AdsAnnoationDictItem | null>(null)

  // selectors show status
  const [showAgeSelector, setShowAgeSelector] = useState(false)
  const [showCountrySelector, setShowCountrySelector] = useState(false)
  const [showEducationSelector, setShowEducationSelector] = useState(false)
  const [showVocationSelector, setShowVocationSelector] = useState(false)
  const [showAssetsSelector, setShowAssetsSelector] = useState(false)

  // dicts
  const [ageDict, setAgeDict] = useState<Codatta.Ads.AdsAnnoationDictItem[]>([])
  const [countryDict, setCountryDict] = useState<Codatta.Ads.AdsAnnoationDictItem[]>([])
  const [educationDict, setEducationDict] = useState<Codatta.Ads.AdsAnnoationDictItem[]>([])
  const [vocationDict, setVocationDict] = useState<Codatta.Ads.AdsAnnoationDictItem[]>([])
  const [assetsDict, setAssetsDict] = useState<Codatta.Ads.AdsAnnoationDictItem[]>([])

  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state

  // agreement
  const [adsState, setAdsState] = useState<Codatta.Ads.AdsState | null>(null)
  const [agreementVisible, setAgreementVisible] = useState(false)

  const score = useMemo(() => {
    let score = 0
    if (gender) score += 15
    if (age) score += 10
    if (country) score += 15
    if (education) score += 20
    if (vocation) score += 20
    if (assets) score += 20

    return score
  }, [age, gender, country, education, vocation, assets])

  function handleChange(key: string, item: Codatta.Ads.AdsAnnoationDictItem) {
    console.log(key, item)

    switch (key) {
      case 'age':
        setAge(item)
        setShowAgeSelector(false)
        break
      case 'country':
        setCountry(item)
        setShowCountrySelector(false)
        break
      case 'education':
        setEducation(item)
        setShowEducationSelector(false)
        break
      case 'vocation':
        setVocation(item)
        setShowVocationSelector(false)
        break
      case 'assets':
        setAssets(item)
        setShowAssetsSelector(false)
        break
    }
  }

  const canSubmit = useMemo((): boolean => {
    if (!gender || !age || !country) return false
    else return true
  }, [gender, age, country])

  async function handleAnnotationSubmit() {
    if (!canSubmit || submitLoading) return
    setSubmitLoading(true)
    try {
      const params = {
        gender: gender?.dict_id!,
        age_dict_id: age?.dict_id!,
        country_and_region_id: country?.dict_id!,
        education_id: education?.dict_id!,
        occupation_id: vocation?.dict_id!,
        web3_asset_id: assets?.dict_id!,
      }

      const res = await adsApi.collectUserAnnotation(params)
      if (state.status === 'modify' && state.is_staked) {
        state.is_ads_play_finished ? navigate('/ads/withdraw') : navigate('/ads/watch')
      } else {
        navigate('/ads/staking')
      }
      // if (state.status === 'create') navigate('/ads/staking')
    } catch (err: any) {
      Toast.fail(err?.message || 'Failed to submit')
    }
    setSubmitLoading(false)
  }

  async function restoreUserAnnotation(dicts: Codatta.Ads.AdsAnnoationDicts) {
    console.log('restoreUserAnnotation', dicts)
    const res = await adsApi.getUserAnnotation()
    if (!res) return
    setGender({ dict_id: res.gender, display_name: res.gender.toString() })
    setAge(dicts.age_dict.find((item) => item.dict_id.toString() === res.age_dict_id) || null)
    setCountry(dicts.county_dict.find((item) => item.dict_id.toString() === res.country_and_region_id) || null)
    setEducation(dicts.education_dict.find((item) => item.dict_id.toString() === res.education_id) || null)
    setVocation(dicts.occupation_dict.find((item) => item.dict_id.toString() === res.occupation_id) || null)
    setAssets(dicts.web3_asset_dict.find((item) => item.dict_id.toString() === res.web3_asset_id) || null)
  }

  async function initDicts() {
    const res = await adsApi.getAnnotationDicts()
    setAgeDict(res.age_dict || [])
    setCountryDict(res.county_dict || [])
    setEducationDict(res.education_dict || [])
    setVocationDict(res.occupation_dict || [])
    setAssetsDict(res.web3_asset_dict.map((item) => Object.assign(item, { icon: usdtIcon })) || [])
    return res
  }

  async function pageInit() {
    setLoading(true)
    // try {
    Toast.loading({ message: 'Loading...', duration: 0 })
    const dicts = await initDicts()
    await restoreUserAnnotation(dicts)
    const adsState = await adsApi.getAdsState()
    setAdsState(adsState)
    Toast.clear()
    setLoading(false)
    // } catch (err: any) {usdtIcon
    //   Toast.fail({ message: err.message, duration: 2000 })
    // }
  }

  async function handleUserAgreement() {
    const res = await adsApi.signAgreement()
    setAgreementVisible(false)
    Toast({ message: 'success', type: 'success' })
  }

  async function handleCloseAgreement() {
    setAgreementVisible(false)
    navigate(-1)
  }

  useEffect(() => {
    setAgreementVisible(!adsState?.agreement_signed)
  }, [adsState])

  useEffect(() => {
    pageInit()
  }, [])

  return (
    <>
      <PageHead title="User infor self reporting"></PageHead>
      <div className="bg-[#1c1c26] p-4" style={{ height: 'calc(100% - 60px)' }}>
        <AnnotationProgress score={score} total={100}></AnnotationProgress>
        <div className="mb-6">
          <p className="mb-2 text-base font-bold">The higher the Vault completeness score, the greater the rewards.</p>
          <div className="text-sm text-gray-500">
            Please provide accurate information about yourself. WARNING: We may use KYC to validate the information you
            provide, and your staked asset will be fortified if there’s no match
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {/* Gender */}
          <div>
            <h2 className="mb-2 text-sm font-semibold">Gender *</h2>
            <div className="flex justify-evenly gap-2 text-sm">
              <button
                className={cn(
                  'w-full rounded-full bg-white bg-opacity-10 py-3 text-white transition-all',
                  gender?.dict_id === 0 ? 'bg-[#D355FF] bg-opacity-100' : '',
                )}
                onClick={() => setGender({ dict_id: 0, display_name: 'Woman' })}
              >
                Woman
              </button>
              <button
                className={cn(
                  'w-full rounded-full bg-white bg-opacity-10 py-3 text-white transition-all',
                  gender?.dict_id === 1 ? 'bg-[#D355FF] bg-opacity-100' : '',
                )}
                onClick={() => setGender({ dict_id: 1, display_name: 'Man' })}
              >
                Man
              </button>
            </div>
          </div>

          {/* Age */}
          <FormItem
            title="Age *"
            value={age?.display_name}
            placeholder="Select age"
            onClick={() => setShowAgeSelector(true)}
          ></FormItem>
          <FormItem
            title="Country and Region *"
            value={country?.display_name}
            placeholder="Select country and region"
            onClick={() => setShowCountrySelector(true)}
          ></FormItem>
          <FormItem
            title="Educational Bcakground"
            value={education?.display_name}
            placeholder="Select educational bcakground"
            onClick={() => setShowEducationSelector(true)}
          ></FormItem>
          <FormItem
            title="Occupation"
            value={vocation?.display_name}
            placeholder="Select vocation"
            onClick={() => setShowVocationSelector(true)}
          ></FormItem>
          <FormItem
            title="Web3 Assets"
            value={assets?.display_name}
            placeholder="Select web3 assets"
            onClick={() => setShowAssetsSelector(true)}
          ></FormItem>
          <button
            disabled={!canSubmit}
            className="mb-5 flex w-full justify-center rounded-full bg-[#D355FF] py-3 text-sm text-white transition-all disabled:opacity-30"
            onClick={handleAnnotationSubmit}
          >
            {submitLoading ? <Loader2 className="animate-spin" size={20}></Loader2> : 'Next'}
          </button>
        </div>

        {/*  Age selector */}
        <PopupSelector
          visible={showAgeSelector}
          options={ageDict}
          onChange={(age) => handleChange('age', age)}
          onClose={() => setShowAgeSelector(false)}
          value={age}
        ></PopupSelector>
        <PopupSearchSelector
          visible={showCountrySelector}
          options={countryDict}
          onChange={(country) => handleChange('country', country)}
          onClose={() => setShowCountrySelector(false)}
          value={country}
        ></PopupSearchSelector>
        <PopupSelector
          visible={showEducationSelector}
          options={educationDict}
          onChange={(education) => handleChange('education', education)}
          onClose={() => setShowEducationSelector(false)}
          value={education}
        ></PopupSelector>
        <PopupSearchSelector
          visible={showVocationSelector}
          options={vocationDict}
          onChange={(vocation) => handleChange('vocation', vocation)}
          onClose={() => setShowVocationSelector(false)}
          value={vocation}
        ></PopupSearchSelector>
        <PopupSelector
          visible={showAssetsSelector}
          options={assetsDict}
          onChange={(assets) => handleChange('assets', assets)}
          onClose={() => setShowAssetsSelector(false)}
          value={assets}
        ></PopupSelector>
      </div>
      <Agreement
        visible={agreementVisible && !loading}
        onAgree={handleUserAgreement}
        onClose={handleCloseAgreement}
      ></Agreement>
    </>
  )
}
