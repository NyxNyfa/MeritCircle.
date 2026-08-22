// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MCircle.sol";
import "../src/MeritPool.sol";
import "../src/TokenSwap.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 backendPrivateKey = vm.envUint("BACKEND_PRIVATE_KEY");
        address backendSigner = vm.addr(backendPrivateKey);
        address deployer = vm.addr(deployerPrivateKey);

        // Reserve & Treasury bisa dioverride via env; default ke deployer (testnet)
        address reserveAddress = vm.envOr("RESERVE_ADDRESS", deployer);
        address treasuryAddress = vm.envOr("TREASURY_ADDRESS", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // A. Deploy MCircle Token
        MCircle mcToken = new MCircle();
        console.log("MC Token deployed at:", address(mcToken));

        // B. Deploy TokenSwap
        TokenSwap tokenSwap = new TokenSwap(address(mcToken));
        console.log("TokenSwap deployed at:", address(tokenSwap));

        // C. Beri TokenSwap hak mint MC (satu-satunya jalur pencetakan selain owner)
        mcToken.setMinter(address(tokenSwap), true);
        console.log("TokenSwap granted minter role");

        // D. Deploy MeritPool v2 (Merit Queue + auction + surplus split)
        MeritPool meritPool = new MeritPool(address(mcToken), backendSigner, reserveAddress, treasuryAddress);
        console.log("MeritPool deployed at:", address(meritPool));
        console.log("Reserve:", reserveAddress);
        console.log("Treasury:", treasuryAddress);

        vm.stopBroadcast();
    }
}
