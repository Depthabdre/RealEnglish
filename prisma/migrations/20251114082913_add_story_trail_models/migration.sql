-- CreateTable
CREATE TABLE "StoryTrail" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "difficultyLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryTrail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorySegment" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "imageUrl" TEXT,
    "trailId" TEXT NOT NULL,

    CONSTRAINT "StorySegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SingleChoiceChallenge" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "correctAnswerId" TEXT NOT NULL,
    "correctFeedback" TEXT,
    "incorrectFeedback" TEXT,
    "segmentId" TEXT NOT NULL,

    CONSTRAINT "SingleChoiceChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Choice" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "challengeId" TEXT NOT NULL,

    CONSTRAINT "Choice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletedStory" (
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedStory_pkey" PRIMARY KEY ("userId","storyId")
);

-- CreateIndex
CREATE INDEX "StorySegment_trailId_idx" ON "StorySegment"("trailId");

-- CreateIndex
CREATE UNIQUE INDEX "SingleChoiceChallenge_segmentId_key" ON "SingleChoiceChallenge"("segmentId");

-- CreateIndex
CREATE INDEX "Choice_challengeId_idx" ON "Choice"("challengeId");

-- AddForeignKey
ALTER TABLE "StorySegment" ADD CONSTRAINT "StorySegment_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "StoryTrail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleChoiceChallenge" ADD CONSTRAINT "SingleChoiceChallenge_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "StorySegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "SingleChoiceChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedStory" ADD CONSTRAINT "CompletedStory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedStory" ADD CONSTRAINT "CompletedStory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "StoryTrail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
