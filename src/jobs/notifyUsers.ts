import { prisma } from '../lib/prisma';
import { TelegramService } from '../services/telegramService';
import { NotificationChannel } from '@prisma/client';

const telegramService = new TelegramService();

export async function notifyUsersJob() {
  console.log('Running user notification job');
  const sentNotifications: { userId: bigint; manhwaTitle: string; newEpisode: number; channel: string; }[] = [];

  const allUserManhwas = await prisma.userManhwa.findMany({
    include: {
      user: true,
      manhwa: {
        include: {
          manhwaProviders: true,
        },
      },
    },
  });

  for (const userManhwa of allUserManhwas) {
    const latestEpisodeReleased = Math.max(...userManhwa.manhwa.manhwaProviders.map(mp => mp.lastEpisodeReleased || 0));

    if (latestEpisodeReleased > (userManhwa.lastNotifiedEpisode || 0)) {
      const userNotifications = await prisma.userNotifications.findMany({
        where: {
          userId: userManhwa.userId,
          manhwaId: userManhwa.manhwaId,
          isEnabled: true,
        },
      });

      for (const userNotification of userNotifications) {
        if (userNotification.channel === NotificationChannel.TELEGRAM) {
          if (userManhwa.user.telegramId && userManhwa.user.telegramActive) {
            const message = `New episode of *${userManhwa.manhwa.name}* is out! Episode *${latestEpisodeReleased}* is now available.`;
            try {
              await telegramService.sendMessage(userManhwa.user.telegramId, message);
              sentNotifications.push({
                userId: userManhwa.userId,
                manhwaTitle: userManhwa.manhwa.name,
                newEpisode: latestEpisodeReleased,
                channel: 'TELEGRAM',
              });
            } catch (error) {
              console.error(`Failed to send Telegram notification to user ${userManhwa.userId} for manhwa ${userManhwa.manhwa.name}:`, error);
            }
          }
        }
        // Add other notification channels here (e.g., EMAIL, WEBSITE, PUSH)
      }

      await prisma.userManhwa.update({
        where: { id: userManhwa.id },
        data: { lastNotifiedEpisode: latestEpisodeReleased },
      });
    }
  }
  return sentNotifications;
}