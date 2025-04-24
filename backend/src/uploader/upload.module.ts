import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AccessControlService } from '../ac/ac.service';

@Module({
    imports: [
        ConfigModule,
        MulterModule.register({
            storage: memoryStorage(),
        }),
    ],
    providers: [UploadService, AccessControlService],
    exports: [UploadService],
})
export class UploadModule {}
