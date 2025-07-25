import cron from 'node-cron';
import { updateChaptersJob } from './jobs/updateChapters';
import { notifyUsersJob } from './jobs/notifyUsers';
import { healthCheckJob } from './jobs/healthCheck';

const chapterUpdateCronSchedule = process.env.CRON_SCHEDULE || '* * * * *'; // Default to every minute
const notifyUsersCronSchedule = process.env.NOTIFY_CRON_SCHEDULE || '* * * * *'; // Default to every minute
const healthCheckCronSchedule = process.env.HEALTH_CHECK_CRON_SCHEDULE || '* * * * *'; // Default to every minute

// Schedule chapter update job
cron.schedule(chapterUpdateCronSchedule, async () => {
  updateChaptersJob();
});

// Schedule user notification job
cron.schedule(notifyUsersCronSchedule, async () => {
  notifyUsersJob();
});

// Schedule health check job
cron.schedule(healthCheckCronSchedule, async () => {
  healthCheckJob();
});
