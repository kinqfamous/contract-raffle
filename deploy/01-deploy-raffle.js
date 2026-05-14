const { network, ethers } = require("hardhat");
const { NetworkConfig, developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  const chainConfig = NetworkConfig[chainId];

  if (!chainConfig) {
    throw new Error(`Missing NetworkConfig for chainId ${chainId}`);
  }

  let vrfCoordinatorV2Address;
  let subscriptionId;

  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.events[0].args.subId;

    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
  } else {
    vrfCoordinatorV2Address = chainConfig.vrfCoordinatorV2;
    subscriptionId = chainConfig.subscriptionId;
  }

  const args = [
    vrfCoordinatorV2Address,
    chainConfig.entranceFee,
    chainConfig.gasLane,
    subscriptionId,
    chainConfig.callbackGasLimit,
    chainConfig.interval,
  ];

  log("----------------------------------------------------");
  const raffle = await deploy("Raffle", {
    from: deployer,
    args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(raffle.address, args);
  }
};

module.exports.tags = ["all", "raffle"];
module.exports.dependencies = ["mocks"];
