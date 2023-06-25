import 'dotenv/config';

import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

import userManager from './UserManager';
import { timer } from '../utils/timer';

const prisma = new PrismaClient();

export interface IMessage {
  phone: string;
  message: string;
  userId: string;
  campaignId: string;
  media?: string | null;
}

export default class Whatsapp extends Client {
  public id: string | undefined;
  public me: string | undefined;
  public status: string | undefined;

  constructor(id: string) {
    super({
      authStrategy: new LocalAuth({
        clientId: `stickerdude-${id}`,
        dataPath: join(__dirname, '..', '..', 'database', 'bot-session'),
      }),
      ffmpegPath: `${process.env.FFMPEG_PATH}`,
      puppeteer: {
        headless: true,
        executablePath: `${process.env.WEB_PATH}`,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
        ],
      },
    });
    this.id = id;
    this.me = this.info !== undefined ? String(this.info.wid._serialized).replace('@c.us', '') : undefined;

    this.on('ready', () => {
      this.ready();
    });

    this.on('disconnected', () => {
      this.disconnected();
    });

    this.on('message', async (msg: Message) => {
      await this.onMessage(msg);
    });
  }

  private async ready() {
    this.status = 'READY';
    try {
      await prisma.whatsapp.update({
        where: {
          id: `stickerdude-${this.id}`,
        },
        data: {
          status: this.status,
        },
      });
      console.log('=== STICKER-DUDE IS READY ===');
    } catch (error) {
      console.log('READY', error);
    }
  }

  private async disconnected() {
    this.status = 'DISCONNECTED';
    try {
      await prisma.whatsapp.update({
        where: {
          id: `stickerdude-${this.id}`,
        },
        data: {
          status: this.status,
        },
      });
    } catch (error) {
      console.log('DISCONNECTED', error);
    }
  }

  public async init() {
    this.status = 'INITIALIZING';
    try {
      await prisma.whatsapp.upsert({
        where: {
          id: `stickerdude-${this.id}`,
        },
        update: {
          status: this.status,
        },
        create: {
          id: `stickerdude-${this.id}`,
          status: this.status,
        },
      });
    } catch (error) {
      this.status = 'INITIALIZING_ERROR';
      console.log('INITIALIZING', error);
    }
    await this.initialize();
    this.status = 'INITIALIZED';
    return this.status;
  }

  public async qrCode() {
    this.on('qr', async (qr: string) => {
      this.status = 'QR_SENT';
      const qrEncode = encodeURIComponent(qr);
      const url = `https://quickchart.io/qr?size=350&text=${qrEncode}`;

      console.log('=====================================================');
      console.log('Go to => ');
      console.log(url);
      console.log('and scan the QR code with a phone');
      console.log('=====================================================');
    });
  }

  public async sendMsg(message: IMessage) {
    try {
      if (this.info === undefined) throw new Error('NOT_READY');

      const { phone, message: text, media } = message;
      let mediaPath, mediaFile, response;
      if (media) {
        mediaPath = join(__dirname, '..', '..', '..', 'public', 'files', media);
        mediaFile = MessageMedia.fromFilePath(mediaPath);
      }

      if (mediaFile) {
        response = await this.sendMessage(`${phone}@c.us`, mediaFile, {
          caption: text,
        });
      } else {
        response = await this.sendMessage(`${phone}@c.us`, text);
      }

      if (response) {
        console.log('SEND_MSG', response.id._serialized);
      } else {
        throw new Error('SEND_MSG_ERROR ' + phone);
      }
    } catch (error) {
      console.log('SEND_MSG', error);
    }
  }

  private async onMessage(message: Message) {
    const { from, body } = message;

    const phone = from.replace('@c.us', '') || from;
    const chat = await message.getChat();

    if (chat.isGroup) return;

    const contact = await chat.getContact();
    const profilePicUrl = await contact.getProfilePicUrl();

    if (body.startsWith('!dame')) {
      const splitted = body.split(' ');
      const amount = Number(splitted[1]);
      const phoneToCharge = splitted[2];

      await this.addToken(phoneToCharge, amount);
      await chat.sendMessage(`Le diste ${amount} tokens a ${phoneToCharge}`);
      return;
    }

    let user = await userManager.getUserByPhone(phone);
    if (!user) {
      user = await userManager.addUser({
        phone,
        name: contact.pushname,
        picture: profilePicUrl,
      });

      await user.welcome(chat);
      return;
    }

    if (body.startsWith('!tokens')) {
      const tokens = await user.getTokens();
      await chat.sendMessage(`Tenes ${tokens} tokens`);
      return;
    }

    user.saveMessage(body, message.hasMedia);

    if (message.hasMedia) {
      const userTokens = (await user.getTokens()) || 0;
      if (userTokens < 1) {
        await chat.sendMessage(
          '*Se acabó lo que se daba.*\nYa no tenés tokens disponibles. Tirame unos pesitos acá https://sticker-dude.fun\n\nUn token = un flynn paff'
        );
        return;
      }

      await user.spendTokens(1);

      const media = await message.downloadMedia();

      await chat.sendStateTyping();
      await timer(2500);
      await chat.clearState();

      await chat.sendMessage(media, {
        sendMediaAsSticker: true,
        stickerAuthor: 'https://sticker-dude.fun',
        stickerName: 'StickerDude',
        stickerCategories: ['StickerDude'],
      });

      await chat.sendStateTyping();
      await timer(2500);
      await chat.clearState();

      const remainingTokens = (await userTokens) - 1;

      if (remainingTokens === 0) {
        await chat.sendMessage('Te quedaste sin tokens pa. Tirame unos pesitos, dale.\nhttps://sticker-dude.fun');
        await chat.delete();
        return;
      }

      await chat.sendMessage(`Te quedan ${remainingTokens} tokens`);
      await chat.delete();
    }
    if (!message.hasMedia && body.length > 0) {
      await message.react('🚬');
      await chat.delete();
    }
    return;
  }

  private async addToken(phone: string, token: number) {
    try {
      const moreTokens = await prisma.tokens.upsert({
        where: {
          userId: phone as string,
        },
        update: {
          count: {
            increment: token,
          },
        },
        create: {
          userId: phone as string,
          count: token,
        },
      });
      if (moreTokens) return true;
    } catch (error) {
      console.log('ADD_TOKEN', error);
    }
  }
}
