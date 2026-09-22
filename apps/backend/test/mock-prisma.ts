export interface MockDbState {
  users: Map<string, any>;
  profiles: Map<string, any>;
  reputations: Map<string, any>;
  reputationEvents: any[];
  emailVerifications: any[];
  pools: Map<string, any>;
  groups: Map<string, any>;
  groupMembers: Map<string, any>;
  cycles: Map<string, any>;
  contributions: Map<string, any>;
  contractTransactions: Map<string, any>;
  auctions: Map<string, any>;
  bids: Map<string, any>;
  payouts: Map<string, any>;
  cycleRewardLedgers: Map<string, any>;
  auditLogs: any[];
}

export const dbState: MockDbState = {
  users: new Map(),
  profiles: new Map(),
  reputations: new Map(),
  reputationEvents: [],
  emailVerifications: [],
  pools: new Map(),
  groups: new Map(),
  groupMembers: new Map(),
  cycles: new Map(),
  contributions: new Map(),
  contractTransactions: new Map(),
  auctions: new Map(),
  bids: new Map(),
  payouts: new Map(),
  cycleRewardLedgers: new Map(),
  auditLogs: [],
};

export function seedDefaultPools(): void {
  const defaultPools = [
    {
      id: "pool_starter_1",
      externalPoolId: "START-1",
      name: "Starter Circle (Newcomer)",
      description: "Kelompok arisan perdana untuk Newcomer (3 anggota) tanpa syarat minimal poin reputasi.",
      mode: "BASIC",
      minimumTier: 1,
      groupSize: 3,
      cycleCount: 3,
      cycleDurationDays: 30,
      paymentWindowDays: 10,
      auctionOpenDay: null,
      auctionCloseDay: null,
      settlementDay: 30,
      contributionAmountWei: "800000000000000",
      maxDiscountBps: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "pool_basic_1",
      externalPoolId: "CIT-1",
      name: "Citizen Circle A",
      description: "Basic circle for Tier 2 Citizens",
      mode: "BASIC",
      minimumTier: 2,
      groupSize: 3,
      cycleCount: 3,
      cycleDurationDays: 30,
      paymentWindowDays: 10,
      auctionOpenDay: null,
      auctionCloseDay: null,
      settlementDay: 30,
      contributionAmountWei: "1000000000000000",
      maxDiscountBps: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "pool_auction_1",
      externalPoolId: "TRUST-1",
      name: "Trusted Auction Pool",
      description: "Auction circle for Tier 4 Trusted members",
      mode: "AUCTION",
      minimumTier: 4,
      groupSize: 3,
      cycleCount: 3,
      cycleDurationDays: 30,
      paymentWindowDays: 10,
      auctionOpenDay: 11,
      auctionCloseDay: 25,
      settlementDay: 30,
      contributionAmountWei: "5000000000000000",
      maxDiscountBps: 2000,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const p of defaultPools) {
    dbState.pools.set(p.id, { ...p });
  }
}

export function resetMockDb(): void {
  dbState.users.clear();
  dbState.profiles.clear();
  dbState.reputations.clear();
  dbState.reputationEvents.length = 0;
  dbState.emailVerifications.length = 0;
  dbState.pools.clear();
  dbState.groups.clear();
  dbState.groupMembers.clear();
  dbState.cycles.clear();
  dbState.contributions.clear();
  dbState.contractTransactions.clear();
  dbState.auctions.clear();
  dbState.bids.clear();
  dbState.payouts.clear();
  dbState.cycleRewardLedgers.clear();
  dbState.auditLogs.length = 0;

  seedDefaultPools();
}

// Initial seed
seedDefaultPools();

let idCounter = 1;
function genId(prefix: string) {
  return `${prefix}_${idCounter++}`;
}

export const mockPrisma = {
  user: {
    findUnique: async ({ where, include }: any) => {
      let found: any = null;
      if (where.id) {
        found = dbState.users.get(where.id);
      } else if (where.walletAddress) {
        for (const u of dbState.users.values()) {
          if (u.walletAddress.toLowerCase() === where.walletAddress.toLowerCase()) {
            found = u;
            break;
          }
        }
      }
      if (!found) return null;

      const res: any = { ...found };
      if (include?.profile) {
        res.profile = dbState.profiles.get(found.id) || null;
      }
      if (include?.reputation) {
        res.reputation = dbState.reputations.get(found.id) || null;
      }
      if (include?.groupMembers) {
        const members = Array.from(dbState.groupMembers.values()).filter(
          (m) => m.userId === found.id
        );
        res.groupMembers = members.map((m) => {
          const mItem: any = { ...m };
          if (include.groupMembers.include?.group) {
            const grp = dbState.groups.get(m.groupId);
            if (grp) {
              const grpItem: any = { ...grp };
              if (include.groupMembers.include.group.include?.pool) {
                grpItem.pool = dbState.pools.get(grp.poolId) || null;
              }
              mItem.group = grpItem;
            }
          }
          return mItem;
        });
      } else {
        res.groupMembers = [];
      }
      if (include?.reputationEvents) {
        res.reputationEvents = dbState.reputationEvents.filter(
          (e) => e.userId === found.id
        );
      } else {
        res.reputationEvents = [];
      }
      return res;
    },
    count: async () => dbState.users.size,
    findMany: async ({ where, include, orderBy }: any = {}) => {
      let list = Array.from(dbState.users.values());
      if (where?.status) list = list.filter((u) => u.status === where.status);
      if (orderBy?.createdAt === "desc") {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return list.map((u) => {
        const item: any = { ...u };
        if (include?.profile) {
          item.profile = dbState.profiles.get(u.id) || null;
        }
        if (include?.reputation) {
          item.reputation = dbState.reputations.get(u.id) || null;
        }
        if (include?.groupMembers) {
          let members = Array.from(dbState.groupMembers.values()).filter((m) => m.userId === u.id);
          if (include.groupMembers.where?.group?.status?.in) {
            const allowed = include.groupMembers.where.group.status.in;
            members = members.filter((m) => {
              const grp = dbState.groups.get(m.groupId);
              return grp && allowed.includes(grp.status);
            });
          }
          item.groupMembers = members;
        }
        return item;
      });
    },
    create: async ({ data, include }: any) => {
      const id = genId("user");
      const user = {
        id,
        walletAddress: data.walletAddress.toLowerCase(),
        role: data.role || "USER",
        status: data.status || "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbState.users.set(id, user);

      if (data.profile?.create) {
        const profile = {
          id: genId("profile"),
          userId: id,
          username: data.profile.create.username ?? null,
          email: data.profile.create.email ?? null,
          emailVerifiedAt: data.profile.create.emailVerifiedAt ?? null,
          avatarUrl: data.profile.create.avatarUrl ?? null,
          xUrl: data.profile.create.xUrl ?? null,
          telegramUrl: data.profile.create.telegramUrl ?? null,
          discordHandle: data.profile.create.discordHandle ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbState.profiles.set(id, profile);
      }

      if (data.reputation?.create) {
        const reputation = {
          id: genId("rep"),
          userId: id,
          points: data.reputation.create.points ?? 0,
          tier: data.reputation.create.tier ?? 1,
          updatedAt: new Date(),
        };
        dbState.reputations.set(id, reputation);
      }

      const res: any = { ...user };
      if (include?.profile) {
        res.profile = dbState.profiles.get(id) || null;
      }
      if (include?.reputation) {
        res.reputation = dbState.reputations.get(id) || null;
      }
      return res;
    },
  },
  profile: {
    findUnique: async ({ where }: any) => {
      if (where.userId) {
        return dbState.profiles.get(where.userId) || null;
      }
      return null;
    },
    findFirst: async ({ where }: any) => {
      for (const p of dbState.profiles.values()) {
        if (where.NOT?.userId && p.userId === where.NOT.userId) {
          continue;
        }
        if (where.username && p.username && p.username.toLowerCase() === where.username.toLowerCase()) {
          return { ...p };
        }
        if (where.email && p.email && p.email.toLowerCase() === where.email.toLowerCase()) {
          return { ...p };
        }
      }
      return null;
    },
    create: async ({ data }: any) => {
      const id = genId("profile");
      const profile = {
        id,
        userId: data.userId,
        username: data.username || null,
        email: data.email || null,
        emailVerifiedAt: data.emailVerifiedAt || null,
        avatarUrl: data.avatarUrl || null,
        xUrl: data.xUrl || null,
        telegramUrl: data.telegramUrl || null,
        discordHandle: data.discordHandle || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbState.profiles.set(data.userId, profile);
      return profile;
    },
    update: async ({ where, data }: any) => {
      const existing = dbState.profiles.get(where.userId);
      if (!existing) {
        throw new Error("Profile not found");
      }
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      dbState.profiles.set(where.userId, updated);
      return updated;
    },
  },
  reputation: {
    findUnique: async ({ where }: any) => {
      return dbState.reputations.get(where.userId) || null;
    },
    upsert: async ({ where, update, create }: any) => {
      const existing = dbState.reputations.get(where.userId);
      if (existing) {
        const updated = {
          ...existing,
          ...update,
          updatedAt: new Date(),
        };
        dbState.reputations.set(where.userId, updated);
        return updated;
      } else {
        const created = {
          id: genId("rep"),
          userId: create.userId,
          points: create.points,
          tier: create.tier,
          updatedAt: new Date(),
        };
        dbState.reputations.set(where.userId, created);
        return created;
      }
    },
    update: async ({ where, data }: any) => {
      const existing = dbState.reputations.get(where.userId);
      if (!existing) throw new Error("Reputation not found");
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      dbState.reputations.set(where.userId, updated);
      return updated;
    },
  },
  reputationEvent: {
    create: async ({ data }: any) => {
      const event = {
        id: genId("event"),
        userId: data.userId,
        type: data.type,
        points: data.points,
        reason: data.reason || null,
        referenceType: data.referenceType || null,
        referenceId: data.referenceId || null,
        createdAt: new Date(),
      };
      dbState.reputationEvents.push(event);
      return event;
    },
    findFirst: async ({ where }: any) => {
      return (
        dbState.reputationEvents.find((e) => {
          if (e.userId !== where.userId) return false;
          if (where.type && e.type !== where.type) return false;
          if (where.referenceType && e.referenceType !== where.referenceType) return false;
          if (where.referenceId && e.referenceId !== where.referenceId) return false;
          return true;
        }) || null
      );
    },
    findMany: async ({ where, select }: any) => {
      let list = dbState.reputationEvents.filter((e) => e.userId === where.userId);
      list = [...list].reverse();
      if (select) {
        return list.map((e) => {
          const item: any = {};
          for (const key of Object.keys(select)) {
            item[key] = e[key];
          }
          return item;
        });
      }
      return list;
    },
  },
  emailVerification: {
    create: async ({ data }: any) => {
      const item = {
        id: genId("email_ver"),
        userId: data.userId,
        email: data.email,
        tokenHash: data.tokenHash,
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
        usedAt: null,
        createdAt: new Date(),
      };
      dbState.emailVerifications.push(item);
      return item;
    },
    findFirst: async ({ where }: any) => {
      const matches = dbState.emailVerifications.filter(
        (v) => v.userId === where.userId && v.otpHash === where.otpHash
      );
      if (matches.length === 0) return null;
      return matches[matches.length - 1];
    },
    update: async ({ where, data }: any) => {
      const idx = dbState.emailVerifications.findIndex((v) => v.id === where.id);
      if (idx === -1) throw new Error("Verification record not found");
      dbState.emailVerifications[idx] = {
        ...dbState.emailVerifications[idx],
        ...data,
      };
      return dbState.emailVerifications[idx];
    },
  },
  pool: {
    findMany: async ({ where, include }: any = {}) => {
      let list = Array.from(dbState.pools.values());
      if (where?.status) {
        list = list.filter((p) => p.status === where.status);
      }
      return list.map((p) => {
        const item: any = { ...p };
        if (include?.groups) {
          item.groups = Array.from(dbState.groups.values()).filter(
            (g) => g.poolId === p.id
          );
        } else {
          item.groups = [];
        }
        return item;
      });
    },
    findFirst: async ({ where }: any) => {
      for (const p of dbState.pools.values()) {
        if (where.id && p.id === where.id) return { ...p };
        if (where.externalPoolId && p.externalPoolId === where.externalPoolId) return { ...p };
        if (where.OR) {
          for (const cond of where.OR) {
            if (cond.id && p.id === cond.id) return { ...p };
            if (cond.externalPoolId && p.externalPoolId === cond.externalPoolId) return { ...p };
          }
        }
      }
      return null;
    },
    findUnique: async ({ where }: any) => {
      if (where.id) return dbState.pools.get(where.id) || null;
      if (where.externalPoolId) {
        for (const p of dbState.pools.values()) {
          if (p.externalPoolId === where.externalPoolId) return { ...p };
        }
      }
      return null;
    },
    create: async ({ data }: any) => {
      const id = data.id || genId("pool");
      const pool = {
        id,
        externalPoolId: data.externalPoolId,
        name: data.name,
        description: data.description || null,
        mode: data.mode,
        minimumTier: data.minimumTier,
        groupSize: data.groupSize,
        cycleCount: data.cycleCount,
        cycleDurationDays: data.cycleDurationDays || 30,
        paymentWindowDays: data.paymentWindowDays || 10,
        auctionOpenDay: data.auctionOpenDay ?? null,
        auctionCloseDay: data.auctionCloseDay ?? null,
        settlementDay: data.settlementDay || 30,
        contributionAmountWei: data.contributionAmountWei,
        maxDiscountBps: data.maxDiscountBps ?? null,
        status: data.status || "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbState.pools.set(id, pool);
      return pool;
    },
    update: async ({ where, data }: any) => {
      const p = dbState.pools.get(where.id);
      if (!p) throw new Error("Pool not found");
      const updated = { ...p, ...data, updatedAt: new Date() };
      dbState.pools.set(where.id, updated);
      return updated;
    },
    count: async () => dbState.pools.size,
  },
  group: {
    count: async ({ where }: any = {}) => {
      let list = Array.from(dbState.groups.values());
      if (where?.status) list = list.filter((g) => g.status === where.status);
      return list.length;
    },
    findMany: async ({ where, include, orderBy }: any = {}) => {
      let list = Array.from(dbState.groups.values());
      if (where?.poolId) list = list.filter((g) => g.poolId === where.poolId);
      if (where?.status) list = list.filter((g) => g.status === where.status);
      if (orderBy?.createdAt === "asc") {
        list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
      return list.map((g) => {
        const item = { ...g };
        if (include?.members) {
          item.members = Array.from(dbState.groupMembers.values()).filter(
            (m) => m.groupId === g.id
          );
        }
        if (include?.pool) {
          item.pool = dbState.pools.get(g.poolId) || null;
        }
        return item;
      });
    },
    findFirst: async ({ where, orderBy }: any = {}) => {
      let list = Array.from(dbState.groups.values());
      if (where?.poolId) list = list.filter((g) => g.poolId === where.poolId);
      if (where?.status) list = list.filter((g) => g.status === where.status);
      if (orderBy?.groupNumber === "desc") {
        list.sort((a, b) => b.groupNumber - a.groupNumber);
      }
      if (list.length === 0) return null;
      return { ...list[0] };
    },
    findUnique: async ({ where, include }: any) => {
      const g = dbState.groups.get(where.id);
      if (!g) return null;
      const item: any = { ...g };
      if (include?.members) {
        let members = Array.from(dbState.groupMembers.values()).filter(
          (m) => m.groupId === g.id
        );
        if (include.members.include?.user) {
          members = members.map((m) => {
            const u = dbState.users.get(m.userId);
            const prof = dbState.profiles.get(m.userId);
            const rep = dbState.reputations.get(m.userId);
            return {
              ...m,
              user: {
                id: u?.id,
                walletAddress: u?.walletAddress,
                profile: prof
                  ? { username: prof.username, avatarUrl: prof.avatarUrl }
                  : null,
                reputation: rep
                  ? { points: rep.points, tier: rep.tier }
                  : { points: 0, tier: 1 },
              },
            };
          });
        }
        item.members = members;
      }
      if (include?.pool) {
        item.pool = dbState.pools.get(g.poolId) || null;
      }
      if (include?.cycles) {
        let cycs = Array.from(dbState.cycles.values()).filter(
          (c) => c.groupId === g.id
        );
        if (include.cycles.orderBy?.cycleNumber === "asc") {
          cycs.sort((a, b) => a.cycleNumber - b.cycleNumber);
        }
        item.cycles = cycs.map((c) => {
          const cycItem: any = { ...c };
          if (include.cycles.include?.rewardLedger) {
            for (const rl of dbState.cycleRewardLedgers.values()) {
              if (rl.cycleId === c.id) {
                cycItem.rewardLedger = { ...rl };
                break;
              }
            }
          }
          return cycItem;
        });
      }
      if (include?.rewardLedgers) {
        let rls = Array.from(dbState.cycleRewardLedgers.values()).filter(
          (rl) => rl.groupId === g.id
        );
        if (include.rewardLedgers.orderBy?.cycleNumber === "asc") {
          rls.sort((a, b) => a.cycleNumber - b.cycleNumber);
        }
        item.rewardLedgers = rls;
      }
      return item;
    },
    create: async ({ data }: any) => {
      const id = genId("group");
      const group = {
        id,
        poolId: data.poolId,
        groupNumber: data.groupNumber,
        status: data.status || "FORMING",
        memberCount: data.memberCount || 0,
        startDate: data.startDate || null,
        currentCycle: data.currentCycle || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbState.groups.set(id, group);

      if (data.members?.create) {
        const memId = genId("member");
        const mem = {
          id: memId,
          groupId: id,
          userId: data.members.create.userId,
          payoutSlot: data.members.create.payoutSlot || 1,
          hasReceivedPayout: false,
          status: "ACTIVE",
          joinedAt: new Date(),
          updatedAt: new Date(),
        };
        dbState.groupMembers.set(memId, mem);
      }
      return group;
    },
    update: async ({ where, data }: any) => {
      const g = dbState.groups.get(where.id);
      if (!g) throw new Error("Group not found");
      const updated = {
        ...g,
        ...data,
        updatedAt: new Date(),
      };
      dbState.groups.set(where.id, updated);
      return updated;
    },
  },
  groupMember: {
    findMany: async ({ where, include, orderBy }: any = {}) => {
      let list = Array.from(dbState.groupMembers.values());
      if (where?.userId) list = list.filter((m) => m.userId === where.userId);
      if (where?.groupId) list = list.filter((m) => m.groupId === where.groupId);

      return list.map((m) => {
        const item: any = { ...m };
        if (include?.group) {
          const grp = dbState.groups.get(m.groupId);
          if (grp) {
            const grpItem: any = { ...grp };
            if (include.group.include?.pool) {
              grpItem.pool = dbState.pools.get(grp.poolId) || null;
            }
            if (include.group.include?.members) {
              grpItem.members = Array.from(dbState.groupMembers.values()).filter(
                (gm) => gm.groupId === grp.id
              );
            }
            item.group = grpItem;
          }
        }
        return item;
      });
    },
    findFirst: async ({ where }: any) => {
      for (const m of dbState.groupMembers.values()) {
        if (where.groupId && m.groupId !== where.groupId) continue;
        if (where.userId && m.userId !== where.userId) continue;
        return { ...m };
      }
      return null;
    },
    create: async ({ data }: any) => {
      const id = genId("member");
      const member = {
        id,
        groupId: data.groupId,
        userId: data.userId,
        payoutSlot: data.payoutSlot || null,
        hasReceivedPayout: false,
        status: "ACTIVE",
        joinedAt: new Date(),
        updatedAt: new Date(),
      };
      dbState.groupMembers.set(id, member);
      return member;
    },
    update: async ({ where, data }: any) => {
      let member: any = null;
      if (where.id) {
        member = dbState.groupMembers.get(where.id);
      } else if (where.groupId_userId) {
        for (const m of dbState.groupMembers.values()) {
          if (
            m.groupId === where.groupId_userId.groupId &&
            m.userId === where.groupId_userId.userId
          ) {
            member = m;
            break;
          }
        }
      }
      if (!member) throw new Error("GroupMember not found");
      const updated = {
        ...member,
        ...data,
        updatedAt: new Date(),
      };
      dbState.groupMembers.set(member.id, updated);
      return updated;
    },
  },
  cycle: {
    count: async ({ where }: any = {}) => {
      let list = Array.from(dbState.cycles.values());
      if (where?.status) list = list.filter((c) => c.status === where.status);
      return list.length;
    },
    findMany: async ({ where, orderBy }: any = {}) => {
      let list = Array.from(dbState.cycles.values());
      if (where?.groupId) list = list.filter((c) => c.groupId === where.groupId);
      if (orderBy?.cycleNumber === "asc") {
        list.sort((a, b) => a.cycleNumber - b.cycleNumber);
      }
      return list;
    },
    findUnique: async ({ where, include }: any) => {
      const c = dbState.cycles.get(where.id);
      if (!c) return null;
      const item: any = { ...c };
      if (include?.group) {
        const grp = dbState.groups.get(c.groupId);
        if (grp) {
          const grpItem: any = { ...grp };
          if (include.group.include?.pool) {
            grpItem.pool = dbState.pools.get(grp.poolId) || null;
          }
          if (include.group.include?.members) {
            let members = Array.from(dbState.groupMembers.values()).filter(
              (m) => m.groupId === grp.id
            );
            if (include.group.include.members.include?.user) {
              members = members.map((m) => {
                const u = dbState.users.get(m.userId);
                const prof = dbState.profiles.get(m.userId);
                const rep = dbState.reputations.get(m.userId);
                return {
                  ...m,
                  user: {
                    id: u?.id,
                    walletAddress: u?.walletAddress,
                    profile: prof
                      ? { username: prof.username, avatarUrl: prof.avatarUrl }
                      : null,
                    reputation: rep
                      ? { points: rep.points, tier: rep.tier }
                      : { points: 0, tier: 1 },
                  },
                };
              });
            }
            grpItem.members = members;
          }
          if (include.group.include?.cycles) {
            grpItem.cycles = Array.from(dbState.cycles.values())
              .filter((cy) => cy.groupId === grp.id)
              .map((cy) => {
                const cyItem: any = { ...cy };
                if (include.group.include.cycles.include?.rewardLedger) {
                  for (const rl of dbState.cycleRewardLedgers.values()) {
                    if (rl.cycleId === cy.id) {
                      cyItem.rewardLedger = { ...rl };
                      break;
                    }
                  }
                }
                return cyItem;
              });
          }
          item.group = grpItem;
        }
      }
      if (include?.auction) {
        for (const a of dbState.auctions.values()) {
          if (a.cycleId === c.id) {
            const aItem: any = { ...a };
            if (include.auction.include?.bids) {
              let bids = Array.from(dbState.bids.values()).filter(
                (b) => b.auctionId === a.id
              );
              if (include.auction.include.bids.orderBy?.submittedAt === "asc") {
                bids.sort(
                  (x, y) =>
                    new Date(x.submittedAt).getTime() -
                    new Date(y.submittedAt).getTime()
                );
              }
              aItem.bids = bids;
            }
            item.auction = aItem;
            break;
          }
        }
      }
      if (include?.contributions) {
        item.contributions = Array.from(dbState.contributions.values()).filter(
          (cb) => cb.cycleId === c.id
        );
      }
      if (include?.payout) {
        for (const p of dbState.payouts.values()) {
          if (p.cycleId === c.id) {
            item.payout = { ...p };
            break;
          }
        }
      }
      if (include?.rewardLedger) {
        for (const rl of dbState.cycleRewardLedgers.values()) {
          if (rl.cycleId === c.id) {
            item.rewardLedger = { ...rl };
            break;
          }
        }
      }
      return item;
    },
    findFirst: async ({ where }: any) => {
      for (const c of dbState.cycles.values()) {
        if (where.groupId && c.groupId !== where.groupId) continue;
        if (where.cycleNumber && c.cycleNumber !== where.cycleNumber) continue;
        return { ...c };
      }
      return null;
    },
    create: async ({ data }: any) => {
      const id = genId("cycle");
      const cycle = {
        id,
        groupId: data.groupId,
        cycleNumber: data.cycleNumber,
        startDate: data.startDate || null,
        paymentDeadline: data.paymentDeadline || null,
        auctionOpenAt: data.auctionOpenAt || null,
        auctionCloseAt: data.auctionCloseAt || null,
        settlementAt: data.settlementAt || null,
        isFinalCycle: data.isFinalCycle ?? false,
        status: data.status || "UPCOMING",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbState.cycles.set(id, cycle);
      return cycle;
    },
    update: async ({ where, data }: any) => {
      const c = dbState.cycles.get(where.id);
      if (!c) throw new Error("Cycle not found");
      const updated = {
        ...c,
        ...data,
        updatedAt: new Date(),
      };
      dbState.cycles.set(where.id, updated);
      return updated;
    },
  },
  contribution: {
    count: async ({ where }: any = {}) => {
      let list = Array.from(dbState.contributions.values());
      if (where?.status) {
        if (typeof where.status === "string") {
          list = list.filter((c) => c.status === where.status);
        } else if (Array.isArray(where.status?.in)) {
          list = list.filter((c) => where.status.in.includes(c.status));
        }
      }
      return list.length;
    },
    findMany: async ({ where, include, orderBy }: any = {}) => {
      let list = Array.from(dbState.contributions.values());
      if (where?.userId) list = list.filter((c) => c.userId === where.userId);
      if (where?.cycleId) list = list.filter((c) => c.cycleId === where.cycleId);
      if (where?.groupId) list = list.filter((c) => c.groupId === where.groupId);

      return list.map((c) => {
        const item: any = { ...c };
        if (include?.cycle) {
          item.cycle = dbState.cycles.get(c.cycleId) || null;
        }
        if (include?.group) {
          const grp = dbState.groups.get(c.groupId);
          if (grp) {
            const grpItem: any = { ...grp };
            if (include.group.include?.pool) {
              grpItem.pool = dbState.pools.get(grp.poolId) || null;
            }
            item.group = grpItem;
          }
        }
        return item;
      });
    },
    findFirst: async ({ where, include }: any) => {
      for (const c of dbState.contributions.values()) {
        if (where.id && c.id !== where.id) continue;
        if (where.cycleId && c.cycleId !== where.cycleId) continue;
        if (where.userId && c.userId !== where.userId) continue;
        if (where.txHash && c.txHash !== where.txHash) continue;
        if (where.NOT?.id && c.id === where.NOT.id) continue;

        const item: any = { ...c };
        if (include?.cycle) {
          item.cycle = dbState.cycles.get(c.cycleId) || null;
        }
        if (include?.group) {
          const grp = dbState.groups.get(c.groupId);
          if (grp) {
            const grpItem: any = { ...grp };
            if (include.group.include?.pool) {
              grpItem.pool = dbState.pools.get(grp.poolId) || null;
            }
            item.group = grpItem;
          }
        }
        return item;
      }
      return null;
    },
    findUnique: async ({ where, include }: any) => {
      let c: any = null;
      if (where.id) {
        c = dbState.contributions.get(where.id);
      } else if (where.cycleId_userId) {
        for (const item of dbState.contributions.values()) {
          if (
            item.cycleId === where.cycleId_userId.cycleId &&
            item.userId === where.cycleId_userId.userId
          ) {
            c = item;
            break;
          }
        }
      }
      if (!c) return null;
      const res: any = { ...c };
      if (include?.cycle) {
        res.cycle = dbState.cycles.get(c.cycleId) || null;
      }
      return res;
    },
    create: async ({ data }: any) => {
      const id = genId("contribution");
      const item = {
        id,
        cycleId: data.cycleId,
        groupId: data.groupId,
        userId: data.userId,
        amountWei: data.amountWei,
        status: data.status || "PENDING",
        dueDate: data.dueDate || null,
        paidAt: null,
        txHash: null,
        lateDays: data.lateDays || 0,
        penaltyPoint: data.penaltyPoint || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbState.contributions.set(id, item);
      return item;
    },
    update: async ({ where, data }: any) => {
      const c = dbState.contributions.get(where.id);
      if (!c) throw new Error("Contribution not found");
      const updated = {
        ...c,
        ...data,
        updatedAt: new Date(),
      };
      dbState.contributions.set(where.id, updated);
      return updated;
    },
  },
  contractTransaction: {
    findUnique: async ({ where }: any) => {
      if (where.txHash) {
        for (const tx of dbState.contractTransactions.values()) {
          if (tx.txHash === where.txHash) return { ...tx };
        }
      }
      return null;
    },
    create: async ({ data }: any) => {
      const id = genId("tx");
      const tx = {
        id,
        type: data.type,
        status: data.status || "CONFIRMED",
        txHash: data.txHash,
        groupId: data.groupId || null,
        cycleId: data.cycleId || null,
        amountWei: data.amountWei || null,
        fromAddress: data.fromAddress || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbState.contractTransactions.set(id, tx);
      return tx;
    },
  },
  auction: {
    findUnique: async ({ where, include }: any) => {
      let found: any = null;
      if (where.id) {
        found = dbState.auctions.get(where.id);
      } else if (where.cycleId) {
        for (const a of dbState.auctions.values()) {
          if (a.cycleId === where.cycleId) {
            found = a;
            break;
          }
        }
      }
      if (!found) return null;
      const item: any = { ...found };
      if (include?.bids) {
        let bids = Array.from(dbState.bids.values()).filter(
          (b) => b.auctionId === found.id
        );
        if (include.bids.orderBy?.submittedAt === "asc") {
          bids.sort(
            (x, y) =>
              new Date(x.submittedAt).getTime() -
              new Date(y.submittedAt).getTime()
          );
        }
        item.bids = bids;
      }
      if (include?.cycle) {
        const cyc = dbState.cycles.get(found.cycleId);
        if (cyc) {
          const cycItem: any = { ...cyc };
          if (include.cycle.include?.group) {
            const grp = dbState.groups.get(cyc.groupId);
            if (grp) {
              const grpItem: any = { ...grp };
              if (include.cycle.include.group.include?.pool) {
                grpItem.pool = dbState.pools.get(grp.poolId) || null;
              }
              if (include.cycle.include.group.include?.members) {
                grpItem.members = Array.from(
                  dbState.groupMembers.values()
                ).filter((m) => m.groupId === grp.id);
              }
              cycItem.group = grpItem;
            }
          }
          if (include.cycle.include?.payout) {
            for (const p of dbState.payouts.values()) {
              if (p.cycleId === cyc.id) {
                cycItem.payout = { ...p };
                break;
              }
            }
          }
          if (include.cycle.include?.rewardLedger) {
            for (const rl of dbState.cycleRewardLedgers.values()) {
              if (rl.cycleId === cyc.id) {
                cycItem.rewardLedger = { ...rl };
                break;
              }
            }
          }
          item.cycle = cycItem;
        }
      }
      return item;
    },
    create: async ({ data, include }: any) => {
      const id = genId("auction");
      const auction = {
        id,
        cycleId: data.cycleId,
        groupId: data.groupId,
        status: data.status || "SCHEDULED",
        rewardPoolWei: data.rewardPoolWei,
        minimumPayoutWei: data.minimumPayoutWei,
        maxDiscountBps: data.maxDiscountBps,
        bestBidId: data.bestBidId || null,
        openAt: data.openAt || null,
        closeAt: data.closeAt || null,
        settlementAt: data.settlementAt || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbState.auctions.set(id, auction);
      const res: any = { ...auction };
      if (include?.bids) {
        res.bids = [];
      }
      return res;
    },
    update: async ({ where, data }: any) => {
      const a = dbState.auctions.get(where.id);
      if (!a) throw new Error("Auction not found");
      const updated = {
        ...a,
        ...data,
        updatedAt: new Date(),
      };
      dbState.auctions.set(where.id, updated);
      return updated;
    },
  },
  bid: {
    findUnique: async ({ where }: any) => {
      if (where.id) {
        const b = dbState.bids.get(where.id);
        return b ? { ...b } : null;
      }
      return null;
    },
    findMany: async ({ where, orderBy }: any = {}) => {
      let list = Array.from(dbState.bids.values());
      if (where?.auctionId)
        list = list.filter((b) => b.auctionId === where.auctionId);
      if (where?.userId) list = list.filter((b) => b.userId === where.userId);
      if (orderBy?.submittedAt === "asc") {
        list.sort(
          (x, y) =>
            new Date(x.submittedAt).getTime() -
            new Date(y.submittedAt).getTime()
        );
      }
      return list.map((b) => ({ ...b }));
    },
    create: async ({ data }: any) => {
      const id = genId("bid");
      const bid = {
        id,
        auctionId: data.auctionId,
        userId: data.userId,
        payoutAmountWei: data.payoutAmountWei,
        status: data.status || "VALID",
        submittedAt: data.submittedAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbState.bids.set(id, bid);
      return { ...bid };
    },
    update: async ({ where, data }: any) => {
      const b = dbState.bids.get(where.id);
      if (!b) throw new Error("Bid not found");
      const updated = {
        ...b,
        ...data,
        updatedAt: new Date(),
      };
      dbState.bids.set(where.id, updated);
      return updated;
    },
  },
  payout: {
    findUnique: async ({ where }: any) => {
      if (where.id) {
        const p = dbState.payouts.get(where.id);
        return p ? { ...p } : null;
      }
      if (where.cycleId) {
        for (const p of dbState.payouts.values()) {
          if (p.cycleId === where.cycleId) return { ...p };
        }
      }
      return null;
    },
    create: async ({ data }: any) => {
      const id = genId("payout");
      const payout = {
        id,
        cycleId: data.cycleId,
        groupId: data.groupId,
        recipientUserId: data.recipientUserId,
        type: data.type,
        amountWei: data.amountWei,
        status: data.status || "PENDING",
        txHash: data.txHash || null,
        paidAt: data.paidAt || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbState.payouts.set(id, payout);
      return { ...payout };
    },
  },
  cycleRewardLedger: {
    findUnique: async ({ where }: any) => {
      if (where.cycleId) {
        for (const rl of dbState.cycleRewardLedgers.values()) {
          if (rl.cycleId === where.cycleId) return { ...rl };
        }
      }
      return null;
    },
    findFirst: async ({ where }: any) => {
      for (const rl of dbState.cycleRewardLedgers.values()) {
        if (where.groupId && rl.groupId !== where.groupId) continue;
        if (where.cycleNumber && rl.cycleNumber !== where.cycleNumber) continue;
        if (where.cycleId && rl.cycleId !== where.cycleId) continue;
        return { ...rl };
      }
      return null;
    },
    findMany: async ({ where, orderBy }: any = {}) => {
      let list = Array.from(dbState.cycleRewardLedgers.values());
      if (where?.groupId)
        list = list.filter((rl) => rl.groupId === where.groupId);
      if (orderBy?.cycleNumber === "asc") {
        list.sort((a, b) => a.cycleNumber - b.cycleNumber);
      }
      return list.map((rl) => ({ ...rl }));
    },
    create: async ({ data }: any) => {
      const id = genId("ledger");
      const ledger = {
        id,
        groupId: data.groupId,
        cycleId: data.cycleId,
        cycleNumber: data.cycleNumber,
        baseRewardWei: data.baseRewardWei,
        carriedRewardWei: data.carriedRewardWei,
        rewardPoolWei: data.rewardPoolWei,
        payoutWei: data.payoutWei,
        remainingCarryRewardWei: data.remainingCarryRewardWei,
        isFinalCycle: data.isFinalCycle ?? false,
        createdAt: new Date(),
      };
      dbState.cycleRewardLedgers.set(id, ledger);
      return { ...ledger };
    },
  },
  auditLog: {
    create: async ({ data }: any) => {
      const id = genId("audit");
      const log = {
        id,
        actorUserId: data.actorUserId || null,
        actorType: data.actorType,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || null,
        metadata: data.metadata || null,
        createdAt: new Date(),
      };
      dbState.auditLogs.push(log);
      return { ...log };
    },
    count: async () => dbState.auditLogs.length,
    findMany: async ({ where, take, skip, orderBy }: any = {}) => {
      let list = [...dbState.auditLogs];
      if (where?.entityType)
        list = list.filter((l) => l.entityType === where.entityType);
      if (where?.entityId)
        list = list.filter((l) => l.entityId === where.entityId);
      if (where?.action)
        list = list.filter((l) => l.action === where.action);
      if (orderBy?.createdAt === "desc") {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      const offset = skip || 0;
      if (take !== undefined) {
        list = list.slice(offset, offset + take);
      } else if (offset > 0) {
        list = list.slice(offset);
      }
      return list;
    },
  },
  $transaction: async (ops: any) => {
    if (Array.isArray(ops)) {
      return Promise.all(ops);
    }
    if (typeof ops === "function") {
      return ops(mockPrisma);
    }
    return ops;
  },
};
