const { ethers } = require("hardhat");

const SEPOLIA_VRF_SUBSCRIPTION_ID = process.env.VRF_SUBSCRIPTION_ID || "";

const NetworkConfig = {
  11155111: {
    name: "sepolia",
    vrfCoordinatorV2: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    subscriptionId: SEPOLIA_VRF_SUBSCRIPTION_ID,
    callbackGasLimit: "500000",
    interval: "30",
    nativePayment: false,
  },
  4: {
    name: "sepolia",
    vrfCoordinatorV2: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    subscriptionId: SEPOLIA_VRF_SUBSCRIPTION_ID,
    callbackGasLimit: "500000",
    interval: "30",
    nativePayment: false,
  },
  31337: {
    name: "hardhat",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    callbackGasLimit: "500000",
    interval: "30",
    nativePayment: false,
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  NetworkConfig,
  developmentChains,
};
