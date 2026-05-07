-- CreateEnum
CREATE TYPE "AuthenticationMode" AS ENUM ('Facebook', 'Google', 'Site');

-- CreateEnum
CREATE TYPE "DisplayName" AS ENUM ('NicknameFirstnameLastname', 'Nickname', 'FirstnameLastname');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other', 'NotSpecified');

-- CreateEnum
CREATE TYPE "LogTypeError" AS ENUM ('Debug', 'Error', 'Info', 'Log', 'Warn');

-- CreateEnum
CREATE TYPE "MemorialRequestAdminStatus" AS ENUM ('Pending', 'Done', 'Deleted');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('Page', 'Testimonial');

-- CreateEnum
CREATE TYPE "Relative" AS ENUM ('Parent', 'Spouse', 'Partner', 'Child', 'Relative', 'Friend', 'Colleague', 'Other', 'DoNotWishToDisclose');

-- CreateEnum
CREATE TYPE "SendNotificationType" AS ENUM ('Email', 'Notification', 'EmailAndNotification', 'NotSpecified');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Admin', 'Relatives', 'User');

-- CreateTable
CREATE TABLE "countries" (
    "countryId" INTEGER NOT NULL,
    "code" VARCHAR(5) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "flag" VARCHAR(50) NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("countryId")
);

-- CreateTable
CREATE TABLE "languages" (
    "languageId" INTEGER NOT NULL,
    "code" VARCHAR(5) NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled" BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY ("languageId")
);

-- CreateTable
CREATE TABLE "logs" (
    "LogId" SERIAL NOT NULL,
    "Type" "LogTypeError" NOT NULL,
    "Info" JSON NOT NULL,
    "Error" JSON NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("LogId")
);

-- CreateTable
CREATE TABLE "security_questions" (
    "securityQuestionsId" INTEGER NOT NULL,
    "contentKey" VARCHAR(300) NOT NULL,
    "createByIdFk" TEXT NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("securityQuestionsId")
);

-- CreateTable
CREATE TABLE "memorials" (
    "memorialId" SERIAL NOT NULL,
    "url" VARCHAR(300) NOT NULL,
    "firstname" VARCHAR(100) NOT NULL,
    "lastname" VARCHAR(100) NOT NULL,
    "yearOfBirth" INTEGER NOT NULL DEFAULT 0,
    "monthOfBirth" INTEGER NOT NULL DEFAULT 0,
    "dayOfBirth" INTEGER NOT NULL DEFAULT 0,
    "countryOfBirthIdFk" INTEGER,
    "cityOfBirth" VARCHAR(100),
    "yearOfDeath" INTEGER NOT NULL DEFAULT 0,
    "monthOfDeath" INTEGER NOT NULL DEFAULT 0,
    "dayOfDeath" INTEGER NOT NULL DEFAULT 0,
    "countryOfDeathIdFk" INTEGER NOT NULL,
    "cityOfDeath" VARCHAR(100),
    "shortBiography" VARCHAR(500),
    "createByIdFk" TEXT NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateByIdFk" TEXT NOT NULL,
    "updateAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("memorialId")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "testimonialId" SERIAL NOT NULL,
    "memorialIdFk" INTEGER NOT NULL,
    "content" VARCHAR(5000) NOT NULL,
    "relationship" "Relative" NOT NULL,
    "createByIdFk" TEXT NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateByIdFk" TEXT NOT NULL,
    "updateAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("testimonialId")
);

-- CreateTable
CREATE TABLE "users" (
    "userId" TEXT NOT NULL,
    "socialUserId" VARCHAR(50),
    "nickname" VARCHAR(50) NOT NULL,
    "firstname" VARCHAR(50),
    "lastname" VARCHAR(50),
    "maidenname" VARCHAR(50),
    "displayName" "DisplayName" NOT NULL,
    "address" VARCHAR(100),
    "apartment" VARCHAR(10),
    "city" VARCHAR(50),
    "postalCode" VARCHAR(50),
    "province" VARCHAR(50),
    "country" VARCHAR(5),
    "birthdate" DATE,
    "placeOfBirth" VARCHAR(50),
    "phone" VARCHAR(20),
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(100),
    "passwordTmp" VARCHAR(50),
    "sex" "Gender",
    "languageIdFk" INTEGER NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT E'User',
    "sendNotificationType" "SendNotificationType" NOT NULL DEFAULT E'EmailAndNotification',
    "loginType" "AuthenticationMode" NOT NULL,
    "dataLoginFromOther" JSON,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "disabled" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "memorialRequestAdmin" (
    "memorialRequestAdminId" SERIAL NOT NULL,
    "memorialIdFk" INTEGER NOT NULL,
    "applicantUserIdFk" TEXT NOT NULL,
    "relationship" "Relative" NOT NULL,
    "note" VARCHAR(500) NOT NULL,
    "status" "MemorialRequestAdminStatus" NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateByIdFk" TEXT NOT NULL,
    "updateAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("memorialRequestAdminId")
);

-- CreateTable
CREATE TABLE "memorialUserRelationship" (
    "memorialIdFk" INTEGER NOT NULL,
    "userIdFk" TEXT NOT NULL,
    "relationship" "Relative" NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("memorialIdFk","userIdFk")
);

-- CreateTable
CREATE TABLE "securityQuestionUserAnswer" (
    "securityQuestionsIdFk" INTEGER NOT NULL,
    "userIdFk" TEXT NOT NULL,
    "answer" VARCHAR(50) NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("securityQuestionsIdFk","userIdFk")
);

-- CreateIndex
CREATE UNIQUE INDEX "languages.code_unique" ON "languages"("code");

-- CreateIndex
CREATE UNIQUE INDEX "memorials.url_unique" ON "memorials"("url");

-- CreateIndex
CREATE UNIQUE INDEX "users.socialUserId_unique" ON "users"("socialUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users.email_unique" ON "users"("email");

-- AddForeignKey
ALTER TABLE "security_questions" ADD FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorials" ADD FOREIGN KEY ("countryOfBirthIdFk") REFERENCES "countries"("countryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorials" ADD FOREIGN KEY ("countryOfDeathIdFk") REFERENCES "countries"("countryId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorials" ADD FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorials" ADD FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD FOREIGN KEY ("languageIdFk") REFERENCES "languages"("languageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorialRequestAdmin" ADD FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorialRequestAdmin" ADD FOREIGN KEY ("applicantUserIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorialRequestAdmin" ADD FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorialUserRelationship" ADD FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorialUserRelationship" ADD FOREIGN KEY ("userIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "securityQuestionUserAnswer" ADD FOREIGN KEY ("securityQuestionsIdFk") REFERENCES "security_questions"("securityQuestionsId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "securityQuestionUserAnswer" ADD FOREIGN KEY ("userIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
