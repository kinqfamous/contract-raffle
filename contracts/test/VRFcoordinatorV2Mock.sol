// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract VRFCoordinatorV2_5Mock {
  error InvalidConsumer(uint256 subId, address consumer);
  error InvalidRequest();
  error InvalidSubscription();

  event SubscriptionCreated(uint256 indexed subId, address owner);
  event SubscriptionFunded(uint256 indexed subId, uint256 oldBalance, uint256 newBalance);
  event SubscriptionConsumerAdded(uint256 indexed subId, address consumer);
  event RandomWordsRequested(
    bytes32 indexed keyHash,
    uint256 requestId,
    uint256 preSeed,
    uint256 indexed subId,
    uint16 minimumRequestConfirmations,
    uint32 callbackGasLimit,
    uint32 numWords,
    bytes extraArgs,
    address indexed sender
  );
  event RandomWordsFulfilled(uint256 indexed requestId, uint256 outputSeed, uint256 indexed subId, bool success);

  struct Subscription {
    uint96 balance;
    address owner;
  }

  struct Request {
    uint256 subId;
    uint32 callbackGasLimit;
    uint32 numWords;
    address sender;
  }

  uint256 private s_currentSubId;
  uint256 private s_nextRequestId = 1;

  mapping(uint256 => Subscription) private s_subscriptions;
  mapping(uint256 => Request) private s_requests;
  mapping(uint256 => mapping(address => bool)) private s_consumers;

  constructor(uint96, uint96, int256) {}

  function createSubscription() external returns (uint256 subId) {
    subId = ++s_currentSubId;
    s_subscriptions[subId] = Subscription({ balance: 0, owner: msg.sender });
    emit SubscriptionCreated(subId, msg.sender);
  }

  function fundSubscription(uint256 subId, uint256 amount) external {
    Subscription storage subscription = s_subscriptions[subId];
    if (subscription.owner == address(0)) {
      revert InvalidSubscription();
    }

    uint256 oldBalance = subscription.balance;
    subscription.balance += uint96(amount);
    emit SubscriptionFunded(subId, oldBalance, subscription.balance);
  }

  function addConsumer(uint256 subId, address consumer) external {
    Subscription storage subscription = s_subscriptions[subId];
    if (subscription.owner == address(0)) {
      revert InvalidSubscription();
    }

    s_consumers[subId][consumer] = true;
    emit SubscriptionConsumerAdded(subId, consumer);
  }

  function requestRandomWords(
    VRFV2PlusClient.RandomWordsRequest calldata req
  ) external returns (uint256 requestId) {
    if (s_subscriptions[req.subId].owner == address(0)) {
      revert InvalidSubscription();
    }
    if (!s_consumers[req.subId][msg.sender]) {
      revert InvalidConsumer(req.subId, msg.sender);
    }

    requestId = s_nextRequestId++;
    s_requests[requestId] = Request({
      subId: req.subId,
      callbackGasLimit: req.callbackGasLimit,
      numWords: req.numWords,
      sender: msg.sender
    });

    emit RandomWordsRequested(
      req.keyHash,
      requestId,
      requestId,
      req.subId,
      req.requestConfirmations,
      req.callbackGasLimit,
      req.numWords,
      req.extraArgs,
      msg.sender
    );
  }

  function fulfillRandomWords(uint256 requestId, address consumer) external {
    Request memory request = s_requests[requestId];
    if (request.sender == address(0)) {
      revert InvalidRequest();
    }

    uint256[] memory randomWords = new uint256[](request.numWords);
    for (uint256 i = 0; i < request.numWords; i++) {
      randomWords[i] = uint256(keccak256(abi.encode(requestId, i)));
    }

    delete s_requests[requestId];

    (bool success, ) = consumer.call{ gas: request.callbackGasLimit }(
      abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, randomWords)
    );
    emit RandomWordsFulfilled(requestId, requestId, request.subId, success);
  }
}
