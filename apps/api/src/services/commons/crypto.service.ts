import { LogTypeError } from '@prisma/client';
import cryptoJs from 'crypto-js';
import bcrypt from 'bcrypt';
import { ErrorServiceModel } from '../../models/_.models';
import { LogService } from './log.service';

const serviceName = 'CryptoService';
const BCRYPT_SALT_ROUNDS = 12;

export class CryptoService {
  private static _instance: CryptoService;

  static getInstance(): CryptoService {
    if (!CryptoService._instance) {
      CryptoService._instance = new CryptoService();
    }
    return CryptoService._instance;
  }

  constructor() {}

  // --- Password hashing with bcrypt (secure, one-way) ---

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    } catch (error: any) {
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'hashPassword', {}),
        error.message,
      );
      throw error;
    }
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error: any) {
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'verifyPassword', {}),
        error.message,
      );
      throw error;
    }
  }

  // --- Legacy AES decryption (for frontend transport decryption & migration) ---

  async decryptFromFrontend(encryptedText: string, key: string): Promise<string> {
    try {
      return cryptoJs.AES.decrypt(encryptedText, key).toString(cryptoJs.enc.Utf8);
    } catch (error: any) {
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'decryptFromFrontend', {}),
        error.message,
      );
      throw error;
    }
  }

  // --- Legacy AES decryption for stored passwords (migration only) ---

  async decryptLegacyPassword(encryptedPassword: string, key: string): Promise<string> {
    try {
      return cryptoJs.AES.decrypt(encryptedPassword, key).toString(cryptoJs.enc.Utf8);
    } catch (error: any) {
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'decryptLegacyPassword', {}),
        error.message,
      );
      throw error;
    }
  }

  /**
   * Check if a stored password is in legacy AES format (not bcrypt).
   * Bcrypt hashes always start with "$2b$" or "$2a$".
   */
  isLegacyPassword(storedPassword: string): boolean {
    return !storedPassword.startsWith('$2b$') && !storedPassword.startsWith('$2a$');
  }

  // --- Answer encryption (kept as AES for now, answers are not passwords) ---

  async encryptAnswer(answer: string, key: string): Promise<string> {
    try {
      return cryptoJs.AES.encrypt(answer, key).toString();
    } catch (error: any) {
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'encryptAnswer', {}),
        error.message,
      );
      throw error;
    }
  }

  async decryptAnswer(answer: string, key: string): Promise<string> {
    try {
      return cryptoJs.AES.decrypt(answer, key).toString(cryptoJs.enc.Utf8);
    } catch (error: any) {
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'decryptAnswer', {}),
        error.message,
      );
      throw error;
    }
  }
}
