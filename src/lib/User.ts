import { PrismaClient } from '@prisma/client';
import { Chat } from 'whatsapp-web.js';
import { timer } from '../utils/timer';

interface IUser {
  name?: string | undefined;
  phone: string;
  picture?: string | undefined;
}

const prisma = new PrismaClient();

export default class User {
  public name: string | undefined;
  public phone: string;
  public picture: string | undefined;

  constructor({ name, phone, picture }: IUser) {
    this.name = name || '';
    this.phone = phone || '';
    this.picture = picture || '';

    const check = async () => {
      const user = await prisma.user.findUnique({
        where: {
          phone: this.phone,
        },
      });

      if (!user) return this.firstSave();
    };
    if (this.phone !== '') check();
  }

  public async firstSave() {
    try {
      const user = await prisma.user.upsert({
        where: {
          phone: this.phone,
        },
        update: {
          name: this.name,
          phone: this.phone,
          picture: this.picture,
        },
        create: {
          name: this.name || '',
          phone: this.phone || '',
          picture: this.picture,
        },
      });

      const tokens = await prisma.tokens.create({
        data: {
          userId: this.phone,
          count: 5,
        },
      });

      if (!tokens) return console.log('FIRSTSAVE_ERROR:CANNOT_CREATE_TOKENS');

      return user;
    } catch (error) {
      console.log(error);
    }
  }

  public async save(phone: string) {
    try {
      const user = await prisma.user.upsert({
        where: {
          phone: this.phone || phone,
        },
        update: {
          name: this.name,
          phone: this.phone,
          picture: this.picture,
        },
        create: {
          name: this.name || '',
          phone: this.phone || '',
          picture: this.picture,
        },
      });
      return user;
    } catch (error) {
      console.log(error);
    }
  }

  public async update(data: { name?: string; picture?: string }) {
    try {
      const user = await prisma.user.update({
        where: {
          phone: this.phone,
        },
        data: {
          name: data.name,
          picture: data.picture,
        },
      });
      return user;
    } catch (error) {
      console.log(error);
    }
  }

  public async saveMessage(content: string, media: boolean) {
    try {
      const message = await prisma.message.create({
        data: {
          content: content || '',
          media: media,
          userId: this.phone,
        },
      });

      return message;
    } catch (error) {
      console.log(error);
    }
  }

  public async getTokens() {
    try {
      const tokens = await prisma.tokens.findUnique({
        where: {
          userId: this.phone,
        },
      });
      if (!tokens) throw new Error('Tokens not found');

      return tokens.count;
    } catch (error) {
      console.log(error);
    }
  }

  public async updateTokens(count: number) {
    try {
      const tokens = await prisma.tokens.update({
        where: {
          userId: this.phone,
        },
        data: {
          count: count,
        },
      });
      if (!tokens) throw new Error('Tokens not found');

      return tokens.count;
    } catch (error) {
      console.log(error);
    }
  }

  public async spendTokens(count: number) {
    try {
      const tokens = await prisma.tokens.upsert({
        where: {
          userId: this.phone,
        },
        update: {
          count: {
            decrement: count,
          },
        },
        create: {
          userId: this.phone,
          count: 100,
        },
      });

      if (!tokens) throw new Error('Tokens not found');

      return tokens.count;
    } catch (error) {
      console.log(error);
    }
  }

  public async welcome(chat: Chat) {
    try {
      await chat.sendStateTyping();
      await timer(4000);
      await chat.clearState();

      await chat.sendMessage(
        `Que hacés ${this.name}! Cuchá, la cosa es simple:\nVos me mandás *imágenes, gifs o videos cortos* y yo te devuelvo un sticker.\nCada sticker sale 1 token. Te regalo 5 token, probá y si te sirve hablamos`
      );

      await chat.sendStateTyping();
      await timer(4000);
      await chat.clearState();

      await chat.sendMessage('Se te acreditaron: *5 tokens*');

      await chat.delete();
      return;
    } catch (error) {
      console.log(error);
    }
  }
}
