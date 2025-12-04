import { ethers } from "ethers";
import StakingDappABI from  "./StakingDapp.json";
import TokenICO from "./TokenICO.json";
import CustomTokenABI from "./ERC20.json";

//CONTRACT
const STAKING_DAPP_ADDRESS = process.env.NEXT_PUBLIC_STAKING_DAPP;
const TOKEN_ICO = process.env.NEXT_PUBLIC_TOKEN_ICO;

//TOKEN
const DEPOSIT_TOKEN = process.env.NEXT_PUBLIC_DEPOSIT_TOKEN;
const REWARD_TOKEN = process.env.NEXT_PUBLIC_REWARD_TOKEN;

export function toEth(amount, decimals = 18){
    const toEth = ethers.utils.formatUnits(amount, decimals);
    return toEth.toString();
}

export const tokenContract = async() => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const {ethereum} = window;

    if (!ethereum) {
        throw new Error("Ethereum provider not found");
    }

    if (!DEPOSIT_TOKEN) {
        throw new Error("Deposit token address not configured. Please set NEXT_PUBLIC_DEPOSIT_TOKEN in your .env file");
    }

    // Validate that the address is a valid Ethereum address
    if (!ethers.utils.isAddress(DEPOSIT_TOKEN)) {
        throw new Error(`Invalid token address: ${DEPOSIT_TOKEN}. Please check your NEXT_PUBLIC_DEPOSIT_TOKEN environment variable.`);
    }

    const signer = provider.getSigner();

    // Check if contract exists at this address
    const code = await provider.getCode(DEPOSIT_TOKEN);
    if (code === "0x" || code === "0x0") {
        throw new Error(`No contract found at address ${DEPOSIT_TOKEN}. Please ensure the token contract is deployed to this address on the current network.`);
    }

    const contractReader = new ethers.Contract(
        DEPOSIT_TOKEN,
        CustomTokenABI.abi,
        signer        
    );
    return contractReader;
}

export const contract = async() => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const {ethereum} = window;

    if (!ethereum) {
        throw new Error("Ethereum provider not found");
    }

    if (!STAKING_DAPP_ADDRESS) {
        throw new Error("Staking DApp contract address not configured. Please set NEXT_PUBLIC_STAKING_DAPP in your .env file");
    }

    // Validate that the address is a valid Ethereum address
    if (!ethers.utils.isAddress(STAKING_DAPP_ADDRESS)) {
        throw new Error(`Invalid contract address: ${STAKING_DAPP_ADDRESS}. Please check your NEXT_PUBLIC_STAKING_DAPP environment variable.`);
    }

    const signer = provider.getSigner();

    // Check if contract exists at this address
    const code = await provider.getCode(STAKING_DAPP_ADDRESS);
    if (code === "0x" || code === "0x0") {
        throw new Error(`No contract found at address ${STAKING_DAPP_ADDRESS}. Please ensure the contract is deployed to this address on the current network.`);
    }

    const contractReader = new ethers.Contract(
        STAKING_DAPP_ADDRESS,
        StakingDappABI.abi,
        signer        
    );
    return contractReader;
}

export const ERC20 = async(isAddress, userAddress) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);;
    const {ethereum} = window;
    if(ethereum) {
        const signer = provider.getSigner();
        const contractReader = new ethers.Contract(
            isAddress,
            CustomTokenABI.abi,
            signer
        );

        const token = {
            name: await contractReader.name(),
            symbol: await contractReader.symbol(),
            address: await contractReader.address,
            totalSupply: toEth(await contractReader.totalSupply()),
            balance: toEth(await contractReader.balanceOf(userAddress)),
            contractTokenBalance: toEth(
                await contractReader.balanceOf(STAKING_DAPP_ADDRESS)
            ),
        };
        return token;
    }
}

//TOKEN ICO CONTRACT
export const TOKEN_ICO_CONTRACT = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const { ethereum } = window;
    if (ethereum) {
        const signer = provider.getSigner();

        const contractReader = new ethers.Contract(TOKEN_ICO, TokenICO.abi, signer);
        
        return contractReader;
    }
}

export const LOAD_TOKEN_ICO = async () => {
    try {
        const contract = await TOKEN_ICO_CONTRACT();
        const tokenAddress= await contract.tokenAddress();
        const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
        if (tokenAddress != ZERO_ADDRESS) {
            console.log("HEY", tokenAddress);
            const tokenDetails = await contract.getTokenDetails();
            const contractOwner = await contract.owner();
            const soldTokens = await contract.soldTokens();
            const ICO_TOKEN = await TOKEN_ICO_ERC20();
        }

        const token = {
            tokenBal: ethers.utils.formatEther(tokenDetails.balance.toString()),
            name: tokenDetails.name,
            symbol: tokenDetails.symbol,
            supply: ethers.utils.formatEther(tokenDetails.supply.toString()),
            tokenPrice: ethers.utils.formatEther(tokenDetails.tokenPrice.toString()),
            tokenAddress: tokenDetails.tokenAddr,
            owner: contractOwner.toLowerCase(),
            soldTokens: soldTokens.toNumber(),
            token: ICO_TOKEN,
        };
        return token;
        
    } catch (error) {
        console.log(error);
    }
};


export const TOKEN_ICO_ERC20 = async() => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);;
    const {ethereum} = window;
    try {
            if(ethereum) {
        const signer = provider.getSigner();
        const contractReader = new ethers.Contract(
            DEPOSIT_TOKEN,
            CustomTokenABI.abi,
            signer
        );
        //USER ADDRESS
        const userAddress = await signer.getAddress();
        const nativeBalance = await signer.getBalance();
        const balance = await contractReader.balanceOf(userAddress);

        const token = {
            address: await contractReader.address,
            name: await contractReader.name(),
            symbol: await contractReader.symbol(),
            decimals: await contractReader.decimals(),
            supply: toEth(await contractReader.totalSupply()),
            balance: toEth(balance),
            nativeBalance: toEth(nativeBalance.toString()),
        };
        return token;
    }
    } catch (error) {
        console.log(error);
    }

}