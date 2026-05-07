import { PrismaClient } from '@prisma/client';

import { addLanguages } from './data/language';
import { addCountries } from './data/country';
import { addSecurityQuestions } from './data/security-question';
import { addAdminUser } from './data/user';

const prisma = new PrismaClient();

async function main() {
  // Create English and French languages
  const languages = await addLanguages(prisma);
  console.log(languages);

  // Create Countries
  const countries = await addCountries(prisma);
  console.log(countries);

  // Create Admin user
  const administrators = await addAdminUser(prisma, languages);
  console.log(administrators);

  // Create Security Questions
  const securityQuestionsData = await addSecurityQuestions(prisma, administrators);
  console.log(securityQuestionsData);
}

main()
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.log('done');
    await prisma.$disconnect();
  });
