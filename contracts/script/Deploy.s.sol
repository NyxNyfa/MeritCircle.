// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MCircle.sol"; // <-- Ubah nama import di sini
import "../src/MeritPool.sol";
import "../src/TokenSwap.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 backendPrivateKey = vm.envUint("BACKEND_PRIVATE_KEY");
        address backendSigner = vm.addr(backendPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // A. Deploy MCircle Token (Ubah dari MCToken menjadi MCircle)
        MCircle mcToken = new MCircle();
        console.log("MC Token deployed at:", address(mcToken));

        // B. Deploy TokenSwap
        TokenSwap tokenSwap = new TokenSwap(address(mcToken));
        console.log("TokenSwap deployed at:", address(tokenSwap));

        // C. Deploy MeritPool
        MeritPool meritPool = new MeritPool(address(mcToken), backendSigner);
        console.log("MeritPool deployed at:", address(meritPool));

        vm.stopBroadcast();
    }
}