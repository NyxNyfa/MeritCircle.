import { GroupStatus } from "./types";

/**
 * Assigns a user to a circle group using deterministic matching rules.
 *
 * Rules:
 * 1. Find the earliest FORMING group with an available slot (memberCount < groupSize).
 * 2. If a forming group with space exists, assign the user to it.
 * 3. If no forming group has space, trigger creation of a new group.
 * 4. When adding this user causes the group to reach capacity (memberCount + 1 >= groupSize),
 *    groupWillBecomeActive is true.
 *
 * @param params Object containing userId, pool groupSize, and current list of existing groups
 * @returns Assignment decision with targetGroupId, shouldCreateNewGroup, and groupWillBecomeActive flags
 */
export function assignUserToGroup(params: {
  userId: string;
  groupSize: number;
  existingGroups: Array<{
    groupId: string;
    status: GroupStatus;
    memberCount: number;
  }>;
}): {
  targetGroupId: string | null;
  shouldCreateNewGroup: boolean;
  groupWillBecomeActive: boolean;
} {
  const { groupSize, existingGroups } = params;

  if (groupSize <= 0) {
    throw new Error("Group size must be greater than zero");
  }

  const availableGroup = existingGroups.find(
    (group) => group.status === "FORMING" && group.memberCount < groupSize
  );

  if (availableGroup) {
    const newCount = availableGroup.memberCount + 1;
    return {
      targetGroupId: availableGroup.groupId,
      shouldCreateNewGroup: false,
      groupWillBecomeActive: newCount >= groupSize,
    };
  }

  return {
    targetGroupId: null,
    shouldCreateNewGroup: true,
    groupWillBecomeActive: groupSize <= 1,
  };
}
