// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBoolGiver {
  function giveBool() external view returns (bool);
}

contract TrueXOR {
  function ctf(address target) external view returns (bool) {
    bool p = IBoolGiver(target).giveBool();
    bool q = IBoolGiver(target).giveBool();
    require((p && q) != (p || q), "bad bools");
    require(msg.sender == tx.origin, "bad sender");
    return true;
  }
}

contract TrueXORAttacker is IBoolGiver {
  uint t = 28543000;

  function giveBool() external view override returns (bool) {
    uint g = gasleft();
    return g < t;
  }

  function changeThreshold(uint _t) external {
    t = _t;
  }
}

contract TrueXORAttacker2 is IBoolGiver {
  uint256 slot0 = 12345;

  function giveBool() external view override returns (bool) {
    uint gas = gasleft();
    uint tmp = slot0;
    tmp; // silence warning
    return (gas - gasleft()) >= 2000;
  }
}
