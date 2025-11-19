import { Injectable } from '@nestjs/common';
import { Cron, Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  // Runs every minute at 45 seconds
  @Cron('45 * * * * *')
  handleCron() {
    // console.log('Called every minute at 45 seconds');
  }

  // Runs every 10 seconds
  @Interval(10000)
  handleInterval() {
    // console.log('Called evergy 10 seconds');
  }

  // Runs once after 5 seconds
  @Timeout(5000)
  handleTimeout() {
    // todo uncomment to enable logging
    // console.log('Called once after 5 seconds');
  }
}