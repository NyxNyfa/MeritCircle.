// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MCircle - working/testnet token untuk sistem Merit Pool.
/// @notice BUKAN token resmi Merit Circle (yang telah dimigrasi ke BEAM).
///         Mint dibatasi: hanya owner dan alamat yang diberi role minter (mis. TokenSwap).
contract MCircle is ERC20, Ownable {
    mapping(address => bool) public minters;

    event MinterUpdated(address indexed minter, bool allowed);

    constructor() ERC20("Merit Circle", "MC") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    function setMinter(address minter, bool allowed) external onlyOwner {
        minters[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "MC: caller is not a minter");
        _;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
}
