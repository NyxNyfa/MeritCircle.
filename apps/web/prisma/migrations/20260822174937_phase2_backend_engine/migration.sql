-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "poolIdOnChain" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 0,
    "cycle" INTEGER NOT NULL,
    "userWallet" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "poolIdOnChain" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 0,
    "cycle" INTEGER NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "winningBid" DOUBLE PRECISION,
    "winnerWallet" TEXT,
    "surplus" DOUBLE PRECISION,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "userWallet" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "valid" BOOLEAN NOT NULL DEFAULT true,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "poolIdOnChain" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 0,
    "cycle" INTEGER NOT NULL,
    "userWallet" TEXT NOT NULL,
    "nominalAmount" DOUBLE PRECISION NOT NULL,
    "payoutAmount" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "surplus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "txHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SETTLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obligation" (
    "id" TEXT NOT NULL,
    "poolIdOnChain" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 0,
    "userWallet" TEXT NOT NULL,
    "totalCycles" INTEGER NOT NULL,
    "contributedCycles" INTEGER NOT NULL DEFAULT 0,
    "missedCycles" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userWallet" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationEvent" (
    "id" TEXT NOT NULL,
    "userWallet" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "pointsDelta" INTEGER NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexerCursor" (
    "id" TEXT NOT NULL,
    "lastBlock" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexerCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contribution_userWallet_idx" ON "Contribution"("userWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_poolIdOnChain_round_cycle_userWallet_key" ON "Contribution"("poolIdOnChain", "round", "cycle", "userWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Auction_poolIdOnChain_round_cycle_key" ON "Auction"("poolIdOnChain", "round", "cycle");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_auctionId_userWallet_key" ON "Bid"("auctionId", "userWallet");

-- CreateIndex
CREATE INDEX "Payout_userWallet_idx" ON "Payout"("userWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_poolIdOnChain_round_cycle_key" ON "Payout"("poolIdOnChain", "round", "cycle");

-- CreateIndex
CREATE INDEX "Obligation_userWallet_idx" ON "Obligation"("userWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Obligation_poolIdOnChain_round_userWallet_key" ON "Obligation"("poolIdOnChain", "round", "userWallet");

-- CreateIndex
CREATE INDEX "Notification_userWallet_read_idx" ON "Notification"("userWallet", "read");

-- CreateIndex
CREATE INDEX "ReputationEvent_userWallet_idx" ON "ReputationEvent"("userWallet");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_token_key" ON "EmailToken"("token");

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
