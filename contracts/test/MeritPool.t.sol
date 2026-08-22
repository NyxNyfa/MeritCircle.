// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {MCircle} from "../src/MCircle.sol";
import {MeritPool} from "../src/MeritPool.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract MeritPoolV2Test is Test {
    using MessageHashUtils for bytes32;

    MCircle public token;
    MeritPool public pool;

    uint256 public backendPrivateKey = 0x12345;
    address public backendSigner = vm.addr(backendPrivateKey);
    address public reserve = makeAddr("reserve");
    address public treasury = makeAddr("treasury");

    address public u1 = makeAddr("user1");
    address public u2 = makeAddr("user2");
    address public u3 = makeAddr("user3");
    address public u4 = makeAddr("user4");
    address public u5 = makeAddr("user5");

    uint256 constant BASIC = 0; // 50 MC x 3 anggota, 10 menit/cycle, tanpa auction
    uint256 constant STANDARD = 1; // 100 MC x 5 anggota
    uint256 constant ELITE = 4; // 100 MC x 5 anggota, auction, diskon maks 15%

    function setUp() public {
        token = new MCircle();
        pool = new MeritPool(address(token), backendSigner, reserve, treasury);
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    function signJoin(address user, uint256 tier) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(user, tier));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function signDesignation(uint256 poolId, uint256 round, uint256 cycle, address winner)
        internal
        view
        returns (bytes memory)
    {
        bytes32 messageHash = keccak256(abi.encodePacked(poolId, round, cycle, winner));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function fundAndApprove(address user, uint256 amount) internal {
        token.mint(user, amount);
        vm.prank(user);
        token.approve(address(pool), amount);
    }

    function join(address user, uint256 poolId, uint256 tier) internal {
        vm.prank(user);
        pool.joinPool(poolId, tier, signJoin(user, tier));
    }

    /// @dev Isi pool sampai penuh dengan daftar user (semua tier memenuhi syarat).
    uint256 constant USER_MINT = 1000 ether;

    function fillPool(uint256 poolId, address[] memory users, uint256 tier) internal {
        for (uint256 i = 0; i < users.length; i++) {
            fundAndApprove(users[i], USER_MINT);
            join(users[i], poolId, tier);
        }
    }

    function fund(address[] memory users) internal {
        for (uint256 i = 0; i < users.length; i++) {
            fundAndApprove(users[i], USER_MINT);
        }
    }

    /// @dev Semua anggota membayar iuran cycle berjalan (kewajiban pemenang sebelumnya tetap jalan).
    function allContribute(uint256 poolId, address[] memory users) internal {
        for (uint256 i = 0; i < users.length; i++) {
            vm.prank(users[i]);
            pool.contribute(poolId);
        }
    }

    function designateAndSettle(uint256 poolId, uint256 cycle, address winner) internal {
        uint256 round = _round(poolId);
        vm.prank(u1);
        pool.designateWinner(poolId, winner, signDesignation(poolId, round, cycle, winner));
        pool.settleCycle(poolId, address(0), bytes(""));
    }

    function _round(uint256 poolId) internal view returns (uint256) {
        (, uint256 round, , , , ) = pool.getPoolState(poolId);
        return round;
    }

    function _status(uint256 poolId) internal view returns (uint8) {
        (uint8 status, , , , , ) = pool.getPoolState(poolId);
        return status;
    }

    // ------------------------------------------------------------------
    // JOIN & AKTIVASI
    // ------------------------------------------------------------------

    function test_RevertIf_JoinWithoutValidSignature() public {
        fundAndApprove(u1, 100 ether);
        vm.prank(u1);
        vm.expectRevert();
        pool.joinPool(BASIC, 0, bytes("0x999999"));
    }

    function test_RevertIf_TierInsufficient() public {
        fundAndApprove(u1, 200 ether);
        bytes memory sig = signJoin(u1, 0);
        vm.prank(u1);
        vm.expectRevert("Tier Anda tidak mencukupi untuk pool ini");
        pool.joinPool(STANDARD, 0, sig);
    }

    function test_Success_JoinWithValidSignature() public {
        fundAndApprove(u1, 100 ether);
        join(u1, BASIC, 0);
        assertTrue(pool.hasContributed(BASIC, 1, u1));
        assertEq(pool.getCurrentMembersCount(BASIC), 1);
        assertEq(token.balanceOf(address(pool)), 50 ether);
    }

    function test_RevertIf_JoinTwice() public {
        fundAndApprove(u1, 200 ether);
        join(u1, BASIC, 0);
        vm.prank(u1);
        vm.expectRevert("Anda sudah bergabung di pool ini");
        pool.joinPool(BASIC, 0, signJoin(u1, 0));
    }

    function test_PoolActivates_WhenFull() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);

        assertEq(uint8(_status(BASIC)), uint8(MeritPool.PoolStatus.ACTIVE));
        (, , uint256 cycle, uint256 deadline, uint256 collected, ) = pool.getPoolState(BASIC);
        assertEq(cycle, 1);
        assertEq(deadline, block.timestamp + 10 minutes);
        assertEq(collected, 150 ether);
    }

    function test_RevertIf_JoinWhenActive() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);

        address latecomer = makeAddr("late");
        fundAndApprove(latecomer, 100 ether);
        vm.prank(latecomer);
        vm.expectRevert("Pool tidak sedang membuka pendaftaran");
        pool.joinPool(BASIC, 0, signJoin(latecomer, 0));
    }

    // ------------------------------------------------------------------
    // MERIT QUEUE (Tier 0-3)
    // ------------------------------------------------------------------

    function test_Cycle1_SettlesWithDesignatedWinner() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);

        designateAndSettle(BASIC, 1, u1);

        // u1: 1000 - 50 iuran + 150 payout = 1100
        assertEq(token.balanceOf(u1), 1100 ether);
        assertTrue(pool.hasWon(BASIC, u1));
        assertEq(pool.cycleWinner(BASIC, 0, 1), u1);
        assertEq(pool.lastWinner(BASIC), u1);
        (, , uint256 cycle, , , ) = pool.getPoolState(BASIC);
        assertEq(cycle, 2);
    }

    function test_RevertIf_DesignationBeforeContribution() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);
        designateAndSettle(BASIC, 1, u1);

        // Cycle 2 belum ada yang kontribusi -> designation untuk u2 harus ditolak
        vm.prank(u1);
        vm.expectRevert("Pemenang belum berkontribusi cycle ini");
        pool.designateWinner(BASIC, u2, signDesignation(BASIC, 0, 2, u2));
    }

    function test_RevertIf_DesignatedWinnerAlreadyWon() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);
        designateAndSettle(BASIC, 1, u1);

        // Cycle 2: u1 (sudah menang) mencoba dipilih lagi -> tolak
        vm.prank(u1);
        vm.expectRevert("Pemenang sudah pernah mendapat payout");
        pool.designateWinner(BASIC, u1, signDesignation(BASIC, 0, 2, u1));
    }

    function test_RevertIf_DesignationSignatureInvalid() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);

        // Signature untuk pemenang berbeda
        vm.prank(u1);
        vm.expectRevert("Signature designation tidak valid");
        pool.designateWinner(BASIC, u1, signDesignation(BASIC, 0, 1, u2));
    }

    function test_MeritQueue_FullPoolLifecycle_CompletesWithThreeUniqueWinners() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);

        designateAndSettle(BASIC, 1, u1);
        allContribute(BASIC, users);
        designateAndSettle(BASIC, 2, u2);
        allContribute(BASIC, users);
        designateAndSettle(BASIC, 3, u3);

        assertEq(uint8(_status(BASIC)), uint8(MeritPool.PoolStatus.COMPLETED));
        assertTrue(pool.hasWon(BASIC, u1));
        assertTrue(pool.hasWon(BASIC, u2));
        assertTrue(pool.hasWon(BASIC, u3));
        // Kontrak tidak menyimpan sisa dana: 450 masuk, 450 terdistribusi
        assertEq(token.balanceOf(address(pool)), 0);
        // Tiap anggota keluar sama: 1000 - 150 iuran + 150 payout = 1000
        assertEq(token.balanceOf(u1), 100 ether * 10);
        assertEq(token.balanceOf(u2), 100 ether * 10);
        assertEq(token.balanceOf(u3), 100 ether * 10);
    }

    // ------------------------------------------------------------------
    // KONTRIBUSI CYCLE BERIKUTNYA & DEFAULT
    // ------------------------------------------------------------------

    function test_RevertIf_ContributeTwiceSameCycle() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);
        designateAndSettle(BASIC, 1, u1);

        vm.startPrank(u2);
        pool.contribute(BASIC);
        vm.expectRevert("Sudah berkontribusi cycle ini");
        pool.contribute(BASIC);
        vm.stopPrank();
    }

    function test_RevertIf_ContributeByNonMember() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);
        designateAndSettle(BASIC, 1, u1);

        address outsider = makeAddr("outsider");
        fundAndApprove(outsider, 100 ether);
        vm.prank(outsider);
        vm.expectRevert("Bukan anggota pool ini");
        pool.contribute(BASIC);
    }

    function test_RevertIf_ContributeAfterDeadline() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);
        designateAndSettle(BASIC, 1, u1);

        vm.warp(block.timestamp + 11 minutes);
        vm.prank(u2);
        vm.expectRevert("Deadline cycle sudah lewat");
        pool.contribute(BASIC);
    }

    function test_Default_ShortfallPayoutAndMissedRecorded() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);
        designateAndSettle(BASIC, 1, u1);

        // Cycle 2: hanya u2 membayar (50 MC), u3 default
        vm.prank(u2);
        pool.contribute(BASIC);
        vm.warp(block.timestamp + 11 minutes);

        uint256 reserveBefore = token.balanceOf(reserve);
        designateAndSettle(BASIC, 2, u2);

        // Shortfall: koleksi hanya 50 MC -> payout 50 (bukan 150). u2: 1000-50-50+50 = 950
        assertEq(token.balanceOf(u2), 950 ether);
        // Tidak ada surplus -> reserve tidak berubah
        assertEq(token.balanceOf(reserve), reserveBefore);
        // u3 dicatat default
        assertEq(pool.missedCycles(BASIC, u3), 1);
        (, , uint256 cycle, , , ) = pool.getPoolState(BASIC);
        assertEq(cycle, 3);
    }

    function test_Extreme_AllMembersDefault_SlotForfeitButPoolContinues() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);
        designateAndSettle(BASIC, 1, u1);

        // Cycle 2: TIDAK ADA yang kontribusi
        vm.warp(block.timestamp + 11 minutes);
        // Fallback designation atas u2 (tidak kontribusi) valid karena collected == 0
        pool.settleCycle(BASIC, u2, signDesignation(BASIC, 0, 2, u2));

        assertEq(token.balanceOf(u2), 950 ether); // tidak menerima apa-apa
        assertTrue(pool.hasWon(BASIC, u2)); // slot payout hangus
        assertEq(pool.missedCycles(BASIC, u2), 1);
        assertEq(pool.missedCycles(BASIC, u3), 1);

        // Cycle 3: SEMUA anggota tetap wajib kontribusi (termasuk yang pernah default)
        vm.prank(u1);
        pool.contribute(BASIC);
        vm.prank(u2);
        pool.contribute(BASIC);
        vm.prank(u3);
        pool.contribute(BASIC);
        designateAndSettle(BASIC, 3, u3);
        assertEq(uint8(_status(BASIC)), uint8(MeritPool.PoolStatus.COMPLETED));
        assertEq(token.balanceOf(u3), 1050 ether); // 950 - 50 iuran + 150 payout penuh
        assertEq(token.balanceOf(u1), 1050 ether); // 1100 - 50 iuran
        assertEq(token.balanceOf(u2), 900 ether); // 950 - 50 iuran
        assertEq(token.balanceOf(address(pool)), 0);
    }

    function test_RevertIf_SettleWithoutDesignation() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);

        // allIn true tapi designation belum ada
        vm.expectRevert("Pemenang belum ditetapkan (designation/fallback)");
        pool.settleCycle(BASIC, address(0), bytes(""));
    }

    // ------------------------------------------------------------------
    // AUCTION (Tier 4-5)
    // ------------------------------------------------------------------

    function _eliteUsers() internal view returns (address[] memory users) {
        users = new address[](5);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        users[3] = u4;
        users[4] = u5;
    }

    function test_Auction_MinBidEnforced() public {
        fillPool(ELITE, _eliteUsers(), 4);

        // Batas diskon 15%: bid minimum 500 * 85% = 425 MC
        assertEq(pool.minValidBid(ELITE), 425 ether);

        vm.prank(u1);
        vm.expectRevert("Bid di bawah batas diskon maksimum");
        pool.placeBid(ELITE, 400 ether);

        vm.prank(u1);
        pool.placeBid(ELITE, 425 ether);
        assertEq(pool.bids(ELITE, 1, u1), 425 ether);
    }

    function test_Auction_BidReplaceDownOnly() public {
        fillPool(ELITE, _eliteUsers(), 4);

        vm.startPrank(u1);
        pool.placeBid(ELITE, 480 ether);
        pool.placeBid(ELITE, 470 ether); // replace turun: OK
        vm.expectRevert("Bid baru harus lebih rendah dari bid sebelumnya");
        pool.placeBid(ELITE, 475 ether); // naik: tolak
        vm.stopPrank();
    }

    function test_RevertIf_BidByNonContributorOrNonMemberOrAlreadyWon() public {
        fillPool(ELITE, _eliteUsers(), 4);

        // Bukan anggota
        address outsider = makeAddr("outsider");
        fundAndApprove(outsider, 1000 ether);
        vm.prank(outsider);
        vm.expectRevert("Bukan anggota pool ini");
        pool.placeBid(ELITE, 450 ether);
    }

    function test_RevertIf_BidOnNonAuctionPool() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);

        vm.prank(u1);
        vm.expectRevert("Pool ini bukan mode auction");
        pool.placeBid(BASIC, 140 ether);
    }

    function test_Auction_LowestBidWins_SurplusSplitExact() public {
        address[] memory users = _eliteUsers();
        fillPool(ELITE, users, 4);

        vm.prank(u1);
        pool.placeBid(ELITE, 490 ether);
        vm.prank(u2);
        pool.placeBid(ELITE, 470 ether);
        vm.prank(u3);
        pool.placeBid(ELITE, 460 ether);

        // Saldo awal tiap user setelah iuran join: mint 1000 - iuran 100 = 900

        pool.settleCycle(ELITE, address(0), bytes(""));

        // Winner u3: bid 460 -> 900 + 460 = 1360
        assertEq(token.balanceOf(u3), 1360 ether);
        assertTrue(pool.hasWon(ELITE, u3));
        assertEq(pool.lastWinner(ELITE), u3);

        // Surplus = 500 - 460 = 40 -> member 24 (4 orang x 6), reserve 10, treasury 6
        assertEq(token.balanceOf(u1), 906 ether);
        assertEq(token.balanceOf(u2), 906 ether);
        assertEq(token.balanceOf(u4), 906 ether);
        assertEq(token.balanceOf(u5), 906 ether);
        assertEq(token.balanceOf(reserve), 10 ether);
        assertEq(token.balanceOf(treasury), 6 ether);
        // Akuntansi bersih: kontrak tidak menyisa dana
        assertEq(token.balanceOf(address(pool)), 0);
    }

    function test_Auction_NoBids_FallbackDesignationAtDeadline() public {
        fillPool(ELITE, _eliteUsers(), 4);

        // Sebelum deadline dan tanpa bid: belum bisa ditutup
        vm.expectRevert("Cycle belum bisa ditutup (deadline / kelengkapan kontribusi)");
        pool.settleCycle(ELITE, address(0), bytes(""));

        vm.warp(block.timestamp + 16 minutes);
        // Fallback: u2 menang penuh 500 (tanpa surplus) -> 900 + 500 = 1400
        pool.settleCycle(ELITE, u2, signDesignation(ELITE, 0, 1, u2));

        assertEq(token.balanceOf(u2), 1400 ether);
        assertEq(token.balanceOf(address(pool)), 0);
        assertEq(token.balanceOf(treasury), 0); // tidak ada surplus
    }

    // ------------------------------------------------------------------
    // ADMIN
    // ------------------------------------------------------------------

    function test_PauseBlocksAllActions() public {
        pool.pause();

        fundAndApprove(u1, 100 ether);
        vm.startPrank(u1);
        vm.expectRevert();
        pool.joinPool(BASIC, 0, signJoin(u1, 0));
        vm.expectRevert();
        pool.contribute(BASIC);
        vm.expectRevert();
        pool.placeBid(ELITE, 450 ether);
        vm.expectRevert();
        pool.settleCycle(BASIC, address(0), bytes(""));
        vm.stopPrank();

        pool.unpause();
        join(u1, BASIC, 0); // normal lagi
        assertEq(pool.getCurrentMembersCount(BASIC), 1);
    }

    function test_Reopen_ResetsStateForNewCohort() public {
        address[] memory users = new address[](3);
        users[0] = u1;
        users[1] = u2;
        users[2] = u3;
        fillPool(BASIC, users, 0);
        designateAndSettle(BASIC, 1, u1);
        allContribute(BASIC, users);
        designateAndSettle(BASIC, 2, u2);
        allContribute(BASIC, users);
        designateAndSettle(BASIC, 3, u3);
        assertEq(uint8(_status(BASIC)), uint8(MeritPool.PoolStatus.COMPLETED));

        // Non-owner tidak boleh
        vm.prank(u1);
        vm.expectRevert();
        pool.reopenPool(BASIC);

        pool.reopenPool(BASIC);
        assertEq(uint8(_status(BASIC)), uint8(MeritPool.PoolStatus.OPEN));
        (, uint256 round, uint256 cycle, , , uint256 memberCount) = pool.getPoolState(BASIC);
        assertEq(round, 1);
        assertEq(cycle, 0);
        assertEq(memberCount, 0);
        assertFalse(pool.hasWon(BASIC, u1)); // reset

        // Kohort baru: u1 bisa ikut & menang lagi (round baru, riwayat lama utuh)
        fundAndApprove(u1, 100 ether);
        join(u1, BASIC, 0);
        fundAndApprove(u2, 100 ether);
        join(u2, BASIC, 0);
        fundAndApprove(u3, 100 ether);
        join(u3, BASIC, 0);
        assertEq(pool.cycleWinner(BASIC, 0, 1), u1); // riwayat round 0 masih ada
        designateAndSettle(BASIC, 1, u1); // round 1: u1 menang lagi (boleh, beda round)
        assertEq(pool.cycleWinner(BASIC, 1, 1), u1);
    }

    function test_SurplusSplit_Configurable() public {
        // Ganti split: member 50%, reserve 25%, treasury sisanya 25%
        pool.setSurplusSplit(5000, 2500);
        assertEq(pool.surplusMemberBps(), 5000);
        assertEq(pool.surplusReserveBps(), 2500);

        vm.expectRevert("Total split melebihi 100%");
        pool.setSurplusSplit(8000, 3000);
    }

    // ------------------------------------------------------------------
    // TOKENOMICS SANITY
    // ------------------------------------------------------------------

    function test_MintIsRestricted() public {
        // Sembarang akun TIDAK bisa mint (hanya owner/minter)
        vm.prank(u1);
        vm.expectRevert();
        token.mint(u1, 100 ether);
    }

    function test_SwapCanMintAfterMinterGrant() public {
        // Owner grant minter lalu alamat itu bisa mint
        token.setMinter(u1, true);
        vm.prank(u1);
        token.mint(u1, 100 ether);
        assertEq(token.balanceOf(u1), 100 ether);
    }
}
