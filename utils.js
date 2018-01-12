var exec = require('child_process').exec;
var fs = require('fs');

// finally polyfill
(function () {
  if (typeof Promise.prototype.finally === 'function') {
    return;
  }
  Promise.prototype.finally = function (fn) {
    return this
      .then(value => this.constructor.resolve(fn()).then(() => value))
      .catch(reason => this.constructor.resolve(fn()).then(() => { throw reason }))
  }
})();

exports.ERRORS = {
  EMPTY: 1,
  TOO_OLD: 2,
  UNKNOWN: 3
};

exports.getDaysInMonth = function(month,year) {
 return new Date(year, month, 0).getDate();
};

exports.formatDate = function(month, day, year) {
  return this.pad(year) + '-' + this.pad(month) + '-' + this.pad(day);
};

exports.getTimestamp = function() {
  var date = new Date();
  var hour = date.getHours();
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();
  var milliseconds = date.getMilliseconds();

  return '[' +
         ((hour < 10) ? '0' + hour: hour) +
         ':' +
         ((minutes < 10) ? '0' + minutes: minutes) +
         ':' +
         ((seconds < 10) ? '0' + seconds: seconds) +
         '.' +
         ('00' + milliseconds).slice(-3) +
         '] ';
};

exports.pad = function(n) {
  return (n < 10) ? ("0" + n) : n;
}

exports.showProgress = function(idx) {
  process.stdout.write((idx+1).toString());
  for(var x=0; x < (idx).toString().length; x++) {
    process.stdout.write("\b");
  }
};

// make promise version of fs.readFile()
fs.readFileAsync = function(filename) {
  return new Promise(function(resolve, reject) {
    fs.readFile(filename, 'utf8', function(err, data){
      if (err)
        reject(err);
      else
        resolve(data);
    });
  });
};

// make promise version of exec()
exports.execAsync = function(cmd) {
  return new Promise(function(resolve, reject) {
// console.log(' >>>> execAsync exec(cmd)', cmd);
    exec(cmd, function(err, stdout, stderr) {
// console.log('\033[0;32m', '>>>>  execAsync callback cmd', cmd  , '\033[0m' );
// console.log('\033[0;36m', '>>>>  execAsync callback stdout', typeof stdout, stdout  , '\033[0m' );
// console.log('\033[0;33m', '>>>>  execAsync callback stderr ', stderr  , '\033[0m' );
var result = stdout && JSON.parse(stdout) || {};
      if (err || result.status === 0) {
        // if (debug) console.log('\033[0;31m', '>>>> ERROR: ', JSON.stringify(result), '\033[0m' );
        reject(err || result);
      }
      else {
// if (debug) console.log(' >>>> execAsync resolve ');
        // curl seems to output on stderr
        resolve(stdout + '\n' + stderr);
      }
    });
  });
};