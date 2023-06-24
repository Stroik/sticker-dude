import User from './User';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class UserManager {
  public users: User[] = [];

  constructor() {
    this.users = [];
  }

  public async addUser(user: { phone: string; name: string; picture: string }) {
    const _user = new User({ phone: user.phone, name: user.name, picture: user.picture });
    this.users.push(_user);
    return _user;
  }

  public async getUser(phone: string) {
    const user = this.users.find((user) => user.phone === phone);
    return user;
  }

  public async getUserByPhone(phone: string) {
    const user = await prisma.user.findUnique({
      where: {
        phone: phone,
      },
    });

    if (!user) return undefined;

    const _user = new User({ phone: user.phone, name: user.name, picture: user.picture || '' });
    this.users.push(_user);
    return _user;
  }

  public async getUsers() {
    return this.users;
  }

  public async removeUser(phone: string) {
    const user = this.users.find((user) => user.phone === phone);
    if (user) {
      const index = this.users.indexOf(user);
      this.users.splice(index, 1);
      return user;
    }
    return undefined;
  }

  public async updateUser(user: User, data: { name?: string; picture?: string }) {
    if (!data) return;
    if (data) user.update(data);
    return user;
  }
}

const userManager = new UserManager();

export default userManager;
