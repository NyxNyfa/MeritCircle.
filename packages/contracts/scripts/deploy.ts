import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MeritCircleCore with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB");

  const MeritCircleCore = await ethers.getContractFactory("MeritCircleCore");
  const contract = await MeritCircleCore.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ MeritCircleCore deployed to:", contractAddress);

  // Default roles are granted to deployer in constructor:
  // DEFAULT_ADMIN_ROLE, POOL_CREATOR_ROLE, SETTLER_ROLE, PAUSER_ROLE
  console.log("Deployer configured with Admin, Pool Creator, Settler, and Pauser roles.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
