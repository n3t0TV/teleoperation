const db = require('../modules/Database.js');
const bcrypt = require('bcryptjs');

class Profile {
    /**
       *
       * @param {string} profileName Profile name
       * @returns {Profile}
       */
    static async create (profileName) {
      const result = await db.call('PROFILE_CREATE', profileName);
      if (result[0].error) {
        return false;
      }
      return new Profile(result[0]);
    }
  
    /**
       *
       * @param {string} profileId
       * @returns {object}
       */
    static async remove (profileId) {
      const result = await db.call('PROFILE_DELETE', profileId);
      if (result.length >= 1 && !result[0].success) {
        return { success: false, users: result };
      }
      return { success: true };
    }
  
    /**
       *
       * @param {string} profileId
       * @returns {(Profile|boolean)} Profile
       */
    static async getProfile (profileId) {
      const result = await db.call('PROFILE_GET', profileId);
      if (!result[0]) return false;
      const profile = new Profile(result[0]);
      await profile.listPermissions();
      return profile;
    }
  
    /**
       *
       * @returns Array
       */
    static async list () {
      const result = await db.call('PROFILE_LIST');
      return result;
    }
  
    constructor (profileData, permissions = {}) {
      this.profileId = profileData.user_profile;
      this.name = profileData.profile_name;
      this.permissions = permissions;
    }
  
    async getPermission (profileName) {
      const result = await db.call('PROFILE_GET_PERMISSION', this.profileId, profileName);
      return result;
    }
  
    async savePermissions (permissions) {
      await db.call('PROFILE_CLEAR_PERMISSIONS', this.profileId);
      for (const row of permissions) {
        await db.call('PROFILE_SET_PERMISSION', this.profileId, row.permission, row.pos, row.val, row.low, row.high);
      }
      return true;
    }
  
    async checkPermission (profileName) {
      const result = await db.call('PROFILE_CHECK_PERMISSION', this.profileId, profileName);
      return result[0].allowed;
    }
  
    async listPermissions () {
      this.permissions = {}
      const result = await db.call('PROFILE_LIST_PERMISSIONS', this.profileId);
      for (const permissionRow of result) {
        this.permissions[permissionRow.permission] = permissionRow;
      }
      return result;
    }
  }

class User {
    /**
       *
       * @param {string} email
       * @param {string} password
       * @param {string} profile
       * @param {string} name
       * @returns {User}
       */
    static async create (email, password, profile, name) {
      const hash = bcrypt.hashSync(password, 10);
      const result = await db.call('USER_CREATE', email, hash, profile, name);
      if (result[0].error) {
        return false;
      }
      return new User(result[0]);
    }
  
    /**
       *
       * @returns Array
       */
    static async addUser (data) {
      const result = await db.call('AGREGAR_NUEVO_USUARIO', data.email, data.user, data.password, data.profile);
      return result;
    }
  
    /**
       *
       * @returns Array
       */
    static async updatePass (id, pass) {
      const result = await db.call('UPDATE_PASSWORD', id, pass);
      return result;
    }
  
    /**
       *
       * @returns Array
       */
    static async list () {
      const result = await db.call('USER_LIST');
      return result;
    }
  
    /**
       *
       * @returns Array
       */
    static async getUserById (id) {
      const result = await db.call('GET_USER_BY_ID', id);
      return result[0];
    }
  
    /**
       *
       * @param {string} user_id
       * @returns {User}
       */
    static async getUser (user_id) {
      const result = await db.call('USER_GET', user_id);
      if (result[0]) {
        return new User(result[0]);
      }
      return false
    }
  
    /**
       *
       * @param { string } user_id
       * @returns {User}
       */
    static async getUserByEmail (email) {
      const result = await db.call('USER_GET_BY_EMAIL', email);
      console.log("USER_GET_BY_EMAIL");
      console.log(result);
      if (result[0]) {
        return new User(result[0]);
      }
      return false
    }

    static async callGetCredentialsByEmail (email) {
      const result = await db.call('DELIVERY_GET_CREDENTIALS_BY_EMAIL', email);
      if (result) return result[0];
      return result;
    }

    static async updateLoginStatus(userId, status){
      console.log(userId, status);
      const result = await db.call('UPDATE_LOGIN_STATUS', userId, status);
      console.log(result);
    };
  
    constructor (userData) {
      this.id = userData.user_id;
      this.email = userData.user_email;
      this.hash = userData.user_hash;
      this.profileId = userData.user_profile;
      this.name = userData.user_name;
      this.teleopId = userData.UID_TELEOPERADOR;
      this.isLogged = userData.IS_LOGGED;
      this.lastLogin = userData.LAST_LOGIN;
    }
  
    async chProfile (profileId) {
      const affected_rows = await db.call('USER_SET_PROFILE', this.id, profileId);
      if (affected_rows === 1) {
        this.profileId = profileId;
        return true;
      } else {
        return false;
      }
    }

  
    /**
       *
       * @param {string} password
       * @returns {boolean}
       */
    checkPassword (password) {
      return bcrypt.compareSync(password, this.hash)
    }
  }
  module.exports = {
    User, Profile
  }
  