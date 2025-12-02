import { BigNumber, ethers } from "ethers";
import toast from "react-hot-toast";

import {
  contract,
  tokenContract,
  ERC20,
  toEth,
  TOKEN_ICO_CONTRACT,
} from "./constants";

/* -------------------------
   Environment variables
   ------------------------- */
const STAKING_DAPP_ADDRESS =
  process.env.NEXT_PUBLIC_STAKING_DAPP || process.env.NEXT_PUBLIC_STAKING_DAPP_ADDRESS;
const DEPOSIT_TOKEN = process.env.NEXT_PUBLIC_DEPOSIT_TOKEN;
const REWARD_TOKEN = process.env.NEXT_PUBLIC_REWARD_TOKEN || process.env.NEXT_PUBLIC_DEPOSIT_TOKEN;
const TOKEN_LOGO = process.env.NEXT_PUBLIC_TOKEN_LOGO || "";

/* -------------------------
   Notifications
   ------------------------- */
const notifySuccess = (msg) => toast.success(msg, { duration: 2000 });
const notifyError = (msg) => toast.error(msg, { duration: 4000 });

/* -------------------------
   Utilities
   ------------------------- */
export function CONVERT_TIMESTAMP_TO_READABLE(timestamp) {
  // Accepts seconds-based timestamp
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function toWei(amount, decimals = 18) {
  return ethers.utils.parseUnits(amount.toString(), decimals).toString();
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseErrorMsg(e) {
  try {
    // Try common shapes
    if (!e) return "Unknown error";
    if (typeof e === "string") return e;
    const json = JSON.parse(JSON.stringify(e));
    return (
      json?.reason ||
      json?.error?.message ||
      json?.message ||
      (json && Object.values(json).join(" ")) ||
      "An error occurred"
    );
  } catch {
    return String(e);
  }
}

export const SHORTEN_ADDRESS = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

/* -------------------------
   Clipboard helper
   ------------------------- */
export const copyAddress = (text) => {
  if (!navigator?.clipboard) {
    notifyError("Clipboard not available (requires HTTPS)");
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => notifySuccess("Copied successfully"))
    .catch(() => notifyError("Failed to copy"));
};

/* -------------------------
   CONTRACT_DATA
   - returns structured info about pools and tokens
   ------------------------- */
export async function CONTRACT_DATA(address) {
  try {
    if (!address) {
      throw new Error("address is required");
    }

    const contractObj = await contract();
    if (!contractObj) {
      throw new Error("Failed to initialize contract. Please check your contract address configuration.");
    }

    // tokenContract() is probably the project token, not pool tokens
    const stakingTokenObj = await tokenContract();

    // Owner & address - wrap in try-catch for better error handling
    const contractAddress = contractObj.address;
    let contractOwner;
    try {
      contractOwner = await contractObj.owner();
    } catch (error) {
      if (error?.code === 'CALL_EXCEPTION' || error?.message?.includes('call revert exception')) {
        throw new Error(`Contract call failed. The contract at ${contractAddress} may not be the correct StakingDapp contract, or it may not be deployed on the current network. Please verify your NEXT_PUBLIC_STAKING_DAPP address matches the deployed contract.`);
      }
      throw error;
    }

    // Notifications
    const notifications = await contractObj.getNotifications();
    const _notificationsArray = await Promise.all(
      notifications.map(async ({ poolID, amount, user, typeOf, timestamp }) => ({
        poolID: poolID.toNumber ? poolID.toNumber() : Number(poolID),
        amount: toEth(amount),
        user,
        typeOf,
        timestamp: CONVERT_TIMESTAMP_TO_READABLE(timestamp),
      }))
    );

    // Pools
    const poolCountBN = await contractObj.poolCount();
    const length = poolCountBN.toNumber ? poolCountBN.toNumber() : Number(poolCountBN);

    const poolInfoArray = [];
    for (let i = 0; i < length; i++) {
      const poolInfo = await contractObj.poolInfo(i);
      const userInfo = await contractObj.userInfo(i, address);
      let userReward;
      // Some deployed / older contracts may not expose a `pendingReward` view function
      // If the contract doesn't have the function, fallback to computing it client-side
      if (contractObj.pendingReward && typeof contractObj.pendingReward === "function") {
        userReward = await contractObj.pendingReward(i, address);
      } else {
        // Fallback calculation mirrors `_calcPendingReward` from the contract
        // Uses minute-based intervals (contract uses minutes instead of 86400 as days)
        const amountBN = BigNumber.from(userInfo.amount || 0);
        const lastRewardAtBN = userInfo.lastRewardAt || 0;
        const lastRewardAt = lastRewardAtBN.toNumber ? lastRewardAtBN.toNumber() : Number(lastRewardAtBN);
        let daysPassed = Math.floor((Date.now() / 1000 - lastRewardAt) / 60);
        const lockDays = poolInfo.lockDays ? Number(poolInfo.lockDays) : 0;
        if (daysPassed > lockDays) daysPassed = lockDays;
        const apyBN = BigNumber.from(poolInfo.apy || 0);
        // pending = amount * daysPassed / 360 / 100 * apy
        userReward = amountBN.mul(daysPassed).mul(apyBN).div(360).div(100);
      }

      // fetch token contract instances for deposit & reward tokens
      // ERC20(contractAddress, signerOrAddress) — assumes ERC20 returns contract instance
      const depositTokenAddr = poolInfo.depositToken;
      const rewardTokenAddr = poolInfo.rewardToken;

      const tokenPoolInfoA = await ERC20(depositTokenAddr, address);
      const tokenPoolInfoB = await ERC20(rewardTokenAddr, address);

      // try to get decimals & symbol safely
      const [decimalsA, decimalsB] = await Promise.all([
        (async () => {
          try {
            return Number(await tokenPoolInfoA.decimals());
          } catch {
            return 18;
          }
        })(),
        (async () => {
          try {
            return Number(await tokenPoolInfoB.decimals());
          } catch {
            return 18;
          }
        })(),
      ]);
      // try to get symbols
      const [symbolA, symbolB] = await Promise.all([
        (async () => {
          try {
            return await tokenPoolInfoA.symbol();
          } catch {
            return "";
          }
        })(),
        (async () => {
          try {
            return await tokenPoolInfoB.symbol();
          } catch {
            return "";
          }
        })(),
      ]);

      const depositedAmount = toEth(userInfo.amount, decimalsA); // assumes toEth accepts decimals
      const pendingReward = toEth(userReward, decimalsB);

      poolInfoArray.push({
        poolID: i,
        rawPoolInfo: poolInfo,
        depositedAmount,
        pendingReward,
        apy: Number(poolInfo.apy),
        lockDays: Number(poolInfo.lockDays),
        depositToken: {
          address: depositTokenAddr,
          contract: tokenPoolInfoA,
          decimals: decimalsA,
          symbol: symbolA,
        },
        rewardToken: {
          address: rewardTokenAddr,
          contract: tokenPoolInfoB,
          decimals: decimalsB,
          symbol: symbolB,
        },
        // add other useful fields from poolInfo if needed
      });
    }

    const totalDepositedAmount = poolInfoArray.reduce(
      (total, pool) => total + safeNumber(pool.depositedAmount, 0),
      0
    );

    // global tokens
    const rewardToken = await ERC20(REWARD_TOKEN, address);
    const depositToken = await ERC20(DEPOSIT_TOKEN, address);

    // contract token balance (attempt to read contract balance if method exists)
    let contractTokenBalance = 0;
    try {
      if (depositToken && depositToken.balanceOf) {
        const bal = await depositToken.balanceOf(contractAddress);
        contractTokenBalance = parseFloat(ethers.utils.formatUnits(bal, await depositToken.decimals()));
      }
    } catch {
      contractTokenBalance = 0;
    }

    const data = {
      contractOwner,
      contractAddress,
      notifications: _notificationsArray.reverse(),
      rewardToken,
      depositToken,
      poolInfoArray,
      totalDepositedAmount,
      contractTokenBalance: contractTokenBalance - totalDepositedAmount,
    };

    return data;
  } catch (error) {
    console.error("Error in CONTRACT_DATA:", error);
    
    // Provide more helpful error messages for common issues
    let errorMessage = parseErrorMsg(error);
    
    // Check if it's a contract call error (likely contract not deployed or wrong address)
    if (error?.code === 'CALL_EXCEPTION' || error?.message?.includes('call revert exception')) {
      errorMessage = "Contract not found or not deployed. Please ensure:\n1. The contract is deployed\n2. NEXT_PUBLIC_STAKING_DAPP is set correctly in your .env file\n3. You're connected to the correct network";
    } else if (error?.message?.includes('not configured')) {
      errorMessage = error.message;
    }
    
    notifyError(errorMessage);
    throw error; // rethrow so callers can handle if needed
  }
}

/* -------------------------
   deposit()
   - ensures allowance, then deposits
   ------------------------- */
export async function deposit(poolID, amount, address) {
  try {
    notifySuccess("Calling contract...");
    const contractObj = await contract();
    const stakingTokenObj = await tokenContract();

    // Use 18 decimals by default — if token has other decimals, you should pass decimals in
    const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);

    const currentAllowance = await stakingTokenObj.allowance(address, contractObj.address);
    if (BigNumber.from(currentAllowance).lt(amountInWei)) {
      notifySuccess("Approving token...");
      const approveTx = await stakingTokenObj.approve(contractObj.address, amountInWei);
      await approveTx.wait();
      console.log(`Approved ${amountInWei.toString()} tokens for staking`);
    }

    const gasEstimation = await contractObj.estimateGas.deposit(Number(poolID), amountInWei);

    notifySuccess("Staking token call...");
    const stakeTx = await contractObj.deposit(Number(poolID), amountInWei, {
      gasLimit: gasEstimation,
    });

    const receipt = await stakeTx.wait();
    notifySuccess("Token staked successfully");
    return receipt;
  } catch (error) {
    console.error(error);
    const errorMsg = parseErrorMsg(error);
    notifyError(errorMsg);
    throw error;
  }
}

/* -------------------------
   transferToken()
   - transfers project token to address
   ------------------------- */
export async function transferToken(amount, transferAddress) {
  try {
    notifySuccess("Calling token transfer...");
    const stakingTokenObj = await tokenContract();
    const decimals = Number(await stakingTokenObj.decimals().catch(() => 18));
    const transferAmount = ethers.utils.parseUnits(amount.toString(), decimals);
    const tx = await stakingTokenObj.transfer(transferAddress, transferAmount);
    await tx.wait();
    notifySuccess("Token transferred successfully");
    return tx;
  } catch (error) {
    console.error(error);
    const errorMsg = parseErrorMsg(error);
    notifyError(errorMsg);
    throw error;
  }
}

/* -------------------------
   withdraw()
   ------------------------- */
export async function withdraw(poolID, amount) {
  try {
    notifySuccess("Calling contract...");
    const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
    const contractObj = await contract();
    const gasEstimation = await contractObj.estimateGas.withdraw(Number(poolID), amountInWei);
    const tx = await contractObj.withdraw(Number(poolID), amountInWei, { gasLimit: gasEstimation });
    const receipt = await tx.wait();
    notifySuccess("Transaction successfully completed");
    return receipt;
  } catch (error) {
    console.error(error);
    const errorMsg = parseErrorMsg(error);
    notifyError(errorMsg);
    throw error;
  }
}

/* -------------------------
   claimReward()
   ------------------------- */
export async function claimReward(poolID) {
  try {
    notifySuccess("Calling contract...");
    const contractObj = await contract();
    const gasEstimation = await contractObj.estimateGas.claimReward(Number(poolID));
    const tx = await contractObj.claimReward(Number(poolID), { gasLimit: gasEstimation });
    const receipt = await tx.wait();
    notifySuccess("Transaction successfully completed");
    return receipt;
  } catch (error) {
    console.error(error);
    const errorMsg = parseErrorMsg(error);
    notifyError(errorMsg);
    throw error;
  }
}

/* -------------------------
   createPool()
   - owner function to add a new pool
   ------------------------- */
export async function createPool(pool) {
  try {
    const { _depositToken, _rewardToken, _apy, _lockDays } = pool;
    if (!_depositToken || !_rewardToken || !_apy || !_lockDays)
      return notifyError("Provide all the details");

    notifySuccess("Calling contract...");
    const contractObj = await contract();

    const gasEstimation = await contractObj.estimateGas.addPool(
      _depositToken,
      _rewardToken,
      Number(_apy),
      Number(_lockDays)
    );

    const tx = await contractObj.addPool(
      _depositToken,
      _rewardToken,
      Number(_apy),
      Number(_lockDays),
      { gasLimit: gasEstimation }
    );

    const receipt = await tx.wait();
    notifySuccess("Pool created successfully");
    return receipt;
  } catch (error) {
    console.error(error);
    const errorMsg = parseErrorMsg(error);
    notifyError(errorMsg);
    throw error;
  }
}

/* -------------------------
   modifyPool()
   - owner function to modify existing pool parameter (amount)
   ------------------------- */
export async function modifyPool(poolID, amount) {
  try {
    notifySuccess("Calling contract...");
    const contractObj = await contract();

    const gasEstimation = await contractObj.estimateGas.modifyPool(Number(poolID), Number(amount));

    const tx = await contractObj.modifyPool(Number(poolID), Number(amount), {
      gasLimit: gasEstimation,
    });

    const receipt = await tx.wait();
    notifySuccess("Pool modified successfully");
    return receipt;
  } catch (error) {
    console.error(error);
    const errorMsg = parseErrorMsg(error);
    notifyError(errorMsg);
    throw error;
  }
}

/* -------------------------
   sweep()
   - owner function to sweep tokens
   ------------------------- */
export async function sweep(tokenData) {
  try {
    const { token, amount } = tokenData;
    if (!token || !amount) return notifyError("Data is missing");

    notifySuccess("Calling contract...");
    const contractObj = await contract();

    // default decimals 18
    const transferAmount = ethers.utils.parseUnits(amount.toString(), 18);

    const gasEstimation = await contractObj.estimateGas.sweep(token, transferAmount);

    const tx = await contractObj.sweep(token, transferAmount, { gasLimit: gasEstimation });
    const receipt = await tx.wait();
    notifySuccess("Transaction completed successfully");
    return receipt;
  } catch (error) {
    console.error(error);
    const errorMsg = parseErrorMsg(error);
    notifyError(errorMsg);
    throw error;
  }
}

/* -------------------------
   addTokenMetaMask()
   - suggest project token to user's metamask
   ------------------------- */
export const addTokenMetaMask = async () => {
  if (!window.ethereum) {
    notifyError("MetaMask is not installed");
    return;
  }
  try {
    const contractInstance = await tokenContract();
    const tokenDecimals = Number(await contractInstance.decimals().catch(() => 18));
    const tokenAddress = contractInstance.address;
    const tokenSymbol = await contractInstance.symbol().catch(() => "TOKEN");
    const tokenImage = TOKEN_LOGO || "";

    const wasAdded = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: tokenAddress,
          symbol: tokenSymbol,
          decimals: tokenDecimals,
          image: tokenImage,
        },
      },
    });

    if (wasAdded) notifySuccess("Token added successfully");
    else notifyError("Failed to add token");
  } catch (error) {
    console.error(error);
    notifyError("Failed to add token");
    throw error;
  }
};

/* -------------------------
   ICO Contract helpers
   ------------------------- */
export const BUY_TOKEN = async (amount) => {
  try {
    notifySuccess("Calling ICO contract...");
    const ico = await TOKEN_ICO_CONTRACT();

    const tokenDetails = await ico.gettokenDetails();
    const availableToken = Number(ethers.utils.formatEther(tokenDetails.balance.toString()));

    if (availableToken <= 0) {
      notifyError("Insufficient tokens available for purchase");
      return;
    }

    const tokenPriceEther = Number(ethers.utils.formatEther(tokenDetails.tokenPrice.toString()));
    const price = tokenPriceEther * Number(amount);
    const payAmount = ethers.utils.parseEther(price.toString());

    // reasonable gas limit (providers may reject extremely large gas limits)
    const tx = await ico.buyToken(Number(amount), {
      value: payAmount,
      gasLimit: ethers.utils.hexlify(500_000),
    });

    const receipt = await tx.wait();
    notifySuccess("Token purchased successfully");
    return receipt;
  } catch (error) {
    console.error(error);
    const errorMsg = parseErrorMsg(error);
    notifyError(errorMsg);
    throw error;
  }
};

export const TOKEN_WITHDRAW = async () => {
  try {
    notifySuccess("Calling ICO contract...");
    const ico = await TOKEN_ICO_CONTRACT();

    const tokenDetails = await ico.gettokenDetails();
    const availableToken = Number(ethers.utils.formatEther(tokenDetails.balance.toString()));

    if (availableToken <= 0) {
      notifyError("Insufficient tokens available for withdrawal");
      return;
    }

    const tx = await ico.withdrawAllTokens({ gasLimit: ethers.utils.hexlify(500_000) });
    const receipt = await tx.wait();
    notifySuccess("Transaction completed successfully");
    return receipt;
  } catch (error) {
    console.error(error);
    const errorMsg = parseErrorMsg(error);
    notifyError(errorMsg);
    throw error;
  }
};

export const UPDATE_TOKEN = async (_address) => {
  try {
    if (!_address) return notifyError("Data is missing");
    const ico = await TOKEN_ICO_CONTRACT();
    const gasEstimation = await ico.estimateGas.updateToken(_address);
    const tx = await ico.updateToken(_address, { gasLimit: gasEstimation });
    const receipt = await tx.wait();
    notifySuccess("Transaction completed successfully");
    return receipt;
  } catch (error) {
    console.error(error);
    const errorMsg = parseErrorMsg(error);
    notifyError(errorMsg);
    throw error;
  }
};

export const UPDATE_TOKEN_PRICE = async (price) => {
  try {
    if (!price) return notifyError("Data is missing");
    const ico = await TOKEN_ICO_CONTRACT();
    const payAmount = ethers.utils.parseUnits(price.toString(), "ether");
    const gasEstimation = await ico.estimateGas.updateTokenSalePrice(payAmount);
    const tx = await ico.updateTokenSalePrice(payAmount, { gasLimit: gasEstimation });
    const receipt = await tx.wait();
    notifySuccess("Transaction completed successfully");
    return receipt;
  } catch (error) {
    console.error(error);
    const errorMsg = parseErrorMsg(error);
    notifyError(errorMsg);
    throw error;
  }
};
