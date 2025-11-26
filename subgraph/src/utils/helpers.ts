import { BigInt, BigDecimal, Address, ethereum } from "@graphprotocol/graph-ts";
import { ERC20 } from "../../generated/CLPoolManager/ERC20";
import { Token } from "../../generated/schema";

// Constants
export let FACTORY_ADDRESS = "factory";
export let ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export let WFUMA_ADDRESS = "0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E";
export let USDT_ADDRESS = "0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e";
export let USDC_ADDRESS = "0xf8EA5627691E041dae171350E8Df13c592084848";

// BigInt constants
export let ZERO_BI = BigInt.fromI32(0);
export let ONE_BI = BigInt.fromI32(1);
export let BI_18 = BigInt.fromI32(18);

// BigDecimal constants
export let ZERO_BD = BigDecimal.fromString("0");
export let ONE_BD = BigDecimal.fromString("1");
export let BI_18_BD = BigDecimal.fromString("1000000000000000000");

// Q96 for price calculations
export let Q96 = BigInt.fromI32(2).pow(96);
export let Q192 = Q96.times(Q96);

// Fetch token symbol from contract
export function fetchTokenSymbol(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress);
  let symbolResult = contract.try_symbol();
  if (!symbolResult.reverted) {
    return symbolResult.value;
  }
  
  // Fallback for known tokens
  let address = tokenAddress.toHexString().toLowerCase();
  if (address == WFUMA_ADDRESS.toLowerCase()) return "WFUMA";
  if (address == USDT_ADDRESS.toLowerCase()) return "USDT";
  if (address == USDC_ADDRESS.toLowerCase()) return "USDC";
  
  return "UNKNOWN";
}

// Fetch token name from contract
export function fetchTokenName(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress);
  let nameResult = contract.try_name();
  if (!nameResult.reverted) {
    return nameResult.value;
  }
  
  // Fallback for known tokens
  let address = tokenAddress.toHexString().toLowerCase();
  if (address == WFUMA_ADDRESS.toLowerCase()) return "Wrapped FUMA";
  if (address == USDT_ADDRESS.toLowerCase()) return "Tether USD";
  if (address == USDC_ADDRESS.toLowerCase()) return "USD Coin";
  
  return "Unknown Token";
}

// Fetch token decimals from contract
export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress);
  let decimalsResult = contract.try_decimals();
  if (!decimalsResult.reverted) {
    return BigInt.fromI32(decimalsResult.value);
  }
  
  // Fallback for known tokens
  let address = tokenAddress.toHexString().toLowerCase();
  if (address == USDT_ADDRESS.toLowerCase()) return BigInt.fromI32(6);
  if (address == USDC_ADDRESS.toLowerCase()) return BigInt.fromI32(6);
  
  return BigInt.fromI32(18);
}

// Fetch token total supply from contract
export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress);
  let totalSupplyResult = contract.try_totalSupply();
  if (!totalSupplyResult.reverted) {
    return totalSupplyResult.value;
  }
  return ZERO_BI;
}

// Convert exponent to BigDecimal
export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString("1");
  for (let i = ZERO_BI; i.lt(decimals); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

// Convert token amount to decimal
export function convertTokenToDecimal(
  tokenAmount: BigInt,
  exchangeDecimals: BigInt
): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

// Safe division
export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
  if (amount1.equals(ZERO_BD)) {
    return ZERO_BD;
  }
  return amount0.div(amount1);
}

// Convert sqrtPriceX96 to token prices
export function sqrtPriceX96ToTokenPrices(
  sqrtPriceX96: BigInt,
  token0: Token,
  token1: Token
): BigDecimal[] {
  let num = sqrtPriceX96.times(sqrtPriceX96).toBigDecimal();
  let denom = BigDecimal.fromString(Q192.toString());
  
  let price1 = num
    .div(denom)
    .times(exponentToBigDecimal(token0.decimals))
    .div(exponentToBigDecimal(token1.decimals));
  
  let price0 = safeDiv(ONE_BD, price1);

  return [price0, price1];
}

// Get FUMA price in USD (simplified - would need oracle for production)
export function getEthPriceInUSD(): BigDecimal {
  // Hardcoded initial price: 1 FUMA = $0.0015
  return BigDecimal.fromString("0.0015");
}

// Find FUMA value per token
export function findEthPerToken(token: Token): BigDecimal {
  let address = token.id.toLowerCase();
  
  // WFUMA = 1 FUMA
  if (address == WFUMA_ADDRESS.toLowerCase()) {
    return ONE_BD;
  }
  
  // Stablecoins
  if (address == USDT_ADDRESS.toLowerCase() || address == USDC_ADDRESS.toLowerCase()) {
    // 1 USD = ~666.67 FUMA (inverse of 0.0015)
    return BigDecimal.fromString("666.67");
  }
  
  // Use whitelist pools to derive price
  let whiteList = token.whitelistPools;
  for (let i = 0; i < whiteList.length; i++) {
    // Would need pool price calculation here
  }
  
  return ZERO_BD;
}

// Create day ID from timestamp
export function getDayId(timestamp: BigInt): i32 {
  return timestamp.toI32() / 86400;
}

// Create hour ID from timestamp
export function getHourId(timestamp: BigInt): i32 {
  return timestamp.toI32() / 3600;
}
