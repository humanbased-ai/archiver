import TONBITIconSvg from '@/assets/images/ads/ton-bit.svg'
import SmartContractIconSvg from '@/assets/images/ads/smart-contract-icon.svg'
import StakingRecordIconSvg from '@/assets/images/ads/staking-record-icon.svg'
import SafeSecurityImage from '@/assets/images/ads/safe-security.png'
import { useNavigate } from 'react-router-dom'
import { useUtils } from '@/features/tg/hooks/use-utils'

export default function SafeSecured(props: { guaranteeUrl: string; contractUrl: string }) {
  const { guaranteeUrl, contractUrl } = props
  const navigate = useNavigate()
  const [utils, _utilsError] = useUtils()

  function openLink(url: string) {
    utils.openLink(url)
  }

  function handleStakingRecord() {
    navigate('/ads/stake/history')
  }

  return (
    <div className="relative my-6">
      <img src={SafeSecurityImage} alt="" className="absolute -top-6 right-0 h-[90px]" />
      <h2 className="mb-1 text-base font-bold">Safe & Secured</h2>
      <p className="mb-3 pr-20 text-sm text-gray-500">
        Click to view the on-chain contract and third-party authoritative certification.
      </p>
      <div className="mb-4 flex flex-wrap gap-3">
        <div
          onClick={() => openLink(guaranteeUrl)}
          className="flex items-center gap-1 rounded-full border border-white border-opacity-15 px-3 py-2 text-sm"
        >
          <img src={TONBITIconSvg} alt="" className="h-6 w-6" />
          TONBIT
        </div>

        <div
          onClick={() => openLink(contractUrl)}
          className="flex items-center gap-1 rounded-full border border-white border-opacity-15 px-3 py-2 text-sm"
        >
          <img src={SmartContractIconSvg} alt="" className="h-6 w-6" />
          Codatta Smart Contracts
        </div>
      </div>
      <div
        onClick={handleStakingRecord}
        className="flex items-center gap-1 rounded-full border border-white border-opacity-15 px-3 py-2 text-sm"
      >
        <img src={StakingRecordIconSvg} alt="" className="h-6 w-6" />
        View Staking History
      </div>
    </div>
  )
}
