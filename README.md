# Solidity CTFs

This repository contains my solutions to several Solidity & EVM based CTFs and challenges.

- [**Ethernaut**](https://ethernaut.openzeppelin.com/) | [My Writeups](https://dev.to/erhant/series/18918)
  - [(1)](./docs/ethernaut/Fallback.md) Fallback
  - [(2)](./docs/ethernaut/Fallout.md) Fallout
  - [(3)](./docs/ethernaut/Coinflip.md) CoinFlip
  - [(4)](./docs/ethernaut/Telephone.md) Telephone
  - [(5)](./docs/ethernaut/Token.md) Token
  - [(6)](./docs/ethernaut/Delegation.md) Delegation
  - [(7)](./docs/ethernaut/Force.md) Force
  - [(8)](./docs/ethernaut/Vault.md) Vault
  - [(9)](./docs/ethernaut/King.md) King
  - [(10)](./docs/ethernaut/Reentrancy.md) Reentrancy
  - [(11)](./docs/ethernaut/Elevator.md) Elevator
  - [(12)](./docs/ethernaut/Privacy.md) Privacy
  - [(13)](./docs/ethernaut/GatekeeperOne.md) Gatekeeper One
  - [(14)](./docs/ethernaut/GatekeeperTwo.md) Gatekeeper Two
  - [(15)](./docs/ethernaut/NaughtCoin.md) Naught Coin
  - [(16)](./docs/ethernaut/Preservation.md) Preservation
  - [(17)](./docs/ethernaut/Recovery.md) Recovery
  - [(18)](./docs/ethernaut/MagicNumber.md) Magic Number
  - [(19)](./docs/ethernaut/AlienCodex.md) Alien Codex
  - [(20)](./docs/ethernaut/Denial.md) Denial
  - [(21)](./docs/ethernaut/Shop.md) Shop
  - [(22)](./docs/ethernaut/DexOne.md) Dex One
  - [(23)](./docs/ethernaut/DexTwo.md) Dex Two
  - [(24)](./docs/ethernaut/PuzzleWallet.md) Puzzle Wallet
  - [(25)](./docs/ethernaut/Motorbike.md) Motorbike
  - [(26)](./docs/ethernaut/DoubleEntryPoint.md) Double Entry Point
  - [(27)](./docs/ethernaut/GoodSamaritan.md) Good Samaritan
  - [(28)](./docs/ethernaut/GatekeeperThree.md) Gatekeeper Three
- [**QuillCTF**](https://quillctf.super.site/) | [My Writeups](https://dev.to/erhant/series/21352)
  - [(1)](./docs/quillctf/RoadClosed.md) Road Closed
  - [(2)](./docs/quillctf/VIPBank.md) VIP Bank
  - [(3)](./docs/quillctf/ConfidentialHash.md) Confidential Hash
  - [(4)](./docs/quillctf/SafeNFT.md) Safe NFT
  - [(5)](./docs/quillctf/D31eg4t3.md) D31eg4t3
  - [(6)](./docs/quillctf/CollatzPuzzle.md) _Collatz Puzzle_
  - [(7)](./docs/quillctf/TrueXOR.md) _True XOR_
  - [(8)](./docs/quillctf/Pelusa.md) Pelusa
- [**EVM Puzzles**](https://github.com/fvictorio/evm-puzzles/) | [My Writeups](https://dev.to/erhant/evm-puzzles-walkthrough-471a)
  - [(\*)](./docs/evmpuzzles/Puzzles.md) Puzzles
- [**More EVM Puzzles**](https://github.com/daltyboy11/more-evm-puzzles) | [My Writeups](https://dev.to/erhant/more-evm-puzzles-walkthrough-4lil)
  - [(\*)](./docs/moreevmpuzzles/MorePuzzles.md) More Puzzles

## Usage

Just `yarn` to install required packages (or `npm install`). Then, you can do any of the following:

- `yarn compile` to compile the contracts.
- `yarn test` to run all the challenges. You can pass in `--grep <regex>` option to run specific tests, such as:
  - `yarn test --grep Ethernaut` runs all Ethernaut tests.
  - `yarn test --grep "QuillCTF 1"` runs the 1st challenge of QuillCTF.
  - `yarn test --grep "Delegation"` runs the Delegation challenge of Ethernaut. If there are multiple challenges with the same name, all will run.
- `yarn lint` to lint TypeScript.
- `yarn node:start` to start a Hardhat node on `localhost`.
- `yarn node:run <path>` to run a script at the given path on `localhost`.

## Solving a new CTF

Put your tests under the `test` folder, put the contracts within `contracts` folder and put your write-ups under `docs` folder. I prefer having a separate folder for each CTF. You can also find some utility functions under `utils` folder, such as increasing the block-time, reading storage slots, or setting the balance of an account.

Each test has the following format:

```typescript
describe('<ctf name> <number>: <challenge name>', () => {
  // accounts
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  // contracts
  let contract: SomeContract; // types via typechain

  // constants
  const CONSTRUCTOR_ARG = '0xBEEF';

  // pre-hack setups
  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('SomeContract', owner).then(f => f.deploy(CONSTRUCTOR_ARG));
  });

  // the pawnage commences
  it('should hack the contract', async () => {});

  // post-hack checks
  after(async () => {
    expect(attacker.address).to.be.properAddress;
    expect(true).to.be.true;
  });
});
```

If your test requires directly changing the balance of an account, make sure you reset the balance after the tests.

### Generating Types from ABIs

If you do not have the Solidity code, but the ABI instead, you can still generate TypeChain types for them, as some challenges require them. I have a shorthand script `yarn typechain <contracts>` for this. I also have [`generate-types-json.sh`](./scripts/generate-types-json.sh) that will generate the necessary types for all challenges.

### Writing the Write-up

Write-ups are written as Markdown files under the [docs](./docs/) folder. They have the following sturcture:

```md
# CTF-Name: Number. Title

**Objective of the CTF**:

- Steal funds
- Hijack ownership
- ...

**Target Contract**:

\`\`\`solidity
...
\`\`\`

## The Attack / The Solution

Describe the vulnerability and define your attack.

## Proof of Concept

Present your attacker contract and the test code.
```

### Formatting & Linting

- TypeScript codes are formatted & linted with [GTS](https://github.com/google/gts).
- Contract types are generated via [TypeChain](https://github.com/dethcrypto/TypeChain).
- Contracts are formatted with [Solidity + Hardhat](https://hardhat.org/hardhat-vscode/docs/formatting).

```

```
