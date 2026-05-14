// Raffle

// Enter the Lottery (paying some amount)
// Pick a random winner (verifiable randomn)
// winner to be selected every x minutes -. completely automated

// Chainlin Oracle -. Randomness, Automated Execution (Chainlink Keepers)

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

error Raffle__NotEnoughETH();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/** @title A sample Raffle Contract
 *  @author Famous
 *  @notice This contract is for creating an untamperable decentralized smart contract
 *  @dev This implements Chainlink VRF v2 and Chainlink Keepers
 */
contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
  /* Type declarations */
  enum RaffleState {
    OPEN,
    CALCULATING
  }

  /* state variables */
  uint256 private immutable i_entranceFee;
  address payable[] private s_players;
  VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
  bytes32 private immutable i_gaslane;
  uint64 private immutable i_subscriptionId;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private immutable i_callbackGasLimit;
  uint32 private constant NUM_WORDS = 1;

  // Lottery variables
  address private s_recentWinner;
  RaffleState private s_raffleState;
  uint256 private s_lastTimeStamp;
  uint256 private immutable i_interval;

  /* Events */
  event RaffleEnter(address indexed player);
  event RequestedRaffleWinner(uint256 indexed requestId);
  event winnerPicked(address indexed winner);

  /* Functions */
  constructor(
    address vrfCoordinatorV2, // contract address of the VRF Coordinator
    uint256 entranceFee,
    bytes32 gasLane,
    uint64 subscriptionId,
    uint32 callbackGasLimit,
    uint256 interval
  ) VRFConsumerBaseV2(vrfCoordinatorV2) {
    i_entranceFee = entranceFee;
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    i_gaslane = gasLane;
    i_subscriptionId = subscriptionId;
    i_callbackGasLimit = callbackGasLimit;
    s_raffleState = RaffleState.OPEN;
    s_lastTimeStamp = block.timestamp;
    i_interval = interval;
  }

  function enterRaffle() public payable {
    // require msg.value > i_entranceFee
    if (msg.value < i_entranceFee) {
      revert Raffle__NotEnoughETH();
    }
    if (s_raffleState != RaffleState.OPEN) {
      revert Raffle__NotOpen();
    }
    s_players.push(payable(msg.sender));
    // Emit an event when we update a dynamic array or mapping
    // Name event RaffleEnter
    emit RaffleEnter(msg.sender);
  }

  /**
   *  @dev This is the function that the Chainlink Keeper nodes call
   */
  function checkUpkeep(bytes memory) public override returns (bool upkeepNeeded, bytes memory) {
    // Check if enough time has passed
    // Check if there are any players
    // Check if the contract has ETH
    // If all of the above is true, then return true, otherwise false
    bool isOpen = (s_raffleState == RaffleState.OPEN);
    bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
    bool hasPlayers = (s_players.length > 0);
    bool hasBalance = (address(this).balance > 0);
    upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
  }

  function performUpkeep(bytes calldata) external override {
    (bool upkeepNeeded, ) = checkUpkeep("");
    if (!upkeepNeeded) {
      revert Raffle__UpkeepNotNeeded(
        address(this).balance,
        s_players.length,
        uint256(s_raffleState)
      );
    }
    // Request the random number
    // Do something with it
    // 2 transaction process
    s_raffleState = RaffleState.CALCULATING;
    uint256 requestId = i_vrfCoordinator.requestRandomWords(
      i_gaslane,
      i_subscriptionId,
      REQUEST_CONFIRMATIONS,
      i_callbackGasLimit,
      NUM_WORDS
    );
    emit RequestedRaffleWinner(requestId);
  }

  function fulfillRandomWords(
    uint256 /* requestId */,
    uint256[] memory randomWords
  ) internal override {
    uint256 indexOfWinner = randomWords[0] % s_players.length;
    address payable recentWinner = s_players[indexOfWinner];
    s_recentWinner = recentWinner;
    s_players = new address payable[](0);
    s_lastTimeStamp = block.timestamp;
    s_raffleState = RaffleState.OPEN;
    (bool success, ) = recentWinner.call{ value: address(this).balance }("");
    if (!success) {
      revert Raffle__TransferFailed();
    }
    emit winnerPicked(recentWinner);
  }

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getPlayer(uint256 index) public view returns (address) {
    return s_players[index];
  }

  function getRecentWinner() public view returns (address) {
    return s_recentWinner;
  }

  function getRaffleState() public view returns (RaffleState) {
    return s_raffleState;
  }

  function getNumWords() public pure returns (uint32) {
    return NUM_WORDS;
  }

  function getNumberOfPlayers() public view returns (uint256) {
    return s_players.length;
  }

  function getLatestTimeStamp() public view returns (uint256) {
    return s_lastTimeStamp;
  }

  function getRequestConfirmation() public pure returns (uint256) {
    return REQUEST_CONFIRMATIONS;
  }
}
