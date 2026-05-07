// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  assetUrl: '/assets/images/',
  // apiUrl: 'http://localhost:3000', // local
  apiUrl: 'https://testimona-dev-api.onrender.com', // dev
  // apiUrl: 'https://testimona-staging-api.onrender.com', // staging
  donation: 'https://donate.stripe.com/test_fZedSJdICdn59Ak3cc',
  publicKey:
    'MIGJAoGBALc29T+zoPyzBL3o1pQKRGjAbBignCcB/QZaVw0kCRwldsxgmamoGDJ6jJuJxikjsuerArdEK2BFQa6wQrX9ErYnpdrXBNk2rQ0YO3fL469nlQEiONaGrgIBQHaHCv8avA4iV8bX0Y87KM78C0M1y9qAxL0r+4+ZJaTCf3ZZ8VTjAgMBAAE=',
  googleProvider: '352494277015-4403vml0f2qq6gmu9pgcqe4nmtgqr607.apps.googleusercontent.com',
};
