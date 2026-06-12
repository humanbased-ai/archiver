import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Address, beginCell, toNano, TonClient, Cell } from "@ton/ton";
import { CHAIN, TonConnectUIProvider, useTonConnectUI } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";
const NETWORK = import.meta.env.VITE_WALLET_NETWORK_CHAIN


const COUNTER_CONTRACT_ADDRESS = 'EQCZUt2Ld3m4Hv7hs4IXfKwCQlMt92wA_7uW6pjBKm9Sh21G'


export function Component() {

  const [tonConnectUI] = useTonConnectUI()
  const [connected, setConnected] = useState(false)

  async function getCounter() {
    const endpoint = await getHttpEndpoint({
      network: NETWORK === CHAIN.MAINNET ? 'mainnet' : 'testnet',
    })
  
    const client = new TonClient({ endpoint })
    const res = await client.runMethod(Address.parse(COUNTER_CONTRACT_ADDRESS), 'get_counter')
    console.log(res, res.stack, res.stack.readNumber())
  }

  async function incremenetCounter(queryid?:number) {

    if (!tonConnectUI.connected) throw new Error('wallet not connected!!!')

    const body = beginCell()
    .storeUint(0x7e8764ef, 32)
    .storeUint(queryid || 0, 64)
    .storeUint(2, 32)
    .endCell()

    const response = await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 60,
      network: NETWORK === CHAIN.MAINNET? CHAIN.MAINNET : CHAIN.TESTNET,
      messages: [{
        address: COUNTER_CONTRACT_ADDRESS,
        amount: toNano('0.02').toString(),
        payload: body.toBoc().toString('base64')
      }]
    })
  
    const txHash = Cell.fromBase64(response.boc).hash().toString('hex')
    console.log('response:::::', txHash)
  }

  function handleConnect() {
    tonConnectUI.modal.open()
  }

  function handleDisconnect() {
    tonConnectUI.disconnect()
  }

  useEffect(()=>{
    setConnected(tonConnectUI.connected)
  }, [tonConnectUI.connected])

  return <div>
    <button onClick={getCounter} className="bg-primary-200 px-4 py-3 rounded-r-full">get counter</button>
    <button disabled={!tonConnectUI.connected} onClick={()=>incremenetCounter()} className="bg-primary-200 px-4 py-3 rounded-r-full disabled:opacity-15">incremenet counter</button>
    {
      connected
      ? <button onClick={handleDisconnect}>{tonConnectUI.account?.address}</button>
      : <button onClick={handleConnect}>connect wallet</button>
    }
    <button></button>
    </div>

}