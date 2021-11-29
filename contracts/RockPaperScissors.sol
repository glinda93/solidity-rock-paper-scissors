//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "hardhat/console.sol";

contract RockPaperScissors is ReentrancyGuard {
    bytes32 internal constant ROCK = "ROCK";
    bytes32 internal constant PAPER = "PAPER";
    bytes32 internal constant SCISSORS = "SCISSORS";

    // holds player's moves
    mapping(address => bytes32) public moves;
    // forced bet amount
    uint256 public blind;
    // total sum of bets
    uint256 public pot;

    constructor(uint256 _blind) {
        blind = _blind;
    }

    function play(bytes32 move) external payable {
        require(msg.value >= blind, "bet is smaller than blind");
        require(moves[msg.sender] == bytes32(0), "player already has a move"); // make sure player hasnt played before
        moves[msg.sender] = move;
        pot += msg.value;
    }

    function claim(
        address alice,
        bytes32 alicemove,
        bytes32 aliceRandomness,
        address bob,
        bytes32 bobmove,
        bytes32 bobRandomness
    ) external {
        address winner = this.evaluate(
            alice,
            alicemove,
            aliceRandomness,
            bob,
            bobmove,
            bobRandomness
        );
        require(winner != address(0), "no winner");
        require(pot > 0, "pot is empty");
        uint256 amount = pot;
        pot = 0;
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = address(winner).call{value: amount}("");
        require(success, "transfer failed");
    }

    function evaluate(
        address alice,
        bytes32 alicemove,
        bytes32 aliceRandomness,
        address bob,
        bytes32 bobmove,
        bytes32 bobRandomness
    ) external view returns (address winner) {
        // make sure the commitment of the moves hold - Player now reveals what their move was and randomness can be made public at this point
        require(
            keccak256(abi.encodePacked(alicemove, aliceRandomness)) ==
                moves[alice],
            "alice's proof not correct"
        );

        // check that bob isn't trying to change their move and their move was correct
        require(
            keccak256(abi.encodePacked(bobmove, bobRandomness)) == moves[bob],
            "bob's proof not correct"
        );

        // it's a draw if both users picked the same move and same randomness, this is possible if their randomness was empty!
        if (alicemove == bobmove) {
            return address(0);
        }

        if (alicemove == ROCK && bobmove == PAPER) {
            return bob;
        } else if (bobmove == ROCK && alicemove == PAPER) {
            return alice;
        } else if (alicemove == SCISSORS && bobmove == PAPER) {
            return alice;
        } else if (bobmove == SCISSORS && alicemove == PAPER) {
            return bob;
        } else if (alicemove == ROCK && bobmove == SCISSORS) {
            return alice;
        } else if (bobmove == ROCK && alicemove == SCISSORS) {
            return bob;
        }

        return address(0);
    }
}
