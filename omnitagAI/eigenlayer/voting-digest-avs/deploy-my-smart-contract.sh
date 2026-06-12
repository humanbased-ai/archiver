RPC_URL=http://localhost:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
cd contracts

echo forge script script/VotingDigestDeployer.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast -vvvv

forge clean
forge build

forge script script/VotingDigestDeployer.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast -v

cd -
cp -f contracts/out/VotingDigestServiceManager.sol/VotingDigestServiceManager.json operator/abis
cp -f contracts/out/ECDSAStakeRegistry.sol/ECDSAStakeRegistry.json operator/abis
