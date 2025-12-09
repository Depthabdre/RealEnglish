-- CreateTable
CREATE TABLE "learning_shorts" (
    "id" TEXT NOT NULL,
    "youtube_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "channel_name" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "difficulty_level" TEXT NOT NULL DEFAULT 'intermediate',
    "category" TEXT NOT NULL DEFAULT 'general',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_shorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_short_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "short_id" TEXT NOT NULL,
    "watched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_saved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_short_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_shorts_youtube_id_key" ON "learning_shorts"("youtube_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_short_history_user_id_short_id_key" ON "user_short_history"("user_id", "short_id");

-- AddForeignKey
ALTER TABLE "user_short_history" ADD CONSTRAINT "user_short_history_short_id_fkey" FOREIGN KEY ("short_id") REFERENCES "learning_shorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
