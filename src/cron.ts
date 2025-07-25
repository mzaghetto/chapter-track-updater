import cron from 'node-cron';
import { updateChaptersJob } from './jobs/updateChapters';
import { notifyUsersJob } from './jobs/notifyUsers';

const chapterUpdateCronSchedule = process.env.CRON_SCHEDULE || '* * * * *'; // Default to every minute
const notifyUsersCronSchedule = process.env.NOTIFY_CRON_SCHEDULE || '* * * * *'; // Default to every minute

cron.schedule(chapterUpdateCronSchedule, async () => {
  updateChaptersJob();
});

cron.schedule(notifyUsersCronSchedule, async () => {
  notifyUsersJob();
});