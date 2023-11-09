const config = require('../config/config.js');
const fs = require('fs');
config.DB.timezone = 'utc';
/*
 const MysqlJson = require('mysql-json');
 const mysqlJson = new MysqlJson(config.DB);
 mysqlJson.connection = connection;
 module.exports = mysqlJson;
 */

const Mysql = require('mysql');

const connection = {};

function connect() {
  console.log('Connectig MYSQL');

  // if(config.DB.hasOwnProperty('ssl')){
  //   const data = fs.readFileSync(`/home/teleop/teleopsconfig/${config.DB.ssl.ca}`);
  //   config.DB.ssl.ca = data;
  // }

  const con = Mysql.createConnection(config.DB);
  const del = con._protocol._delegateError;
  con._protocol._delegateError = function (err, sequence) {
    if (err.fatal) {
      connection.end(() => {
        connection.con.destroy();
        connect();
      });

      return del.call(this, err, sequence);
      ;
    }
    return del.call(this, err, sequence);
  };
  con.call = function (SP, ...params) {
    const promise = new Promise((resolve, reject) => {
      let query = `CALL ${SP}(`;
      for (let p = 0; p < params.length; p++) {
        query += `'${params[p]}'`;
        if (p < params.length - 1) {
          query += ',';
        }
      }
      query += ');';
      con.query(query, params, (err, response) => {
        if (err) {
          return reject(err);
        }
        resolve(response[0]);
      });
    });
    promise.catch(console.error);
    return promise;
  };
  connection.con = con;
  connection.call = con.call.bind(con);
  connection.query = con.query.bind(con);
  connection.end = con.end.bind(con);
}


connect();

module.exports = connection;
