/**
 * Feature: Autenticação de Usuários
 * Integração com backend Supabase Auth / Local Session
 */

import { eventBus } from '../../core/events.js';

export class AuthFeature {
  static getClient() {
    if (typeof window !== 'undefined' && window.SyncManager) {
      return window.SyncManager.client;
    }
    return null;
  }

  static obterUsuario() {
    if (typeof window !== 'undefined' && window.SyncManager) {
      return window.SyncManager.user;
    }
    return null;
  }

  static async login(email, password) {
    if (typeof window !== 'undefined' && window.SyncManager) {
      const res = await window.SyncManager.signIn(email, password);
      if (res && res.user) {
        eventBus.emit('auth:login', res.user);
      }
      return res;
    }
    throw new Error('Módulo de autenticação não inicializado.');
  }

  static async cadastrar(email, password) {
    if (typeof window !== 'undefined' && window.SyncManager) {
      const res = await window.SyncManager.signUp(email, password);
      if (res && res.user) {
        eventBus.emit('auth:cadastrado', res.user);
      }
      return res;
    }
    throw new Error('Módulo de autenticação não inicializado.');
  }

  static async recuperarSenha(email) {
    if (typeof window !== 'undefined' && window.SyncManager) {
      return await window.SyncManager.resetPassword(email);
    }
    throw new Error('Módulo de autenticação não inicializado.');
  }

  static async logout() {
    if (typeof window !== 'undefined' && window.SyncManager) {
      await window.SyncManager.signOut();
      eventBus.emit('auth:logout');
      return true;
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.AuthFeature = AuthFeature;
}
