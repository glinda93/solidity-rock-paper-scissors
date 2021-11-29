import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { RockPaperScissors } from "../typechain";

enum Moves {
  ROCK = "ROCK",
  PAPER = "PAPER",
  SCISSORS = "SCISSORS",
}

const { formatBytes32String, keccak256 } = ethers.utils;

function encodeMove(move: Moves, randomness: string = "") {
  const concat = ethers.utils.defaultAbiCoder.encode(
    ["bytes32", "bytes32"],
    [formatBytes32String(move), formatBytes32String(randomness)]
  );
  const hash = keccak256(concat);
  return hash;
}

describe("RockPaperScissors", function () {
  let RPSToken;
  let game: RockPaperScissors;
  // eslint-disable-next-line no-unused-vars
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let aliceMove: Moves = Moves.ROCK;
  let bobMove: Moves = Moves.ROCK;
  const aliceRandomness = "alice";
  const bobRandomness = "bob";

  const blind = 5;

  async function play() {
    await game.connect(alice).play(encodeMove(aliceMove, aliceRandomness), {
      value: blind,
    });

    await game.connect(bob).play(encodeMove(bobMove, bobRandomness), {
      value: blind,
    });
  }

  function evaluate() {
    return game.evaluate(
      alice.address,
      formatBytes32String(aliceMove),
      formatBytes32String(aliceRandomness),
      bob.address,
      formatBytes32String(bobMove),
      formatBytes32String(bobRandomness)
    );
  }

  function claim() {
    return game.claim(
      alice.address,
      formatBytes32String(aliceMove),
      formatBytes32String(aliceRandomness),
      bob.address,
      formatBytes32String(bobMove),
      formatBytes32String(bobRandomness)
    );
  }

  beforeEach(async function () {
    RPSToken = await ethers.getContractFactory("RockPaperScissors");
    [owner, alice, bob] = await ethers.getSigners();
    game = await RPSToken.deploy(blind);
  });

  it("should have blind and pot", async function () {
    const gameBlind = await game.blind();
    const gamePot = await game.pot();
    expect(gameBlind).to.equal(blind);
    expect(gamePot).to.equal(0);
  });

  describe("play", async function () {
    const move = encodeMove(Moves.ROCK);
    it("should require blind", async function () {
      await expect(game.connect(alice).play(move)).to.be.revertedWith(
        "bet is smaller than blind"
      );
      await game.connect(alice).play(move, {
        value: blind,
      });
      const currentPot = await game.pot();
      expect(currentPot).to.equal(blind);
    });

    it("should revert when player already has a move", async function () {
      await game.connect(alice).play(move, {
        value: blind,
      });

      await expect(
        game.connect(alice).play(move, { value: blind })
      ).to.be.revertedWith("player already has a move");
    });

    it("should store move", async function () {
      await game.connect(alice).play(move, {
        value: blind,
      });

      const aliceMove = await game.moves(alice.address);
      expect(aliceMove).to.equal(move);
    });
  });

  describe("evaluate", function () {
    it("should return address(0) when it's tied", async function () {
      aliceMove = Moves.ROCK;
      bobMove = Moves.ROCK;

      await play();

      const result = await evaluate();
      expect(result).to.equal("0x0000000000000000000000000000000000000000");
    });

    it("should return winner's address", async function () {
      aliceMove = Moves.ROCK;
      bobMove = Moves.SCISSORS;

      await play();

      const result = await evaluate();
      expect(result).to.equal(alice.address);
    });
  });

  describe("claim", async function () {
    it("should require there is a winner", async function () {
      aliceMove = Moves.ROCK;
      bobMove = Moves.ROCK;

      await play();
      await expect(claim()).to.be.revertedWith("no winner");
    });
    it("should require pot is not empty", async function () {
      aliceMove = Moves.ROCK;
      bobMove = Moves.PAPER;
      await play();
      await claim();
      await expect(claim()).to.be.revertedWith("pot is empty");
    });
    it("should transfer pot to winner", async function () {
      aliceMove = Moves.ROCK;
      bobMove = Moves.PAPER;
      await play();

      await claim();

      const currentPot = await game.pot();

      expect(currentPot).to.equals(0);
    });
  });
});
