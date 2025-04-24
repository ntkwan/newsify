import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
@Injectable()
export class AppService {
    constructor(private sequelize: Sequelize) {}

    async getStatus() {
        try {
            await this.sequelize.authenticate();
            return {
                status: 'ok',
            };
        } catch (error: any) {
            return {
                statusCode: 500,
                error: error.message,
            };
        }
    }
}
