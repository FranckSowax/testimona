import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import cryptoJs from 'crypto-js';
import { PrismaClient, UserRole } from '@prisma/client';

async function addAdminUser(prisma: PrismaClient, languages: { languageId: number; code: string }[]) {
  let privateKey = process.env.SECRET_PWD_KEY!;

  if (languages == undefined || languages == null) return;
  let languageFr = _.find(languages, (ite) => {
    return ite.code == 'fr';
  });
  if (languageFr == undefined || languageFr == null) return;
  let languageId = languageFr.languageId;

  let adminAlreadyInserted = await prisma.user.findMany({
    where: {
      role: UserRole.Admin
    },
    select: {
      nickname: true,
      firstname: true,
      lastname: true,
      email: true,
    },
  }).finally(() => prisma.$disconnect());

  let adminToAdd: {
    nickname: string,
    firstname: string,
    lastname: string,
    email: string,
  }[] = [];
  adminToAdd.push({
    nickname: 'administrator',
    firstname: 'administrator',
    lastname: 'administrator',
    email: 'administrator@testimona.com',
  });

  let adminAdded: {
    nickname: string,
    firstname: string,
    lastname: string,
    email: string,
  }[] = [];
  if (adminAlreadyInserted == null || adminAlreadyInserted.length == 0) {
    _.forEach(adminToAdd, async (item) => {
      await prisma.user.create({
        data: {
          userId: uuidv4(),
          email: item.email,
          password: cryptoJs.AES.encrypt(
            'administrator@testimona;administrator@testimona',
            privateKey,
          ).toString(),
          nickname: item.nickname,
          firstname: item.firstname,
          lastname: item.lastname,
          displayName: 'Nickname',
          languageIdFk: languageId,
          role: 'Admin',
          sex: 'Other',
          loginType: 'Site',
          disabled: false,
          activated: true
        },
      }).finally(() => prisma.$disconnect());
    });

    return adminToAdd;
  } else {
    adminAdded = adminToAdd.filter((ite) => { return adminAlreadyInserted.find((admin) => admin.email == ite.email) == undefined; });
    _.forEach(adminAdded, async (item) => {
      await prisma.user.create({
        data: {
          userId: uuidv4(),
          email: item.email,
          password: cryptoJs.AES.encrypt(
            'administrator@testimona;administrator@testimona',
            privateKey,
          ).toString(),
          nickname: item.nickname,
          firstname: item.firstname,
          lastname: item.lastname,
          displayName: 'Nickname',
          languageIdFk: languageId,
          role: 'Admin',
          sex: 'Other',
          loginType: 'Site',
          disabled: false,
          activated: true
        },
      }).finally(() => prisma.$disconnect());
    });

    return _.unionBy(_.concat(adminAlreadyInserted, adminAdded), ((ite) =>  { return ite.email}));
  }
}

export { addAdminUser };
