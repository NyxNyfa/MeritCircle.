Langkah 1: Jalankan Local EVM Blockchain (Anvil)
Buka Terminal PowerShell 1, lalu jalankan node blockchain lokal:

powershell
& "$HOME\.foundry\bin\anvil.exe"
Catatan: Biarkan terminal ini tetap terbuka (running). Anvil akan berjalan pada:

RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Menyediakan 10 akun uji coba yang masing-masing memiliki 10,000 ETH saldo gas fee.
Langkah 2: Deploy Smart Contracts ke Node Lokal
Buka Terminal PowerShell 2, navigasi ke folder contracts dan deploy contract ke Anvil:

powershell
cd d:\Arisan\merit-circle\contracts
& "$HOME\.foundry\bin\forge.exe" script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast
Hasil deploy otomatis menghasilkan contract address deterministik yang sudah tersinkron dengan web app di 

contracts.ts
:

MCircle Token (MC): 0x5FbDB2315678afecb367f032d93F642f64180aa3
TokenSwap: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
MeritPool Contract: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
Langkah 3: Jalankan Web Frontend (Next.js)
Masih di Terminal PowerShell 2 (atau terminal baru), masuk ke folder web app dan jalankan dev server:

powershell
cd d:\Arisan\merit-circle\apps\web
pnpm dev
Aplikasi web sekarang aktif dan dapat dibuka melalui browser di: 👉 http://localhost:3000

Langkah 4: Setup Dompet Web3 (MetaMask / Rabby)
Agar dapat bertransaksi di browser:

Tambahkan Jaringan Lokal ke MetaMask:

Network Name: Anvil Localhost
New RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH (atau tBNB)
Import Akun Uji Coba (Anvil Account #0):

Buka MetaMask -> Import Account -> masukkan Private Key:
text
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Akun ini otomatis memiliki saldo 10,000 ETH lokal untuk gas fee dan transaksi.
Langkah 5: Menguji Alur Fitur Aplikasi
Buka http://localhost:3000 di browser.
Connect Wallet: Hubungkan akun MetaMask yang sudah di-import tadi, lalu daftarkan username pertama Anda.
Swap Token ke MC:
Buka menu Swap (/swap).
Tukarkan sejumlah ETH lokal (misal 0.05 ETH) untuk mendapatkan token MC.
Gabung ke Pool (Arisan):
Masuk ke menu Dashboard atau Pools.
Pilih Basic Pool (Tier 0).
Lakukan Approve MC dan klik Join Pool / Contribute.
Cek Progres & Merit:
Lihat kenaikan reputasi Merit Score (0–100) dan status Tier di halaman Profile (/profile).


& "$HOME\.foundry\bin\cast.exe" rpc anvil_setBalance 0x26dc1a85f5f2C58Ec434b741aE3d9CA891D25806 0x21e19e0c9bab2400000 --rpc-url http://127.0.0.1:8545
& "$HOME\.foundry\bin\cast.exe" balance 0x26dc1a85f5f2C58Ec434b741aE3d9CA891D25806 --ether --rpc-url http://127.0.0.1:8545
& "$HOME\.foundry\bin\cast.exe" rpc anvil_setBalance 0x59250f719772EE841a1a5eC6AC4B1e32ec3F1d7F 0x3635C9ADC5DEA00000 --rpc-url http://127.0.0.1:8545; & "$HOME\.foundry\bin\cast.exe" rpc anvil_setBalance 0xB4a86B0C67b9676F7805720d0F2b12B12F598cbF 0x3635C9ADC5DEA00000 --rpc-url http://127.0.0.1:8545; & "$HOME\.foundry\bin\cast.exe" rpc anvil_setBalance 0xad4190970D0247F67A97186789f4D7c7dB3785B1 0x3635C9ADC5DEA00000 --rpc-url http://127.0.0.1:8545
& "$HOME\.foundry\bin\cast.exe" balance 0x59250f719772EE841a1a5eC6AC4B1e32ec3F1d7F --ether --rpc-url http://127.0.0.1:8545; & "$HOME\.foundry\bin\cast.exe" balance 0xB4a86B0C67b9676F7805720d0F2b12B12F598cbF --ether --rpc-url http://127.0.0.1:8545; & "$HOME\.foundry\bin\cast.exe" balance 0xad4190970D0247F67A97186789f4D7c7dB3785B1 --ether --rpc-url http://127.0.0.1:8545