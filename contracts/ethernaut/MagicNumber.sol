// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface MagicInterface {
  function whatIsTheMeaningOfLife() external pure returns (uint256);
}

contract MagicNum {
  address public solver;

  constructor() {}

  function setSolver(address _solver) public {
    solver = _solver;
  }

  /*
    ____________/\\\_______/\\\\\\\\\_____        
     __________/\\\\\_____/\\\///////\\\___       
      ________/\\\/\\\____\///______\//\\\__      
       ______/\\\/\/\\\______________/\\\/___     
        ____/\\\/__\/\\\___________/\\\//_____    
         __/\\\\\\\\\\\\\\\\_____/\\\//________   
          _\///////////\\\//____/\\\/___________  
           ___________\/\\\_____/\\\\\\\\\\\\\\\_ 
            ___________\///_____\///////////////__
  */

  // i added this myself to make checking a bit easier :)
  function check() external view returns (bool) {
    require(42 == MagicInterface(solver).whatIsTheMeaningOfLife());
    return true;
  }
}
