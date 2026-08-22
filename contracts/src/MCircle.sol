// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MCircle is ERC20 {
    constructor() ERC20("Merit Circle", "MC") {
        // Otomatis mencetak 1 Juta token ke dompet Anda saat di-deploy
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // Faucet dihapus.
    // Fungsi mint dibuat terbuka agar kontrak TokenSwap bisa mencetak koin.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}