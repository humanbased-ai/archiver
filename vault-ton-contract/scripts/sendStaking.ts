import { Address, toNano } from '@ton/core';
import { Staking } from '../wrappers/Staking';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { keyPairFromSeed, keyPairFromSecretKey, sign, signVerify, KeyPair, getSecureRandomBytes } from '@ton/crypto';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Staking contract address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const staking = provider.open(Staking.createFromAddress(address));

    const staking_amount = await ui.input('Input staking amount');

    const buffer = Buffer.from('REDACTED_SECRET_KEY_SEE_SECRETS_MANAGER', 'hex')
    const keypair: KeyPair = keyPairFromSecretKey(buffer);
 
    const data = Buffer.from('user_id:202512421111,slashed:0')
    const singature = sign(data, keypair.secretKey);
 
    const pk = '0x'+keypair.publicKey.toString('hex');
 


    await staking.sendStaking(provider.sender(), {
        value: toNano(staking_amount),
        queryID: 0,
    });
    
    ui.write('Send stake successfully!');

}