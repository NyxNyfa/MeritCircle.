import { describe, expect, it } from "vitest";
import { canJoinPool } from "../src/eligibility";
import { PoolSnapshot, UserProfileSnapshot } from "../src/types";

describe("eligibility module (canJoinPool)", () => {
  const validPool: PoolSnapshot = {
    mode: "BASIC",
    minimumTier: 2,
    groupSize: 5,
    contributionAmountWei: 100000000000000000n, // 0.1 tBNB
    status: "ACTIVE",
  };

  const validUser: UserProfileSnapshot = {
    hasUsername: true,
    emailVerified: true,
    reputationPoint: 250, // Tier 2 Citizen (max active groups = 2)
    activeGroupCount: 0,
  };

  it("allows valid user with meeting tier and verified profile to join active pool", () => {
    const result = canJoinPool({ user: validUser, pool: validPool });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("rejects when pool is not active", () => {
    const inactivePool: PoolSnapshot = { ...validPool, status: "INACTIVE" };
    const result = canJoinPool({ user: validUser, pool: inactivePool });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/active/i);
  });

  it("rejects when user has no username", () => {
    const userWithoutUsername: UserProfileSnapshot = {
      ...validUser,
      hasUsername: false,
    };
    const result = canJoinPool({ user: userWithoutUsername, pool: validPool });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/username/i);
  });

  it("rejects when user email is not verified", () => {
    const userUnverified: UserProfileSnapshot = {
      ...validUser,
      emailVerified: false,
    };
    const result = canJoinPool({ user: userUnverified, pool: validPool });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/email/i);
  });

  it("rejects when user reputation tier is below pool minimumTier", () => {
    // Tier 1 Newcomer (points: 50) trying to join Tier 2 pool
    const lowTierUser: UserProfileSnapshot = {
      ...validUser,
      reputationPoint: 50,
    };
    const result = canJoinPool({ user: lowTierUser, pool: validPool });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/tier/i);
  });

  it("rejects when user has reached or exceeded max active groups for their tier", () => {
    // Tier 2 Citizen has maxActiveGroups = 2
    const maxedUser: UserProfileSnapshot = {
      ...validUser,
      reputationPoint: 250,
      activeGroupCount: 2,
    };
    const result = canJoinPool({ user: maxedUser, pool: validPool });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/maximum allowed active groups/i);

    // activeGroupCount > limit
    const exceededUser: UserProfileSnapshot = {
      ...validUser,
      reputationPoint: 250,
      activeGroupCount: 3,
    };
    expect(canJoinPool({ user: exceededUser, pool: validPool }).allowed).toBe(
      false
    );
  });

  it("allows higher tier user to join lower tier requirement pool if limits permit", () => {
    // Tier 4 Trusted user (points: 750, maxActiveGroups: 4) joining Tier 2 pool
    const highTierUser: UserProfileSnapshot = {
      ...validUser,
      reputationPoint: 750,
      activeGroupCount: 3,
    };
    const result = canJoinPool({ user: highTierUser, pool: validPool });
    expect(result.allowed).toBe(true);
  });
});
