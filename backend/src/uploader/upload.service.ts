import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import type { Multer } from 'multer';

@Injectable()
export class UploadService {
    private s3: S3;

    constructor(private readonly configService: ConfigService) {
        this.s3 = new S3({
            endpoint: this.configService.get<string>('DO_SPACES_ENDPOINT'),
            accessKeyId: this.configService.get<string>('DO_SPACES_ACCESS_KEY'),
            secretAccessKey: this.configService.get<string>(
                'DO_SPACES_SECRET_KEY',
            ),
        });
    }

    async uploadFile(file: Multer.File, folderName: string): Promise<string> {
        try {
            const bucket = this.configService.get<string>('DO_SPACES_BUCKET');
            if (!bucket)
                throw new InternalServerErrorException(
                    'Bucket name is not configured',
                );

            const fileKey = `${folderName}/${uuidv4()}-${file.originalname}`;

            const params: S3.PutObjectRequest = {
                Bucket: bucket,
                Key: fileKey,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read',
            };

            await this.s3.upload(params).promise();

            return `https://${bucket}.${this.configService.get<string>('DO_SPACES_ENDPOINT').replace('https://', '')}/${fileKey}`;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message || error.code);
        }
    }
}
