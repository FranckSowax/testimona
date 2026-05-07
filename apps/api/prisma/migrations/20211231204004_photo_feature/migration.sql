-- CreateEnum
CREATE TYPE "MediaObjectType" AS ENUM ('Chapitre', 'MemorialBackground', 'MemorialProfile', 'Photo', 'Testimonial');

-- DropForeignKey
ALTER TABLE "biographies" DROP CONSTRAINT "biographies_createByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "biographies" DROP CONSTRAINT "biographies_memorialIdFk_fkey";

-- DropForeignKey
ALTER TABLE "biographies" DROP CONSTRAINT "biographies_updateByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "chapters" DROP CONSTRAINT "chapters_createByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "chapters" DROP CONSTRAINT "chapters_memorialIdFk_fkey";

-- DropForeignKey
ALTER TABLE "chapters" DROP CONSTRAINT "chapters_updateByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "funeralEvents" DROP CONSTRAINT "funeralEvents_createByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "funeralEvents" DROP CONSTRAINT "funeralEvents_memorialIdFk_fkey";

-- DropForeignKey
ALTER TABLE "funeralEvents" DROP CONSTRAINT "funeralEvents_updateByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "funerals" DROP CONSTRAINT "funerals_createByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "funerals" DROP CONSTRAINT "funerals_memorialIdFk_fkey";

-- DropForeignKey
ALTER TABLE "funerals" DROP CONSTRAINT "funerals_updateByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "memorialRequestAdmin" DROP CONSTRAINT "memorialRequestAdmin_applicantUserIdFk_fkey";

-- DropForeignKey
ALTER TABLE "memorialRequestAdmin" DROP CONSTRAINT "memorialRequestAdmin_memorialIdFk_fkey";

-- DropForeignKey
ALTER TABLE "memorialRequestAdmin" DROP CONSTRAINT "memorialRequestAdmin_updateByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "memorialUserRelationship" DROP CONSTRAINT "memorialUserRelationship_memorialIdFk_fkey";

-- DropForeignKey
ALTER TABLE "memorialUserRelationship" DROP CONSTRAINT "memorialUserRelationship_userIdFk_fkey";

-- DropForeignKey
ALTER TABLE "memorials" DROP CONSTRAINT "memorials_countryOfDeathIdFk_fkey";

-- DropForeignKey
ALTER TABLE "memorials" DROP CONSTRAINT "memorials_createByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "memorials" DROP CONSTRAINT "memorials_updateByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "securityQuestionUserAnswer" DROP CONSTRAINT "securityQuestionUserAnswer_securityQuestionsIdFk_fkey";

-- DropForeignKey
ALTER TABLE "securityQuestionUserAnswer" DROP CONSTRAINT "securityQuestionUserAnswer_userIdFk_fkey";

-- DropForeignKey
ALTER TABLE "security_questions" DROP CONSTRAINT "security_questions_createByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "testimonials" DROP CONSTRAINT "testimonials_createByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "testimonials" DROP CONSTRAINT "testimonials_memorialIdFk_fkey";

-- DropForeignKey
ALTER TABLE "testimonials" DROP CONSTRAINT "testimonials_updateByIdFk_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_languageIdFk_fkey";

-- CreateTable
CREATE TABLE "photos" (
    "photoId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "objectType" "MediaObjectType" NOT NULL,
    "publicId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "accessMode" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createByIdFk" TEXT NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateByIdFk" TEXT NOT NULL,
    "updateAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("photoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "photos_objectId_key" ON "photos"("objectId");

-- CreateIndex
CREATE UNIQUE INDEX "photos_publicId_key" ON "photos"("publicId");

-- AddForeignKey
ALTER TABLE "security_questions" ADD CONSTRAINT "security_questions_createByIdFk_fkey" FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biographies" ADD CONSTRAINT "biographies_memorialIdFk_fkey" FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biographies" ADD CONSTRAINT "biographies_createByIdFk_fkey" FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biographies" ADD CONSTRAINT "biographies_updateByIdFk_fkey" FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_memorialIdFk_fkey" FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_createByIdFk_fkey" FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_updateByIdFk_fkey" FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funerals" ADD CONSTRAINT "funerals_memorialIdFk_fkey" FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funerals" ADD CONSTRAINT "funerals_createByIdFk_fkey" FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funerals" ADD CONSTRAINT "funerals_updateByIdFk_fkey" FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funeralEvents" ADD CONSTRAINT "funeralEvents_memorialIdFk_fkey" FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funeralEvents" ADD CONSTRAINT "funeralEvents_createByIdFk_fkey" FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funeralEvents" ADD CONSTRAINT "funeralEvents_updateByIdFk_fkey" FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorials" ADD CONSTRAINT "memorials_countryOfDeathIdFk_fkey" FOREIGN KEY ("countryOfDeathIdFk") REFERENCES "countries"("countryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorials" ADD CONSTRAINT "memorials_createByIdFk_fkey" FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorials" ADD CONSTRAINT "memorials_updateByIdFk_fkey" FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_createByIdFk_fkey" FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_updateByIdFk_fkey" FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_memorialIdFk_fkey" FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_createByIdFk_fkey" FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_updateByIdFk_fkey" FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_languageIdFk_fkey" FOREIGN KEY ("languageIdFk") REFERENCES "languages"("languageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorialRequestAdmin" ADD CONSTRAINT "memorialRequestAdmin_memorialIdFk_fkey" FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorialRequestAdmin" ADD CONSTRAINT "memorialRequestAdmin_applicantUserIdFk_fkey" FOREIGN KEY ("applicantUserIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorialRequestAdmin" ADD CONSTRAINT "memorialRequestAdmin_updateByIdFk_fkey" FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorialUserRelationship" ADD CONSTRAINT "memorialUserRelationship_memorialIdFk_fkey" FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorialUserRelationship" ADD CONSTRAINT "memorialUserRelationship_userIdFk_fkey" FOREIGN KEY ("userIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "securityQuestionUserAnswer" ADD CONSTRAINT "securityQuestionUserAnswer_securityQuestionsIdFk_fkey" FOREIGN KEY ("securityQuestionsIdFk") REFERENCES "security_questions"("securityQuestionsId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "securityQuestionUserAnswer" ADD CONSTRAINT "securityQuestionUserAnswer_userIdFk_fkey" FOREIGN KEY ("userIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "languages.code_unique" RENAME TO "languages_code_key";

-- RenameIndex
ALTER INDEX "memorials.url_unique" RENAME TO "memorials_url_key";

-- RenameIndex
ALTER INDEX "users.email_unique" RENAME TO "users_email_key";

-- RenameIndex
ALTER INDEX "users.socialUserId_unique" RENAME TO "users_socialUserId_key";
