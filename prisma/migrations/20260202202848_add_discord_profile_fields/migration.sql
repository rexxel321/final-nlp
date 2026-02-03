-- AlterTable
ALTER TABLE `user` ADD COLUMN `avatar` VARCHAR(191) NULL,
    ADD COLUMN `displayName` VARCHAR(191) NULL,
    ADD COLUMN `statusEmoji` VARCHAR(191) NULL,
    ADD COLUMN `statusExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `statusText` VARCHAR(191) NULL;
