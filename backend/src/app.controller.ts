import { Controller, Get, HttpCode } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @ApiOperation({ summary: 'Check the status of the server' })
    @ApiResponse({
        status: 200,
        description: 'Server is running',
        schema: {
            example: {
                status: 'ok',
            },
        },
    })
    @HttpCode(200)
    @Get()
    getStatus() {
        return this.appService.getStatus();
    }
}
