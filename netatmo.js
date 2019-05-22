var util = require('util');
var EventEmitter = require("events").EventEmitter;
var request = require('request-promise');
var moment = require('moment');
var _ = require('underscore');

const BASE_URL = 'https://api.netatmo.com';

var username;
var password;
var client_id;
var client_secret;
var scope;
var access_token;
var refresh_token;

/**
 * @constructor
 * @param args
 */
var netatmo = {
  init: async (args) => {
    return authenticate(args);
  },
  exec: async (url, args) => {
    return exec(url, args);
  }
}

var authenticate = async (args) => {
  if (!args) {
    throw new Error("Authenticate 'args' not set.")
  }

  if (args.access_token) {
    access_token = args.access_token;
    return access_token;
  }

  if (!args.client_id) {
    throw new Error("Authenticate 'client_id' not set.")
  }

  if (!args.client_secret) {
    throw new Error("Authenticate 'client_secret' not set.")
  }

  if (!args.username) {
    throw new Error("Authenticate 'username' not set.")
  }

  if (!args.password) {
    throw new Error("Authenticate 'password' not set.")
  }

  username = args.username;
  password = args.password;
  client_id = args.client_id;
  client_secret = args.client_secret;
  scope = args.scope || 'read_station read_thermostat write_thermostat read_camera access_camera read_homecoach write_camera';

  var form = {
    client_id: client_id,
    client_secret: client_secret,
    username: username,
    password: password,
    scope: scope,
    grant_type: 'password',
  };
  var url = util.format('%s/oauth2/token', BASE_URL);
  try {
    const _response = await request({
      url: url,
      method: "POST",
      form: form,
    })
    var response = JSON.parse(_response);
    if (response.statusCode && response.statusCode != 200) {
      throw new Error(response.body.error);
    }
    access_token = response.access_token;
    if (response.expires_in) {
      refresh_token = response.refresh_token;
      setTimeout(authenticate_refresh, response.expires_in * 1000, response.refresh_token);
    }

    return access_token;
  } catch (err) {
    throw err
  }
};

var authenticate_refresh = async (refresh_token) => {
  console.log('refreshing');
  var form = {
    grant_type: 'refresh_token',
    refresh_token: refresh_token,
    client_id: client_id,
    client_secret: client_secret,
  };

  var url = util.format('%s/oauth2/token', BASE_URL);
  try {
    const _response = await request({
      url: url,
      method: "POST",
      form: form,
    })
    var response = JSON.parse(_response);
    if (response.statusCode && response.statusCode != 200) {
      throw new Error(response.body.error);
    }
    access_token = response.access_token;
    if (response.expires_in) {
      refresh_token = response.refresh_token;
      setTimeout(authenticate_refresh, response.expires_in * 1000, response.refresh_token);
    }

    return access_token;
  } catch (err) {
    console.log(err)
    throw err
  }
}
var exec = async (url, data) => {

  var url = util.format('%s/api/' + url, BASE_URL);

  var form = _.extend(data, {
    access_token: access_token
  });
  try {
    const _response = await request({
      url: url,
      method: "POST",
      form: form,
    });
    var response = JSON.parse(_response);
    if (response.status != 'ok') {
      throw new Error(response.body.error);
    }
    return response.body;
  } catch (err) {
    throw err
  }
}
module.exports = netatmo;
