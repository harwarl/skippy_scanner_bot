import { ethers } from "ethers";
import {
  DEAD1,
  DEAD2,
  ERC20Contract,
  EThPrice,
  provider,
  setEthPrice,
  UniswapV2PairContract,
  WETH,
  WETHUSDTV2Pair,
  wssProvider,
} from "../constants/constant";
import dotenv from "dotenv";
import IUniswapV2PairAbi from "../ABIs/IuniswapV2Pair";
import abiDecoder from "abi-decoder";
dotenv.config();

export interface ContractDetails {
  contractAddress: string;
  contractCreator: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  contractFactory: any;
  creationBytecode: any;
  fromBlock: any;
}

export enum InputType {
  address,
  url,
}

export type TInput = {
  input: string;
  inputType: InputType;
};

export const iface = new ethers.utils.Interface(IUniswapV2PairAbi);
abiDecoder.addABI(IUniswapV2PairAbi);

export const match = (a: string, b: string) => {
  if (a == null || a == undefined) return false;
  return a.toLowerCase() === b.toLowerCase();
};

export const getCreationBlock = async (
  tokenAddress: string
): Promise<ContractDetails> => {
  let contractDetails = await (
    await fetch(
      `https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${tokenAddress}&apikey=${process.env.ETHERSCAN_API_KEY}`
    )
  ).json();

  if (contractDetails?.result?.length < 0) {
    throw new Error("Error Getting Contract Result");
  }

  let latestBlock = await provider.getBlockNumber();

  let creationBlock = contractDetails?.result[0].blockNumber;

  if (latestBlock - creationBlock > 10000) {
    creationBlock = latestBlock - 10000;
  }

  return { ...contractDetails.result[0], fromBlock: creationBlock };
};

export const getAdditionalTokenDetails = async (pairAddress: string) => {
  try {
    const tokenDetails = await (
      await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/ethereum/${pairAddress}`
      )
    ).json();

    return tokenDetails;
  } catch (error) {
    console.log({ error });
    return;
  }
};

export const getEthPrice = async () => {
  let reserve0, reserve1;
  [reserve0, reserve1] = await UniswapV2PairContract.attach(
    WETHUSDTV2Pair
  ).getReserves();

  setEthPrice(parseInt(reserve1.div(reserve0.div(1000000000000)).toString()));
};

export const getVolume = async (
  fromBlock: number,
  tokenPairAddress: string,
  tokenType: number
) => {
  let latestBlock = await provider.getBlock("latest");
  //get Swap signature
  let logsParams: Record<any, any> = {
    fromBlock: Number(fromBlock),
    toBlock: latestBlock.number,
    address: tokenPairAddress,
    topics: [
      "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
      // "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    ],
  };

  const logs: any[] = await provider.getLogs(logsParams);

  let totalVolume = ethers.BigNumber.from(0);
  for (const log of logs) {
    let decodedLog = iface.parseLog(log);
    // totalVolume = totalVolume.add(decodedLog.args.value);
    if ((tokenType = 0)) {
      totalVolume = totalVolume
        .add(decodedLog.args.amount0In)
        .add(decodedLog.args.amount0Out);
    } else {
      totalVolume = totalVolume
        .add(decodedLog.args.amount1In)
        .add(decodedLog.args.amount1Out);
    }
  }

  return totalVolume;
};

export const getTokenInfo = async (tokenAddress: string) => {
  const tokenContract = ERC20Contract.attach(tokenAddress);
  const tokenName = await tokenContract.name();
  const tokenSymbol = await tokenContract.symbol();
  const tokenDecimals = await tokenContract.decimals();
  const totalSupply = await tokenContract.totalSupply();
  let owner;
  try {
    owner = await tokenContract.owner();
  } catch (e) {
    try {
      owner = await tokenContract.getOwner();
    } catch (ee) {
      owner = "";
    }
  }

  return {
    tokenContract,
    tokenName,
    tokenDecimals,
    tokenSymbol,
    totalSupply,
    owner,
  };
};

export const analyseBotInput = async (input: string): Promise<TInput> => {
  await getEthPrice();
  if (input.startsWith("0x")) {
    return { input, inputType: InputType.address };
  } else {
    if (input.split("/").pop()?.startsWith("0x")) {
      return { input: input.split("/").pop()!, inputType: InputType.url };
    } else {
      throw new Error("Invalid input");
    }
  }
};

export const sortTokens = (a: string, b: string) => {
  if (ethers.BigNumber.from(a).lt(ethers.BigNumber.from(b))) return [a, b];
  return [b, a];
};

export const getPairAddress = (tokenAddress: string) => {
  let factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  let [token0, token1] = sortTokens(tokenAddress, WETH);

  const salt = ethers.utils.keccak256(token0 + token1.replace("0x", ""));
  const pairAddress = ethers.utils.getCreate2Address(
    factoryAddress,
    salt,
    "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f"
  );

  console.log({ pairAddress });
  return pairAddress;
};

export const anaylzeAddress = async (
  tokenAddress: string,
  inputType: InputType
): Promise<any> => {
  // Get the uniswap contract to get the actual token pairAddress

  // If the input type is an address, Get the pair address to be used in those places
  // If the input type is a url, It already has the pair address

  let pairAddress = "";

  if (inputType == InputType.address) {
    // Get the pair address
    pairAddress = getPairAddress(tokenAddress);
  } else if (inputType == InputType.url) {
    pairAddress = tokenAddress;
  } else {
    throw new Error("Invalid Input Detected");
  }

  let token0, token1;
  try {
    token0 = await UniswapV2PairContract.attach(pairAddress).token0();
    token1 = await UniswapV2PairContract.attach(pairAddress).token1();
  } catch (e: any) {
    console.log(e.message);
  }

  // Get the actual token Address

  const token = match(token0, WETH) ? token1 : token0;

  if (inputType == InputType.address && token !== tokenAddress) {
    throw new Error("Invalid Token Address");
  }
  // let tokenType: number = match(token0, WETH) ? 1 : 0;
  // console.log({ token0, token1, WETH });
  // console.log({ tokenType });

  //Get the Token Info
  const { tokenName, tokenDecimals, tokenSymbol, totalSupply, owner } =
    await getTokenInfo(token);

  const formattedTSupply = ethers.utils.formatUnits(totalSupply, tokenDecimals);

  //Get Liquidity Information
  let reserve0, reserve1;

  [reserve0, reserve1] = await UniswapV2PairContract.attach(
    pairAddress
  ).getReserves();

  const liquidity = match(token0, WETH) ? reserve0.mul(2) : reserve1.mul(2);
  console.log({ liquidity });

  const formattedLiquidity =
    parseFloat(
      ethers.utils.formatUnits(
        liquidity,
        await ERC20Contract.attach(WETH).decimals()
      )
    ) * EThPrice;

  //Get Market Cap of the token
  const WETHReserve = token0 === WETH ? reserve0 : reserve1;
  const TokenReserve = token0 === WETH ? reserve1 : reserve0;

  //Market Cap
  const marketCap = totalSupply.mul(WETHReserve).div(TokenReserve);
  console.log(
    "Market Cap -",
    ethers.utils.formatUnits(marketCap, tokenDecimals)
  );

  console.log({ EThPrice });

  const formattedMarketCap: number =
    parseFloat(
      ethers.utils.formatUnits(
        marketCap,
        await ERC20Contract.attach(WETH).decimals()
      )
    ) * EThPrice;

  //Renounced
  const renounced: boolean =
    match(owner, DEAD1) || match(owner, DEAD2) ? true : false;

  //Get Contract Deployer
  let honeyPotUrl = `https://api.honeypot.is/v2/IsHoneypot?address=${token}&pair=${pairAddress}&chainId=1`;

  const resJson = await (await fetch(honeyPotUrl)).json();
  let simulation, buyTax, sellTax, honeyPot, deployer, totalHolders;

  simulation = resJson.simulationSuccess;
  buyTax = resJson.simulationResult?.buyTax;
  sellTax = resJson.simulationResult?.sellTax;
  honeyPot = resJson.honeypotResult?.isHoneypot;
  totalHolders = resJson.token?.totalHolders;

  const creationTx = await wssProvider.getTransaction(
    resJson.pair.creationTxHash
  );

  try {
    deployer = creationTx.from;
  } catch (error) {
    deployer = "";
  }

  //Get the volume of the token from block 15000000 to latest
  const contractCreationDetails = await getCreationBlock(token);

  // const totalVolume = await getVolume(
  //   contractCreationDetails.fromBlock,
  //   pairAddress,
  //   tokenType
  // );
  // let volumeDisplay =
  //   parseFloat(ethers.utils.formatUnits(totalVolume, tokenDecimals)) * EThPrice;

  const tokenPriceInWeth =
    parseFloat(
      ethers.utils.formatUnits(
        WETHReserve,
        await ERC20Contract.attach(WETH).decimals()
      )
    ) /
    parseFloat(
      ethers.utils.formatUnits(
        TokenReserve,
        await ERC20Contract.attach(token).decimals()
      )
    );

  const tokenPriceUsd = tokenPriceInWeth * EThPrice;

  //Getting the 24h and the changing volumes
  const test = await getAdditionalTokenDetails(pairAddress);

  console.log({
    tokenName,
    tokenDecimals,
    tokenSymbol,
    formattedLiquidity,
    formattedTSupply,
    formattedMarketCap,
    deployer,
    renounced,
    simulation,
    buyTax,
    sellTax,
    honeyPot,
    totalHolders,
    // volumeDisplay,
    tokenPriceUsd,
    tokenPriceInWeth,
    fdv: test?.pair?.fdv,
    pairAge: new Date(Number(contractCreationDetails.timestamp)),
    vol: test?.pair?.volume,
    info: test?.pair?.info,
    websites: test?.pair?.info?.websites,
    socials: test?.pair?.info?.socials,
    txns: test?.pair?.txns,
  });

  // return "Some Res Sha";
  let resp: string = `
  💎 Token Information
  🔹 Name: ${tokenName}
  🔹 Symbol: ${tokenSymbol}
  🔹 Decimals: ${tokenDecimals}
  💵 Price (USD): ${tokenPriceUsd}
  💰 Price (in WETH): ${tokenPriceInWeth} WETH

  📊 Metrics
  💧 Liquidity: ${formattedLiquidity}
  🪙 Total Supply: ${formattedTSupply}
  📈 Market Cap: ${formattedMarketCap}
  🌍 FDV (Fully Diluted Valuation): ${test?.pair?.fdv}
  👥 Holders: ${totalHolders}

  🔍 Contract Details
  🔑 Deployer: ${deployer}
  ✅ Ownership Renounced: ${renounced ? "Yes ✅" : "No ❌"}
  🕒 Age of Pair: ${new Date(
    Number(contractCreationDetails.timestamp)
  ).toLocaleDateString()}
  📥 Buy Tax: ${buyTax}%
  📤 Sell Tax: ${sellTax}%
  🚨 Honeypot Check: ${
    honeyPot ? "🚨 Potential Honeypot!" : "✅ Safe (Simulation Passed)"
  }

  📊 Additional Info
  📊 24h Volume: ${test?.pair?.volume?.h24}
  📊 <b>Transaction Details</b>
  ⏱ <b>Last 5 Minutes</b>
   🔼 Buys: <b>${test?.pair?.txns.m5.buys}</b>
   🔽 Sells: <b>${test?.pair?.txns.m5.sells}</b>

  ⏱ <b>Last 1 Hour</b>
   🔼 Buys: <b>${test?.pair?.txns.h1.buys}</b>
   🔽 Sells: <b>${test?.pair?.txns.h1.sells}</b>

  ⏱ <b>Last 6 Hours</b>
   🔼 Buys: <b>${test?.pair?.txns.h6.buys}</b>
   🔽 Sells: <b>${test?.pair?.txns.h6.sells}</b>

  ⏱ <b>Last 24 Hours</b>
   🔼 Buys: <b>${test?.pair?.txns.h24.buys}</b>
   🔽 Sells: <b>${test?.pair?.txns.h24.sells}</b>
    `;

  if (
    test?.pair?.info?.websites.length > 0 ||
    test?.pair?.info?.socials.length > 0
  ) {
    const websiteLinks = test?.pair?.info?.websites
      ?.map(
        (web: any) => `<a href="${web?.url}" target="_blank">${web?.label}</a>`
      )
      .join(", ");

    const socialLinks = test?.pair?.info?.socials
      ?.map(
        (social: any) =>
          `<a href="${social?.url}" target="_blank">${social?.type}</a>`
      )
      .join(", ");

    resp += `
  🌐 <b>Social Links</b>
  ${websiteLinks ? `🌐 Websites: ${websiteLinks}` : ""}
  ${socialLinks ? `💬 Socials: ${socialLinks}` : ""}
  `;
  }

  return resp;
};
