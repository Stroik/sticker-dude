# Sticker Dude

## What is this?

This is a simple project to create stickers for WhatsApp using [whatsapp-web.js](https://wwebjs.dev). It's free and easy to use.

## How to start

1. Clone the repo `git clone git@github.com:Stroik/sticker-dude.git`
2. Go to the project folder `cd sticker-dude`
3. Install dependencies `npm install` or `yarn install` or `pnpm install`
4. Set up your environment variables `cp .env.example .env` or just rename `.env.example` to `.env`
    - DATABASE_URL: This project uses [Prisma](https://www.prisma.io/) to manage the database. The example is using a sqlite database, but you can use any database supported by Prisma.
    - WEB_PATH: This path should be pointing to the based chromium browser **executable**. You can choose between [Chrome](https://www.google.com/chrome/), [Brave](https://brave.com/), [Edge](https://www.microsoft.com/es-es/edge/download?form=MA13FJ), [Opera](https://www.opera.com/), etc.
    - FFMPEG_PATH: Ffmpeg is used to convert any image, gif or video to sticker. It's used by [whatsapp-web.js](https://wwebjs.dev) to convert the media to a sticker. You can download it from [here](https://ffmpeg.org/download.html).
5. Run `npx prisma db push` to create the database schema.
6. Run `npm run dev` or `yarn dev` or `pnpm dev` to start the development server.
7. Check the terminal to see the QR link. The url base is https://quickchart.io/
8. Click on the link and scan the QR code with a phone/emulator
9. The terminal should show a message like `=== STICKER-DUDE IS READY ===`

## How it works

It's pretty simple. You have to send some image, gif or video to the **sticker-dude** and it will send you back a sticker. You can also send a sticker to the bot and it will send you back the same sticker.

![How it works from your phone](https://i.imgur.com/UNhAN5F.gif)
![How it works from Whatsapp Web](https://i.imgur.com/wtXMlSH.gif)