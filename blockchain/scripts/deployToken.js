import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import "dotenv/config";

async function deployContract(contractName, args) {
  const artifactPath = path.join(
    path.resolve(),
    `artifacts/contracts/${contractName}.sol/${contractName}.json`
  );

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log(`\nDeploying ${contractName} using:`, await wallet.getAddress());

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`${contractName} deployed at:`, address);

  return address;
}

async function main() {
  const oneMillion = ethers.parseUnits("1000000", 18);

  // Deploy Deposit Token
  const depositTokenAddress = await deployContract("MyToken", [oneMillion]);

  // Deploy Reward Token
  const rewardTokenAddress = await deployContract("RewardToken", [oneMillion]);

  console.log("\n==== SUMMARY ====");
  console.log("Deposit Token:", depositTokenAddress);
  console.log("Reward Token:", rewardTokenAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
