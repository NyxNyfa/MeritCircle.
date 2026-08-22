// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {MCircle} from "../src/MCircle.sol";
import {MeritPool} from "../src/MeritPool.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract MeritPoolTest is Test {
    using MessageHashUtils for bytes32;

    MCircle public token;
    MeritPool public pool;

    uint256 backendPrivateKey = 0x12345;
    address backendSigner = vm.addr(backendPrivateKey);

    address user1 = address(0x111);
    address user2 = address(0x222);
    address user3 = address(0x333);

    function setUp() public {
        token = new MCircle();
        pool = new MeritPool(address(token), backendSigner);
    }

    function signJoin(address user, uint256 tier) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(user, tier));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function fundAndApprove(address user, uint256 amount) internal {
        token.mint(user, amount);
        vm.prank(user);
        token.approve(address(pool), amount);
    }

    function test_RevertIf_JoinWithoutValidSignature() public {
        fundAndApprove(user1, 100 ether);
        vm.prank(user1);
        vm.expectRevert();
        pool.joinPool(0, 0, bytes("0x999999"));
    }

    function test_RevertIf_TierInsufficient() public {
        fundAndApprove(user1, 100 ether);
        bytes memory sig = signJoin(user1, 0);
        vm.prank(user1);
        vm.expectRevert("Tier Anda tidak mencukupi untuk pool ini");
        pool.joinPool(1, 0, sig);
    }

    function test_Success_JoinWithValidSignature() public {
        fundAndApprove(user1, 100 ether);
        bytes memory sig = signJoin(user1, 1);
        vm.prank(user1);
        pool.joinPool(1, 1, sig);

        assertTrue(pool.hasJoined(1, pool.currentCycle(1), user1));
        assertEq(pool.getCurrentMembersCount(1), 1);
    }

    function test_CycleCompletes_WhenPoolFull() public {
        // Basic Pool (pool 0): 3 anggota, iuran 50 MC, hadiah 150 MC
        address[3] memory members = [user1, user2, user3];
        for (uint256 i = 0; i < members.length; i++) {
            fundAndApprove(members[i], 100 ether);
            bytes memory sig = signJoin(members[i], 0);
            vm.prank(members[i]);
            pool.joinPool(0, 0, sig);
        }

        // Pool penuh -> cycle selesai: lastWinner terisi, currentCycle naik, pemenang dapat hadiah
        assertFalse(pool.lastWinner(0) == address(0));
        assertEq(pool.currentCycle(0), 1);
        // Sisa 50 MC (iuran 100 - kontribusi 50) + hadiah 150 MC
        assertEq(token.balanceOf(pool.lastWinner(0)), 200 ether);
    }
}
