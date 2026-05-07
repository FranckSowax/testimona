import _ from 'lodash';
import { PrismaClient } from '@prisma/client';

async function addLanguages(prisma: PrismaClient) {
    let languagesToAdd = ['en', 'fr'];

    let defaultLanguages = await prisma.language.findMany({
      select: {
        languageId: true,
        code: true,
      },
    }).finally(() => prisma.$disconnect());
  
    if (!defaultLanguages || defaultLanguages.length < languagesToAdd.length) {
      if (
        _.findIndex(defaultLanguages, (ite) => {
          return ite.code == 'en';
        }) == -1
      ) {
        const english = await prisma.language.create({
          data: {
            languageId: 1,
            code: 'en',
            label: 'English',
            disabled: false,
          },
        }).finally(() => prisma.$disconnect());
        defaultLanguages.push({
          languageId: english.languageId,
          code: english.code,
        });
      }
  
      if (
        _.findIndex(defaultLanguages, (ite) => {
          return ite.code == 'fr';
        }) == -1
      ) {
        const french = await prisma.language.create({
          data: {
            languageId: 2,
            code: 'fr',
            label: 'Français',
            disabled: false,
          },
        }).finally(() => prisma.$disconnect());
        defaultLanguages.push({
          languageId: french.languageId,
          code: french.code,
        });
      }
    }
  
    return defaultLanguages;
  }

  export {
      addLanguages
  }