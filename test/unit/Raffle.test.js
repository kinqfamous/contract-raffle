const assert = require("assert");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");
const { developmentChains, NetworkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle unit Tests", function () {
      let raffle;
      let vrfCoordinatorV2Mock;
      let deployer;
      let entranceFee;
      let interval;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);

        const deployerSigner = await ethers.getSigner(deployer);
        const raffleDeployment = await deployments.get("Raffle");
        const vrfCoordinatorDeployment = await deployments.get("VRFCoordinatorV2_5Mock");

        raffle = await ethers.getContractAt(
          "Raffle",
          raffleDeployment.address,
          deployerSigner
        );
        vrfCoordinatorV2Mock = await ethers.getContractAt(
          "VRFCoordinatorV2_5Mock",
          vrfCoordinatorDeployment.address,
          deployerSigner
        );
        entranceFee = await raffle.getEntranceFee();
        interval = Number(NetworkConfig[network.config.chainId].interval);
      });

      describe("constructor", function () {
        it("initializes the Raffle contract correctly", async function () {
          const raffleState = await raffle.getRaffleState();

          assert.equal(raffleState.toString(), "0");
        });
      });

      describe("enterRaffle", function () {
        it("reverts if the user does not pay enough", async function () {
          await assert.rejects(
            raffle.enterRaffle({ value: 0 }),
            /Raffle__NotEnoughETH/
          );
        });

        it("reverts if the raffle is not open", async function () {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [interval + 1]);
          await network.provider.send("evm_mine");
          await raffle.performUpkeep("0x");

          await assert.rejects(
            raffle.enterRaffle({ value: entranceFee }),
            /Raffle__NotOpen/
          );
        });

        it("stores the player when they enter", async function () {
          await raffle.enterRaffle({ value: entranceFee });
          const player = await raffle.getPlayer(0);

          assert.equal(player, deployer);
        });

        it("emits a RaffleEnter event", async function () {
          const tx = await raffle.enterRaffle({ value: entranceFee });
          const receipt = await tx.wait(1);
          const raffleEnterEvent = receipt.events.find(
            (event) => event.event === "RaffleEnter"
          );

          assert.equal(raffleEnterEvent.args.player, deployer);
        });
      });

      describe("performUpkeep", function () {
        it("reverts when checkUpkeep returns false", async function () {
          await assert.rejects(
            raffle.performUpkeep("0x"),
            /Raffle__UpkeepNotNeeded/
          );
        });

        it("updates the state, emits an event, and calls the VRF coordinator", async function () {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [interval + 1]);
          await network.provider.send("evm_mine");

          const tx = await raffle.performUpkeep("0x");
          const receipt = await tx.wait(1);
          const raffleState = await raffle.getRaffleState();
          const requestEvent = receipt.events.find(
            (event) => event.event === "RequestedRaffleWinner"
          );

          assert.equal(raffleState.toString(), "1");
          assert(requestEvent.args.requestId.gt(0));
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async function () {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [interval + 1]);
          await network.provider.send("evm_mine");
        });

        it("can only be called after performUpkeep", async function () {
          await assert.rejects(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address),
            /InvalidRequest/
          );
        });

        it("picks a winner, resets the lottery, and sends money", async function () {
          const additionalEntrants = 3;
          const startingAccountIndex = 1;
          const accounts = await ethers.getSigners();

          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + additionalEntrants;
            i++
          ) {
            await raffle.connect(accounts[i]).enterRaffle({ value: entranceFee });
          }

          const startingTimeStamp = await raffle.getLatestTimeStamp();
          const startingWinnerBalance = await accounts[1].getBalance();

          await new Promise(async (resolve, reject) => {
            raffle.once("winnerPicked", async () => {
              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLatestTimeStamp();
                const endingWinnerBalance = await accounts[1].getBalance();
                const numPlayers = await raffle.getNumberOfPlayers();
                const prize = entranceFee.mul(additionalEntrants + 1);

                assert.equal(numPlayers.toString(), "0");
                assert.equal(raffleState.toString(), "0");
                assert(endingTimeStamp.gt(startingTimeStamp));
                assert.equal(recentWinner, accounts[1].address);
                assert.equal(
                  endingWinnerBalance.toString(),
                  startingWinnerBalance.add(prize).toString()
                );
                resolve();
              } catch (error) {
                reject(error);
              }
            });

            try {
              const tx = await raffle.performUpkeep("0x");
              const receipt = await tx.wait(1);
              const requestEvent = receipt.events.find(
                (event) => event.event === "RequestedRaffleWinner"
              );

              await vrfCoordinatorV2Mock.fulfillRandomWords(
                requestEvent.args.requestId,
                raffle.address
              );
            } catch (error) {
              reject(error);
            }
          });
        });
      });
    });
