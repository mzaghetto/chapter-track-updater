# Chapter Track Updater TODO

- [X] **Project Setup**
    - [X] Create a new directory named `chapter-track-updater`.
    - [X] Initialize a new Node.js project with `npm init`.
    - [X] Install necessary dependencies: `typescript`, `ts-node`, `axios`, `cheerio`, `node-cron`, `dotenv`.
    - [X] Set up a basic project structure with `src`, `dist` directories.
    - [X] Create a `tsconfig.json` file.

- [X] **Database Integration**
    - [X] Copy the `prisma` directory from `manga-to-read-api-typescript` to the new project.
    - [X] Add a script to generate the Prisma client.
    - [X] Create a module to initialize and export the Prisma client.

- [X] **Scraping Logic**
    - [X] Create a `scraper.ts` module.
    - [X] Implement a function to fetch HTML from a URL, using `axios`.
    - [X] Implement a function to extract the latest chapter number using `cheerio` and CSS selectors.
    - [X] Add support for using a proxy for Cloudflare-protected sites.

- [X] **Provider System**
    - [X] Define a `Provider` interface with properties for name, URL, and CSS selectors.
    - [X] Create a configuration file for providers.
    - [X] Modify the scraper to use the provider's selectors.

- [X] **Chapter Update Cron Job**
    - [X] Create a `cron.ts` module.
    - [X] Set up a `node-cron` task to run at a specified interval (configurable via .env).
    - [X] The cron job should:
        - Fetch all manhwas from the database.
        - For each manhwa, call the scraper to get the latest chapter.
        - Update the `lastEpisodeReleased` in the database if the new chapter is different.
    - [X] Create a route to trigger the chapter update job manually.
    - [X] Return a response with updated manhwas.

- [ ] **Notification Cron Job**
    - [ ] Create a `notifyUsersJob.ts` module in `src/jobs`.
    - [ ] This job should:
        - Find `ManhwaProvider` entries where `lastEpisodeReleased` is greater than `UserManhwa.lastNotifiedEpisode` for any user.
        - For each such `ManhwaProvider` and `UserManhwa` combination:
            - Fetch `UserNotifications` for that user and manhwa.
            - If Telegram notification is enabled and user has `telegramId` and `telegramActive`:
                - Send Telegram message using a new `TelegramService` in `chapter-track-updater`.
            - Update `UserManhwa.lastNotifiedEpisode` to the `ManhwaProvider.lastEpisodeReleased`.
    - [ ] Add a new cron schedule for this job (configurable via .env).

- [ ] **Telegram Service Integration**
    - [ ] Create a `telegramService.ts` in `src/services`.
    - [ ] Implement `sendMessage` method similar to the one in `manga-to-read-api-typescript`.
    - [ ] Ensure `TELEGRAM_BOT_TOKEN` is available via `.env`.

- [ ] **Notification Trigger Route**
    - [ ] Add a new route (e.g., `/trigger-notifications`) to `src/server.ts`.
    - [ ] This route should call `notifyUsersJob` and return a summary of sent notifications.

- [ ] **Error Handling and Logging**
    - [ ] Enhance error handling and logging for the notification job.

- [ ] **Deployment**
    - [ ] Update Dockerfile if necessary (e.g., new environment variables).
    - [ ] Update `docker-compose.yml` if necessary.