import { ethers } from "ethers";
import {
  DEAD1,
  DEAD2,
  ERC20Contract,
  EThPrice,
  setEthPrice,
  UniswapV2PairContract,
  WETH,
  WETHUSDTV2Pair,
  wssProvider,
} from "./constants/constant";
import { match } from "./functions/utils";

const anaylzeAddress = async (pairAddress: string): Promise<void> => {
  // Get the uniswap contract to get the actual token pairAddress

  let token0, token1;
  try {
    token0 = await UniswapV2PairContract.attach(pairAddress).token0();
    token1 = await UniswapV2PairContract.attach(pairAddress).token1();
  } catch (e: any) {
    console.log(e.message);
  }

  // Get the actual token Address
  const token = match(token0, WETH) ? token1 : token0;

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

  const formattedLiquidity =
    parseFloat(ethers.utils.formatUnits(liquidity, tokenDecimals)) * EThPrice;

  console.log({
    tokenName,
    tokenDecimals,
    tokenSymbol,
    formattedLiquidity,
    formattedTSupply,
  });

  //Get Market Cap of the token
  const WETHReserve: string = token0 === WETH ? reserve0 : reserve1;
  const TokenReserve: string = token1 === WETH ? reserve1 : reserve0;

  //Market Cap
  const marketCap = totalSupply.mul(WETHReserve).div(TokenReserve);

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
  });
};

const getTokenInfo = async (tokenAddress: string) => {
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

const getEthPrice = async () => {
  let reserve0, reserve1;
  [reserve0, reserve1] = await UniswapV2PairContract.attach(
    WETHUSDTV2Pair
  ).getReserves();

  setEthPrice(parseInt(reserve1.div(reserve0.div(1000000000000)).toString()));
};

const getHoneyAndTax = async (
  tokenAddress: string,
  pairAddress: string
): Promise<any> => {
  let honeyPot: any, deployer: any, buyTax: any, sellTax: any;

  const honeyPotUrl = `https://api.honeypot.is/v2/IsHoneypot?address=${tokenAddress}&pair=${pairAddress}&chainId=1`;

  fetch(honeyPotUrl)
    .then((res) => res.json())
    .then(async (json) => {
      buyTax = json.simulationResult?.buyTax;
      sellTax = json.simulationResult?.sellTax;
      honeyPot = json.honeypotResult?.IsHoneyPot;
      const creationTx = await wssProvider.getTransaction(
        json.pair.creationTxhash
      );

      try {
        deployer = creationTx.from;
      } catch (e) {
        deployer = "";
      }
    });

  return { buyTax, sellTax, honeyPot, deployer };
};

const main = async () => {
  try {
    const ranAddress: string = "0xa3ad1aaf0306179f0e6e1ac7566fc60cd24d4289";
    getEthPrice();
    await anaylzeAddress(ranAddress);
  } catch (e) {
    console.log(e);
  }
};

main();
