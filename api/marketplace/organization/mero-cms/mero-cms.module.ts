import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { CommonModule } from '@src/common/common.module';
import { UserAppAccess, App } from '@src/database/entities';
import { LeadsModule } from '../mero-crm/src/modules/leads.module';
import { CmsPage } from './entities/cms-page.entity';
import { CmsPost } from './entities/cms-post.entity';
import { CmsMedia } from './entities/cms-media.entity';
import { CmsForm } from './entities/cms-form.entity';
import { CmsFormSubmission } from './entities/cms-form-submission.entity';
import { CmsSettings } from './entities/cms-settings.entity';
import { PagesService } from './services/pages.service';
import { PostsService } from './services/posts.service';
import { MediaService } from './services/media.service';
import { FormsService } from './services/forms.service';
import { SettingsService } from './services/settings.service';
import { PagesController } from './controllers/pages.controller';
import { PostsController } from './controllers/posts.controller';
import { MediaController } from './controllers/media.controller';
import { FormsController } from './controllers/forms.controller';
import { SettingsController } from './controllers/settings.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CmsPage,
            CmsPost,
            CmsMedia,
            CmsForm,
            CmsFormSubmission,
            CmsSettings,
            UserAppAccess,
            App,
        ]),
        MulterModule.register({ dest: './uploads/cms' }),
        CommonModule,
        LeadsModule,
    ],
    controllers: [
        PagesController,
        PostsController,
        MediaController,
        FormsController,
        SettingsController,
    ],
    providers: [
        PagesService,
        PostsService,
        MediaService,
        FormsService,
        SettingsService,
    ],
    exports: [
        PagesService,
        PostsService,
        MediaService,
        FormsService,
        SettingsService,
        TypeOrmModule,
    ],
})
export class MeroCmsModule {}
