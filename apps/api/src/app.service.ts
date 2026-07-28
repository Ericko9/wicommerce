import { Injectable } from '@nestjs/common';
import { ApiResponse } from '@ucp/types';

@Injectable()
export class AppService {
  getHealth(): ApiResponse<{ status: string }> {
    return {
      success: true,
      message: 'UCP API is operational',
      data: { status: 'ok' },
      timestamp: new Date().toISOString(),
    };
  }
}
