import { describe, expect, it } from "vitest";
import { assignUserToGroup } from "../src/group";

describe("group formation module (assignUserToGroup)", () => {
  const groupSize = 3;

  it("assigns user to earliest available FORMING group with space", () => {
    const existingGroups = [
      { groupId: "g-1", status: "FORMING" as const, memberCount: 1 },
      { groupId: "g-2", status: "FORMING" as const, memberCount: 0 },
    ];

    const result = assignUserToGroup({
      userId: "u-2",
      groupSize,
      existingGroups,
    });

    expect(result.targetGroupId).toBe("g-1");
    expect(result.shouldCreateNewGroup).toBe(false);
    expect(result.groupWillBecomeActive).toBe(false); // 1 + 1 = 2 < 3
  });

  it("marks groupWillBecomeActive = true when adding user fills the group to capacity", () => {
    const existingGroups = [
      { groupId: "g-1", status: "FORMING" as const, memberCount: 2 },
    ];

    const result = assignUserToGroup({
      userId: "u-3",
      groupSize,
      existingGroups,
    });

    expect(result.targetGroupId).toBe("g-1");
    expect(result.shouldCreateNewGroup).toBe(false);
    expect(result.groupWillBecomeActive).toBe(true); // 2 + 1 = 3 >= 3
  });

  it("creates a new group if existing groups are full or already ACTIVE", () => {
    const existingGroups = [
      { groupId: "g-1", status: "ACTIVE" as const, memberCount: 3 },
      { groupId: "g-0", status: "COMPLETED" as const, memberCount: 3 },
    ];

    const result = assignUserToGroup({
      userId: "u-4",
      groupSize,
      existingGroups,
    });

    expect(result.targetGroupId).toBeNull();
    expect(result.shouldCreateNewGroup).toBe(true);
    expect(result.groupWillBecomeActive).toBe(false); // New group has 1 member, capacity is 3
  });

  it("creates a new group if existing list is empty", () => {
    const result = assignUserToGroup({
      userId: "u-1",
      groupSize,
      existingGroups: [],
    });

    expect(result.targetGroupId).toBeNull();
    expect(result.shouldCreateNewGroup).toBe(true);
    expect(result.groupWillBecomeActive).toBe(false);
  });

  it("activates immediately if groupSize is 1 for a new group", () => {
    const result = assignUserToGroup({
      userId: "u-solo",
      groupSize: 1,
      existingGroups: [],
    });

    expect(result.targetGroupId).toBeNull();
    expect(result.shouldCreateNewGroup).toBe(true);
    expect(result.groupWillBecomeActive).toBe(true);
  });

  it("throws if groupSize <= 0", () => {
    expect(() =>
      assignUserToGroup({
        userId: "u-1",
        groupSize: 0,
        existingGroups: [],
      })
    ).toThrow();
  });
});
