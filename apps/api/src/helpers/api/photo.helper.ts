import { MediaObjectType } from '@prisma/client';
import * as Constantes from '../constantes/_.constantes';

export class PhotoHelpers {
  static getUploadingSettings(objectId: number, objectType: MediaObjectType): { directory: string, tags: string[]} {
    let folder = '';
    let tags = '';

    switch(objectType) {
      case MediaObjectType.Chapter:
        folder = 'chapter';
        tags = 'chapter';
        break;
      case MediaObjectType.MemorialBackground:
        folder = 'memorial';
        tags = 'memorial_background';
        break;
      case MediaObjectType.MemorialProfile:
        folder = 'memorial';
        tags = 'memorial_profile'
        break;
      case MediaObjectType.Photo:
        folder = 'photo';
        tags = 'photo'
        break;
      case MediaObjectType.Testimonial:
        folder = 'testimonial';
        tags = 'testimonial'
        break;
    }

    return {
      directory: `${Constantes.Environment}/${folder}/${objectId}`,
      tags: tags.split(',')
    };
  }
}
