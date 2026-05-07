import express from 'express';

export class TestController {
  async close(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    return res.sendStatus(200);
  }

  async addUserId(req: express.Request,
    res: express.Response,
    next: express.NextFunction,) {
    
    req.body.userId = '4bafe1bd-7ff4-4c90-a718-8fb8cea08043';

    return next();
  }
}
