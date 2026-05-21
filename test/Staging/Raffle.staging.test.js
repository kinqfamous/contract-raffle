const assert = require("assert");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Staging Tests", function () {
      let raffle;
      let deployer;
      let entranceFee;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;

        const deployerSigner = await ethers.getSigner(deployer);
        const raffleDeployment = await deployments.get("Raffle");

        raffle = await ethers.getContractAt(
          "Raffle",
          raffleDeployment.address,
          deployerSigner
        );
        entranceFee = await raffle.getEntranceFee();
      });

      describe("fulfillRandomWords", function () {
        it("works with live Chainlink Automation and VRF", async function () {
          this.timeout(300000);

          const startingTimeStamp = await raffle.getLatestTimeStamp();

          await new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(
                new Error(
                  "Timed out waiting for winnerPicked. Check the VRF subscription, Automation upkeep, and LINK/native funding."
                )
              );
            }, 300000);

            raffle.once("winnerPicked", async () => {
              clearTimeout(timeout);

              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLatestTimeStamp();
                const numPlayers = await raffle.getNumberOfPlayers();

                assert.equal(numPlayers.toString(), "0");
                assert.equal(raffleState.toString(), "0");
                assert(endingTimeStamp.gt(startingTimeStamp));
                assert.equal(recentWinner, deployer);
                resolve();
              } catch (error) {
                reject(error);
              }
            });

            try {
              const tx = await raffle.enterRaffle({ value: entranceFee });
              await tx.wait(1);
            } catch (error) {
              clearTimeout(timeout);
              reject(error);
            }
          });
        });
      });
    });
