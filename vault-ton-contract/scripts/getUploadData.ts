import { Address, beginCell, BitBuilder, BitReader, BitString, Builder, Cell, Slice, toNano, } from '@ton/core';
import { Staking } from '../wrappers/Staking';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { keyPairFromSeed, keyPairFromSecretKey, sign, signVerify, KeyPair, getSecureRandomBytes } from '@ton/crypto';
import { generateKeyPair } from 'crypto';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Staking contract address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const staking = provider.open(Staking.createFromAddress(address));


    const buffer = Buffer.from('REDACTED_SECRET_KEY_SEE_SECRETS_MANAGER', 'hex')
    const keypair: KeyPair = keyPairFromSecretKey(buffer);

    const data = Buffer.from('user_id:202512421111,slashed:0')
    const singature = sign(data, keypair.secretKey);

    const pk = '0x' + keypair.publicKey.toString('hex');
    const pk_int = Number(pk)

    console.log(data.toString('hex'))
    console.log(singature.toString('hex'))

    let result = await staking.getUploadData(
        beginCell().storeUint(data.length,32).storeUint(singature.length,32).storeRef(beginCell().storeBuffer(data, data.length).endCell()).storeRef(beginCell().storeBuffer(singature, singature.length).endCell()).endCell(),
    );
    ui.write('Sign valid result : ' + result)

    // ui.clearActionPrompt();
}