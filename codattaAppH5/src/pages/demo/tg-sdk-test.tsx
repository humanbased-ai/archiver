import { useEffect } from 'react'
import { useLaunchParams } from '@/features/tg/hooks/use-launch-params'
import BackButton from '@/features/tg/components/back-button'

export function Component() {
  // const popup = usePopup()
  // const scanner = useQRScanner()
  // const [mainButtonVisible, setMainButtonVisible] = useState(false)
  const params = useLaunchParams()

  useEffect(() => {
    console.log('lanch params', params)
  }, [params])

  // function handlePopup() {
  //   popup.open({
  //     title: 'QR Scan result',
  //     message: 'test',
  //     buttons: [{ type: 'close' }],
  //   })
  // }

  // function handleQrScan() {
  //   scanner.open().then((content) => {
  //     popup.open({
  //       title: 'QR Scan result',
  //       message: content || 'no-content',
  //       buttons: [{ type: 'close' }],
  //     })
  //   })
  // }

  // function handleTg(show: boolean) {
  //   setMainButtonVisible((val) => !val)
  // }

  // const handleMainButton = useCallback(() => {
  //   console.log('handleMainButton', Math.random())
  // }, [])

  return (
    <div>
      <BackButton visible={true} />
      {/* <Button onClick={handleQrScan}>QR Scan test</Button>
      <Button onClick={handleQrScan}>test</Button> */}
      {/* <Button onClick={() => handleTg(true)}>tg button show</Button> */}

      {/* <TgMainButton visible={mainButtonVisible} onClick={() => handleMainButton()} loading={true} disabled={false}>
        text="aa"
      </TgMainButton> */}
    </div>
  )
}
