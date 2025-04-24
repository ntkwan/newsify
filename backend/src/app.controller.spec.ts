import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let appController: AppController;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                {
                    provide: AppService,
                    useValue: {
                        getStatus: jest.fn().mockReturnValue({ status: 'ok' }),
                    },
                },
            ],
        }).compile();

        appController = app.get<AppController>(AppController);
    });

    describe('root', () => {
        it('should return status object', () => {
            const result = { status: 'ok' };
            expect(appController.getStatus()).toEqual(result);
        });
    });
});
