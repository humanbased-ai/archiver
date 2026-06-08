from tonclient import TonClient
from tonclient.types import DeployParams, CallSet, FunctionCall, Signer, SignerKeys


class TonStakingContract:
    def __init__(self, private_key, contract_address):
        self.client = TonClient()
        self.private_key = private_key
        self.contract_address = contract_address  # 合约地址
        self.owner_address = self.get_address_from_private_key(private_key)

    def get_address_from_private_key(self, private_key):
        return self.client.crypto.get_public_key(private_key)

    # def deploy_contract(self, contract_code):   # 部署合约
    #     deploy_params = DeployParams(
    #         address=self.contract_address,
    #         code=contract_code,
    #         signer=Signer.Keys(keys=SignerKeys(private_key=self.private_key))
    #     )
    #     self.contract_address = self.client.contracts.deploy(deploy_params)
    #     print(f"Contract deployed at address: {self.contract_address}")

    # def stake(self, amount):  #用户执行的质押
    #     call_set = CallSet(function_name='stake', input={})
    #     self.client.contracts.call(
    #         address=self.contract_address,
    #         call_set=call_set,
    #         signer=Signer.Keys(keys=SignerKeys(private_key=self.private_key)),
    #         amount=amount
    #     )

    def deposit(self, amount): #补充存款
        call_set = CallSet(function_name='deposit', input={})
        self.client.contracts.call(
            address=self.contract_address,
            call_set=call_set,
            signer=Signer.Keys(keys=SignerKeys(private_key=self.private_key)),
            amount=amount
        )

    def update_interest(self, user_address, interest_amount):
        call_set = CallSet(function_name='updateInterest',
                           input={'userAddress': user_address, 'interestAmount': interest_amount})
        self.client.contracts.call(
            address=self.contract_address,
            call_set=call_set,
            signer=Signer.Keys(keys=SignerKeys(private_key=self.private_key))
        )

    # def withdraw(self, amount): #用户执行的提款
    #     call_set = CallSet(function_name='withdraw', input={'amount': amount})
    #     self.client.contracts.call(
    #         address=self.contract_address,
    #         call_set=call_set,
    #         signer=Signer.Keys(keys=SignerKeys(private_key=self.private_key))
    #     )

    def withdraw_funds(self):  #提取合约所有资金,俗称跑路
        call_set = CallSet(function_name='withdrawFunds', input={})
        self.client.contracts.call(
            address=self.contract_address,
            call_set=call_set,
            signer=Signer.Keys(keys=SignerKeys(private_key=self.private_key))
        )

    def get_user_info(self,userAddress): #查询用户信息
        call_set = CallSet(function_name='getUserInfo', input={'userAddress':userAddress})
        user_info = self.client.contracts.call(
            address=self.contract_address,
            call_set=call_set,
            signer=Signer.Keys(keys=SignerKeys(private_key=self.private_key))
        )
        return user_info


if __name__ == '__main__':
    private_key = "PRIVATE_KEY"
    contract_addr = "CONTRACT_ADDR"

    staking_contract = TonStakingContract(private_key,contract_addr)
    # staking_contract.deploy_contract("合约代码") #部署合约
    staking_contract.stake(1000)
    staking_contract.deposit(500)
    staking_contract.update_interest("USER_ADDRESS", 100)
    staking_contract.withdraw(200)
    user_info = staking_contract.get_user_info()
    print(user_info)
