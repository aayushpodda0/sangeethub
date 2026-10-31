-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "LanguageCode" AS ENUM ('HINDI', 'MARATHI', 'TAMIL', 'TELUGU', 'BENGALI', 'MALAYALAM', 'KANNADA', 'PUNJABI', 'ENGLISH');

-- CreateEnum
CREATE TYPE "Mood" AS ENUM ('FOCUS', 'WORKOUT', 'RELAX', 'TRAVEL', 'PARTY', 'SLEEP', 'HAPPY', 'SAD', 'ENERGETIC', 'CALM');

-- CreateEnum
CREATE TYPE "Activity" AS ENUM ('STUDY', 'GYM', 'COMMUTE', 'CODING', 'YOGA', 'RUNNING', 'MEDITATION', 'CELEBRATION', 'SLEEPING');

-- CreateEnum
CREATE TYPE "CollaborationPermission" AS ENUM ('CONTRIBUTOR', 'MODERATOR');

-- CreateEnum
CREATE TYPE "PlaylistActivityType" AS ENUM ('CREATED', 'RENAMED', 'TRACK_ADDED', 'TRACK_REMOVED', 'REORDERED', 'COLLAB_ENABLED', 'COLLAB_DISABLED', 'COLLABORATOR_JOINED', 'COLLABORATOR_REMOVED', 'COLLABORATOR_PERMISSION_CHANGED');

-- CreateEnum
CREATE TYPE "PartyParticipantRole" AS ENUM ('HOST', 'GUEST');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UPVOTE', 'DOWNVOTE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "city" TEXT,
    "region" TEXT,
    "imageUrl" TEXT,
    "isIndependent" BOOLEAN NOT NULL DEFAULT true,
    "popularity" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "artworkUrl" TEXT,
    "primaryArtistId" TEXT NOT NULL,
    "language" "LanguageCode" NOT NULL,
    "popularity" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "artworkUrl" TEXT,
    "language" "LanguageCode" NOT NULL,
    "moods" "Mood"[],
    "activities" "Activity"[],
    "tempo" INTEGER NOT NULL,
    "popularity" INTEGER NOT NULL DEFAULT 50,
    "explicit" BOOLEAN NOT NULL DEFAULT false,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackArtist" (
    "trackId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,

    CONSTRAINT "TrackArtist_pkey" PRIMARY KEY ("trackId","artistId")
);

-- CreateTable
CREATE TABLE "TrackGenre" (
    "trackId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "TrackGenre_pkey" PRIMARY KEY ("trackId","genreId")
);

-- CreateTable
CREATE TABLE "PlaylistFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaylistFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playlist" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isCollaborative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistTag" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PlaylistTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistTrack" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteTrack" (
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteTrack_pkey" PRIMARY KEY ("userId","trackId")
);

-- CreateTable
CREATE TABLE "SavedAlbum" (
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedAlbum_pkey" PRIMARY KEY ("userId","albumId")
);

-- CreateTable
CREATE TABLE "FollowedArtist" (
    "userId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowedArtist_pkey" PRIMARY KEY ("userId","artistId")
);

-- CreateTable
CREATE TABLE "RecentlyPlayed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "artistId" TEXT,
    "albumId" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentlyPlayed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT,
    "artistId" TEXT,
    "playlistId" TEXT,
    "reasonCode" TEXT NOT NULL,
    "reasonLabel" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistCollaboration" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "CollaborationPermission" NOT NULL DEFAULT 'CONTRIBUTOR',
    "canRemoveOthers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaylistCollaboration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistInvite" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistActivity" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "PlaylistActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyRoom" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentTrackId" TEXT,
    "startedAt" TIMESTAMP(3),
    "playbackPosition" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PartyParticipantRole" NOT NULL DEFAULT 'GUEST',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "PartyParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyQueueItem" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "voteScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueVote" (
    "id" TEXT NOT NULL,
    "queueItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteType" "VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist"("slug");

-- CreateIndex
CREATE INDEX "Artist_name_idx" ON "Artist"("name");

-- CreateIndex
CREATE INDEX "Artist_region_city_idx" ON "Artist"("region", "city");

-- CreateIndex
CREATE UNIQUE INDEX "Album_slug_key" ON "Album"("slug");

-- CreateIndex
CREATE INDEX "Album_title_idx" ON "Album"("title");

-- CreateIndex
CREATE INDEX "Album_primaryArtistId_idx" ON "Album"("primaryArtistId");

-- CreateIndex
CREATE INDEX "Album_language_idx" ON "Album"("language");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE INDEX "Genre_name_idx" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Track_slug_key" ON "Track"("slug");

-- CreateIndex
CREATE INDEX "Track_title_idx" ON "Track"("title");

-- CreateIndex
CREATE INDEX "Track_albumId_idx" ON "Track"("albumId");

-- CreateIndex
CREATE INDEX "Track_language_idx" ON "Track"("language");

-- CreateIndex
CREATE INDEX "Track_popularity_idx" ON "Track"("popularity");

-- CreateIndex
CREATE INDEX "TrackArtist_artistId_idx" ON "TrackArtist"("artistId");

-- CreateIndex
CREATE INDEX "TrackGenre_genreId_idx" ON "TrackGenre"("genreId");

-- CreateIndex
CREATE INDEX "PlaylistFolder_userId_idx" ON "PlaylistFolder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistFolder_userId_name_key" ON "PlaylistFolder"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Playlist_slug_key" ON "Playlist"("slug");

-- CreateIndex
CREATE INDEX "Playlist_ownerId_idx" ON "Playlist"("ownerId");

-- CreateIndex
CREATE INDEX "Playlist_folderId_idx" ON "Playlist"("folderId");

-- CreateIndex
CREATE INDEX "Playlist_isPublic_updatedAt_idx" ON "Playlist"("isPublic", "updatedAt");

-- CreateIndex
CREATE INDEX "PlaylistTag_name_idx" ON "PlaylistTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistTag_playlistId_name_key" ON "PlaylistTag"("playlistId", "name");

-- CreateIndex
CREATE INDEX "PlaylistTrack_playlistId_trackId_idx" ON "PlaylistTrack"("playlistId", "trackId");

-- CreateIndex
CREATE INDEX "PlaylistTrack_addedById_idx" ON "PlaylistTrack"("addedById");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistTrack_playlistId_position_key" ON "PlaylistTrack"("playlistId", "position");

-- CreateIndex
CREATE INDEX "FavoriteTrack_createdAt_idx" ON "FavoriteTrack"("createdAt");

-- CreateIndex
CREATE INDEX "RecentlyPlayed_userId_playedAt_idx" ON "RecentlyPlayed"("userId", "playedAt");

-- CreateIndex
CREATE INDEX "Recommendation_userId_createdAt_idx" ON "Recommendation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaylistCollaboration_userId_idx" ON "PlaylistCollaboration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistCollaboration_playlistId_userId_key" ON "PlaylistCollaboration"("playlistId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistInvite_token_key" ON "PlaylistInvite"("token");

-- CreateIndex
CREATE INDEX "PlaylistInvite_playlistId_idx" ON "PlaylistInvite"("playlistId");

-- CreateIndex
CREATE INDEX "PlaylistActivity_playlistId_createdAt_idx" ON "PlaylistActivity"("playlistId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartyRoom_roomCode_key" ON "PartyRoom"("roomCode");

-- CreateIndex
CREATE INDEX "PartyRoom_hostId_idx" ON "PartyRoom"("hostId");

-- CreateIndex
CREATE INDEX "PartyRoom_isActive_updatedAt_idx" ON "PartyRoom"("isActive", "updatedAt");

-- CreateIndex
CREATE INDEX "PartyParticipant_userId_idx" ON "PartyParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyParticipant_roomId_userId_key" ON "PartyParticipant"("roomId", "userId");

-- CreateIndex
CREATE INDEX "PartyQueueItem_roomId_voteScore_idx" ON "PartyQueueItem"("roomId", "voteScore");

-- CreateIndex
CREATE UNIQUE INDEX "PartyQueueItem_roomId_position_key" ON "PartyQueueItem"("roomId", "position");

-- CreateIndex
CREATE INDEX "QueueVote_userId_createdAt_idx" ON "QueueVote"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QueueVote_queueItemId_userId_key" ON "QueueVote"("queueItemId", "userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_primaryArtistId_fkey" FOREIGN KEY ("primaryArtistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackArtist" ADD CONSTRAINT "TrackArtist_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackArtist" ADD CONSTRAINT "TrackArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackGenre" ADD CONSTRAINT "TrackGenre_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackGenre" ADD CONSTRAINT "TrackGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistFolder" ADD CONSTRAINT "PlaylistFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "PlaylistFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistTag" ADD CONSTRAINT "PlaylistTag_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteTrack" ADD CONSTRAINT "FavoriteTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteTrack" ADD CONSTRAINT "FavoriteTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedAlbum" ADD CONSTRAINT "SavedAlbum_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedAlbum" ADD CONSTRAINT "SavedAlbum_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedArtist" ADD CONSTRAINT "FollowedArtist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedArtist" ADD CONSTRAINT "FollowedArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyPlayed" ADD CONSTRAINT "RecentlyPlayed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyPlayed" ADD CONSTRAINT "RecentlyPlayed_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyPlayed" ADD CONSTRAINT "RecentlyPlayed_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyPlayed" ADD CONSTRAINT "RecentlyPlayed_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistCollaboration" ADD CONSTRAINT "PlaylistCollaboration_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistCollaboration" ADD CONSTRAINT "PlaylistCollaboration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistInvite" ADD CONSTRAINT "PlaylistInvite_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistInvite" ADD CONSTRAINT "PlaylistInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistActivity" ADD CONSTRAINT "PlaylistActivity_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistActivity" ADD CONSTRAINT "PlaylistActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyRoom" ADD CONSTRAINT "PartyRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyRoom" ADD CONSTRAINT "PartyRoom_currentTrackId_fkey" FOREIGN KEY ("currentTrackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyParticipant" ADD CONSTRAINT "PartyParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PartyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyParticipant" ADD CONSTRAINT "PartyParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyQueueItem" ADD CONSTRAINT "PartyQueueItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PartyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyQueueItem" ADD CONSTRAINT "PartyQueueItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyQueueItem" ADD CONSTRAINT "PartyQueueItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueVote" ADD CONSTRAINT "QueueVote_queueItemId_fkey" FOREIGN KEY ("queueItemId") REFERENCES "PartyQueueItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueVote" ADD CONSTRAINT "QueueVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
