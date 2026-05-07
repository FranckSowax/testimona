import express from 'express';
import { AdminDonationRoutes } from './admin/donation.route';
import { AdminMemorialRoutes } from './admin/memorial.route';
import { AuthRoutes } from './public/auth.route';
import { BiographyRoutes } from './public/biography.route';
import { ChapterRoutes } from './public/chapter.route';
import { CommonRoutesConfig } from './commons/common.route';
import { ConfigurationRoutes } from './commons/configuration.route';
import { DonationRoutes } from './public/donation.route';
import { FuneralEventRoutes } from './public/funeral-event.route';
// import { FuneralRoutes } from './funeral.route';
import { PhotoRoutes } from './public/photo.route';
import { MemorialRoutes } from './public/memorial.route';
import { TestRoutes } from './commons/test.route';
import { TestimonialRoutes } from './public/testimonial.route';
import { UserRoutes } from './public/user.route';


export class Routes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'Routes initialiaze');
  }

  configurationRoutes(): express.Application {
    // admin routes
    new AdminDonationRoutes(this.app);
    new AdminMemorialRoutes(this.app);

    // public routes
    new AuthRoutes(this.app);
    new BiographyRoutes(this.app);
    new ChapterRoutes(this.app);
    new ConfigurationRoutes(this.app);
    new DonationRoutes(this.app);
    new FuneralEventRoutes(this.app);
    // new FuneralRoutes(this.app);
    new MemorialRoutes(this.app);
    new PhotoRoutes(this.app);
    new TestimonialRoutes(this.app);
    new UserRoutes(this.app);

    // test routes
    new TestRoutes(this.app);

    return this.app;
  }
}
