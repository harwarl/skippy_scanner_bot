import { ethers } from "ethers";
import * as dotenv from "dotenv";
import IERC20ABI from "../ABIs/IERC20";
import Web3 from "web3";
import IUniswapV2PairAbi from "../ABIs/IuniswapV2Pair";
dotenv.config();

export const provider = new ethers.providers.JsonRpcProvider(
  process.env.RPC_URL || ""
);

export const wssProvider = new ethers.providers.WebSocketProvider(
  process.env.RPC_URL_WSS || ""
);

export const web3 = new Web3(
  new Web3.providers.HttpProvider(process.env.RPC_URL || " ")
);

export const ERC20Contract = new ethers.Contract(
  ethers.constants.AddressZero,
  IERC20ABI,
  wssProvider
);

export const UniswapV2PairContract = new ethers.Contract(
  ethers.constants.AddressZero,
  IUniswapV2PairAbi,
  wssProvider
);

//Addresses
export const WETH: string = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

export let EThPrice: number = 0;

export const WETHUSDTV2Pair: string =
  "0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852";

export const DEAD1: string = "0x000000000000000000000000000000000000dead";
export const DEAD2: string = "0x0000000000000000000000000000000000000000";

export const setEthPrice = (_ethPrice: number) => {
  EThPrice = _ethPrice;
};
