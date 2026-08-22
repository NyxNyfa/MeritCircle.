-- CreateTable
CREATE TABLE "User" (
    "walletAddress" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "socialMedia" TEXT,
    "avatarUrl" TEXT,
    "twitterHandle" TEXT,
    "bio" TEXT,
    "meritScore" INTEGER NOT NULL DEFAULT 0,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("walletAddress")
);

-- CreateTable
CREATE TABLE "AuthChallenge" (
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" TEXT NOT NULL,
    "poolIdOnChain" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tierRequired" INTEGER NOT NULL DEFAULT 0,
    "contributionAmount" DOUBLE PRECISION NOT NULL,
    "poolSize" INTEGER NOT NULL,
    "totalYield" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isAuctionMode" BOOLEAN NOT NULL DEFAULT false,
    "lastWinnerUsername" TEXT,
    "lastWinnerAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolMember" (
    "userId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,

    CONSTRAINT "PoolMember_pkey" PRIMARY KEY ("userId","poolId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_poolIdOnChain_key" ON "Pool"("poolIdOnChain");

-- AddForeignKey
ALTER TABLE "PoolMember" ADD CONSTRAINT "PoolMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("walletAddress") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolMember" ADD CONSTRAINT "PoolMember_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
