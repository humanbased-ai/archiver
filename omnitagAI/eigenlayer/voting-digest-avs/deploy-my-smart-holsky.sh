source .env

RPC_URL=$HOLESKY_RPC_URL
PRIVATE_KEY=$HOLESKY_PRIVATE_KEY
cd contracts

echo forge script script/HoleskyDeployer.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast -v

forge clean
forge build
forge script script/HoleskyDeployer.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast -v

cd -
cp -f contracts/out/VotingDigestServiceManager.sol/VotingDigestServiceManager.json operator/abis
cp -f contracts/out/ECDSAStakeRegistry.sol/ECDSAStakeRegistry.json operator/abis
