import express from 'express';
import { MemorialMiddleware } from '../../middlewares/memorial.middleware';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { CommonRoutesConfig } from '../commons/common.route';
import { TestimonialMiddleware } from '../../middlewares/testimonial.middleware';
import { TestimonialController } from '../../controllers/testimonial.controller';
import { CommonMiddlewares } from '../../middlewares/common/common.middleware';

export class TestimonialRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'TestimonialRoutes');
  }

  configurationRoutes(): express.Application {
    const jwtMiddleware = new JwtMiddleware();
    const commonMiddlewares = new CommonMiddlewares();
    const memorialMiddleware = new MemorialMiddleware();
    const testimonialMiddleware = new TestimonialMiddleware();
    const testimonialController = new TestimonialController();

    this.app.get('/testimonial/:memorialId/list', [
      jwtMiddleware.optionalJwt,
      memorialMiddleware.validateMemorialIdParameter,
      commonMiddlewares.validateUrlPaginationQuery,
      testimonialController.listByMemorialId
    ]);

    this.app.all('/testimonial', jwtMiddleware.validateJwt);
    this.app.all('/testimonial/*', jwtMiddleware.validateJwt);
    this.app.all('/testimonials/*', jwtMiddleware.validateJwt);

    this.app.get('/testimonials/mytestimonials', [
      testimonialController.getMyTestimonials
    ]);

    this.app.post('/testimonial/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      testimonialMiddleware.validateCreateTestimonialRequest,
      testimonialController.createWithMemorialId
    ]);

    this.app.get('/testimonial/:testimonialId/detail', [
      testimonialMiddleware.validateTestimonialIdParameter,
      testimonialController.get
    ]);

    this.app.put('/testimonial/:testimonialId', [
      testimonialMiddleware.validateTestimonialIdParameter,
      testimonialMiddleware.validateUpdateTestimonialRequest,
      testimonialController.update
    ]);

    this.app.put('/testimonial/:testimonialId/like', [
      testimonialMiddleware.validateTestimonialIdParameter,
      testimonialController.like
    ]);

    this.app.put('/testimonial/:testimonialId/unlike', [
      testimonialMiddleware.validateTestimonialIdParameter,
      testimonialController.unlike
    ]);

    this.app.delete('/testimonial/:testimonialId', [
      testimonialMiddleware.validateTestimonialIdParameter,
      testimonialController.delete
    ]);

    return this.app;
  }
}
