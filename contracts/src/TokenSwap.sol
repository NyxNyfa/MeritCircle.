// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface agar kita bisa mencetak (mint) token MC langsung dari kontrak ini
interface IMockMCToken {
    function mint(address to, uint256 amount) external;
}

contract TokenSwap is Ownable {
    address public mcToken;

    // Nilai tukar: 1 tBNB = 10,000 MC Token (Anda bisa mengubah ini nanti)
    uint256 public bnbToMcRate = 10000;

    event SwapBNBForMC(address indexed user, uint256 bnbAmount, uint256 mcAmount);
    event SwapMCForBNB(address indexed user, uint256 mcAmount, uint256 bnbAmount);

    constructor(address _mcToken) Ownable(msg.sender) {
        mcToken = _mcToken;
    }

    // Arah 1: Beli MC Token menggunakan tBNB
    function swapBNBForMC() external payable {
        require(msg.value > 0, "Minimal swap harus lebih dari 0 tBNB");

        // Hitung jumlah MC yang didapat (mengikuti standar 18 desimal)
        uint256 mcAmount = msg.value * bnbToMcRate;

        // Perintahkan kontrak MC untuk mencetak token ke dompet pembeli
        IMockMCToken(mcToken).mint(msg.sender, mcAmount);

        emit SwapBNBForMC(msg.sender, msg.value, mcAmount);
    }

    // Arah 2: Jual MC Token kembali menjadi tBNB
    // User wajib 'approve' MC Token ke kontrak ini terlebih dahulu.
    // MC yang masuk DITAHAN di kontrak (burn tidak tersedia di MCircle).
    // Likuiditas tBNB berasal dari hasil swap arah 1 — jika kosong, transaksi revert.
    function swapMCForBNB(uint256 mcAmount) external {
        require(mcAmount > 0, "Minimal swap harus lebih dari 0 MC");

        uint256 bnbOut = mcAmount / bnbToMcRate;
        require(bnbOut > 0, "Jumlah MC terlalu kecil untuk ditukar");

        require(
            IERC20(mcToken).transferFrom(msg.sender, address(this), mcAmount),
            "Gagal menarik MC Token. Pastikan saldo & allowance cukup"
        );

        payable(msg.sender).transfer(bnbOut);

        emit SwapMCForBNB(msg.sender, mcAmount, bnbOut);
    }

    // Khusus admin/owner untuk mengambil tBNB yang terkumpul di kontrak ini
    function withdrawBNB() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }
}