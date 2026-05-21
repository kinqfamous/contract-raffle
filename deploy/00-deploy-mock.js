const { ethers, network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

const BASE_FEE = ethers.utils.parseEther("0.25");
const GAS_PRICE_LINK = 1e9;
const WEI_PER_UNIT_LINK = 4e15;

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  if (!developmentChains.includes(network.name)) {
    return;
  }

  log("----------------------------------------------------");
  await deploy("VRFCoordinatorV2_5Mock", {
    from: deployer,
    log: true,
    args: [BASE_FEE, GAS_PRICE_LINK, WEI_PER_UNIT_LINK],
  });
  log("Mocks deployed!");
  log("----------------------------------------------------");
};

module.exports.tags = ["all", "mocks"];
