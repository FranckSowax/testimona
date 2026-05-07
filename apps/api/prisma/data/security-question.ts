import _ from 'lodash';
import { PrismaClient } from '@prisma/client';

async function addSecurityQuestions(
  prisma: PrismaClient,
  administrators:
    | {
        email: string;
        firstname: string | null;
        lastname: string | null;
        nickname: string;
      }[]
    | undefined,
) {
  // Get the admin user
  if (administrators == undefined || administrators == null) return;
  const adminUser = _.find(administrators, (ite) => {
    return ite.email == 'administrator@testimona.com';
  });
  await prisma.user.findMany(); // need this line but why ???? I don't know
  const adminUserId = await prisma.user
    .findFirst({
      where: {
        email: adminUser?.email,
      },
      select: {
        userId: true,
      },
    })
    .finally(() => prisma.$disconnect());
  if (adminUserId == null || adminUserId == undefined) return;

  let securityQuestionToAdd: {
    securityQuestionsId: number;
    contentKey: string;
    createByIdFk: string;
  }[] = [];
  securityQuestionToAdd.push(
    {
      securityQuestionsId: 1,
      contentKey: 'Question_1',
      createByIdFk: adminUserId.userId,
    },
    {
      securityQuestionsId: 2,
      contentKey: 'Question_2',
      createByIdFk: adminUserId.userId,
    },
    {
      securityQuestionsId: 3,
      contentKey: 'Question_3',
      createByIdFk: adminUserId.userId,
    },
    {
      securityQuestionsId: 4,
      contentKey: 'Question_4',
      createByIdFk: adminUserId.userId,
    },
    {
      securityQuestionsId: 5,
      contentKey: 'Question_5',
      createByIdFk: adminUserId.userId,
    },
    {
      securityQuestionsId: 6,
      contentKey: 'Question_6',
      createByIdFk: adminUserId.userId,
    },
    {
      securityQuestionsId: 7,
      contentKey: 'Question_7',
      createByIdFk: adminUserId.userId,
    },
    {
      securityQuestionsId: 8,
      contentKey: 'Question_8',
      createByIdFk: adminUserId.userId,
    },
    {
      securityQuestionsId: 9,
      contentKey: 'Question_9',
      createByIdFk: adminUserId.userId,
    },
    {
      securityQuestionsId: 10,
      contentKey: 'Question_10',
      createByIdFk: adminUserId.userId,
    },
    {
      securityQuestionsId: 11,
      contentKey: 'Question_11',
      createByIdFk: adminUserId.userId,
    },
    {
      securityQuestionsId: 12,
      contentKey: 'Question_12',
      createByIdFk: adminUserId.userId,
    },
  );

  let securityQuestionAlreadyInserted = await prisma.securityQuestion
    .findMany({
      select: {
        securityQuestionsId: true,
        contentKey: true,
        createByIdFk: true,
      },
    })
    .finally(() => prisma.$disconnect());

  let securityQuestionAdded: {
    securityQuestionsId: number;
    contentKey: string;
    createByIdFk: string;
  }[] = [];
  if (
    securityQuestionAlreadyInserted == null ||
    securityQuestionAlreadyInserted.length == 0
  ) {
    await prisma.securityQuestion
      .createMany({
        data: securityQuestionToAdd,
      })
      .finally(() => prisma.$disconnect());
    return securityQuestionToAdd;
  } else {
    securityQuestionAdded = securityQuestionToAdd.filter(
      (ite) => !securityQuestionAlreadyInserted.some((iteAl) => iteAl.securityQuestionsId == ite.securityQuestionsId),
    );
    await prisma.securityQuestion
      .createMany({
        data: securityQuestionAdded,
      })
      .finally(() => prisma.$disconnect());
    return _.uniqBy(
      _.concat(securityQuestionAlreadyInserted, securityQuestionAdded),
      (ite) => {
        return ite.securityQuestionsId;
      },
    );
  }
}

export { addSecurityQuestions };
