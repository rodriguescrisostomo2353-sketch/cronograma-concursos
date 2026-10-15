/**
 * Feature: Autenticação de Usuários em TypeScript
 * Integração com backend C# ASP.NET Core Web API / Local Session
 */

import { eventBus } from '../../core/events';

export class AuthFeature {
  public static getClient(): any {
    if (typeof window !== 'undefined' && (window as any).SyncManager) {
      return (window as any).SyncManager.client;
    }
    return null;
  }

  public static obterUsuario(): any {
    if (typeof window !== 'undefined' && (window as any).SyncManager) {
      return (window as any).SyncManager.user;
    }
    return null;
  }

  public static async login(email: string, password: string): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).SyncManager) {
      const res = await (window as any).SyncManager.signIn(email, password);
      if (res && res.user) {
        eventBus.emit('auth:login', res.user);
      }
      return res;
    }
    throw new Error('Módulo de autenticação não inicializado.');
  }

  public static async cadastrar(email: string, password: string): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).SyncManager) {
      const res = await (window as any).SyncManager.signUp(email, password);
      if (res && res.user) {
        eventBus.emit('auth:cadastrado', res.user);
      }
      return res;
    }
    throw new Error('Módulo de autenticação não inicializado.');
  }

  public static async recuperarSenha(email: string): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).SyncManager) {
      return await (window as any).SyncManager.resetPassword(email);
    }
    throw new Error('Módulo de autenticação não inicializado.');
  }

  public static async logout(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).SyncManager) {
      await (window as any).SyncManager.signOut();
      eventBus.emit('auth:logout');
      return true;
    }
    return false;
  }
}

declare global {
  interface Window {
    AuthFeature?: typeof AuthFeature;
    SyncManager?: any;
  }
}

if (typeof window !== 'undefined') {
  window.AuthFeature = AuthFeature;
}
