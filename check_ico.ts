import { ethers } from 'ethers';
import LaunchpadABI from './src/config/abis/Launchpad.json';

const provider = new ethers.providers.JsonRpcProvider("https://rpc.fushuma.com");
const launchpadContract = new ethers.Contract(
  "0x206236eca2dF8FB37EF1d024e1F72f4313f413E4",
  LaunchpadABI,
  provider
);

async function checkICO() {
  const ico = await launchpadContract.getICO(27);
  const params = ico[0];
  const state = ico[1];
  
  console.log("ICO #27 Data:");
  console.log("Token:", params.token);
  console.log("Start Price:", params.startPrice.toString());
  console.log("End Price:", params.endPrice.toString());
  console.log("Token Decimals:", state.icoTokenDecimals.toString());
  console.log("Total Sold:", state.totalSold.toString());
  console.log("Amount:", params.amount.toString());
  console.log("Is Closed:", state.isClosed);
  
  const icoDecimals = 10 ** Number(state.icoTokenDecimals);
  console.log("\nCalculated icoDecimals:", icoDecimals);
  console.log("Start Price / icoDecimals:", Number(params.startPrice) / icoDecimals);
}

checkICO().catch(console.error);
