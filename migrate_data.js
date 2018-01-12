#!/usr/local/bin/node

var range = require('range');
var exec = require('child_process').exec;
var fs = require('fs');
var btoa = require('btoa');
var print = require('util').print;

var utils = require('./utils');
var mpInfo = require('./mixpanel-info');

var debug = false;

function printUsage() {
  console.log('\033[0;36m', 'Usage: migrate_data.js  [year [month [day]]]\n'  , '\033[0m' );
  console.log('\033[0;36m', '              /? : prints help'  , '\033[0m' );
  console.log('\033[0;36m', '          [year] : migrates all events for that year, per day'  , '\033[0m' );
  console.log('\033[0;36m', '    [year month] : migrates all events for that year/month, per day'  , '\033[0m' );
  console.log('\033[0;36m', '[year month day] : migrates all events for the given day\n'  , '\033[0m' );
  console.log('\033[0;31m', 'No parameters migrates all events between 1/1/2013 to 12/31/2017, per day (1825 days)'  , '\033[0m' );
  console.log('\033[0m', ' (only do this when you are ready to migrate ALL DATA and you know everything works)\n'  , '\033[0m' );

}

var years = range.range(2014, 2018);
var months = range.range(1, 13);
var runSingleDay = null;

if (process.argv.length === 2) {
  printUsage();
  var readline = require('readline');
  var rl = readline.createInterface(process.stdin, process.stdout);
console.log('\033[0;33m', '>>>>  Do you really want to migrate all data (this may take a really long time)? [y|n] '  , '\033[0m' );
  // rl.setPrompt('Do you really want to migrate all data (this may take a long time)? [y|n] \n');
  rl.prompt();
  rl.on('line', function(line) {
      if (line.toLowerCase() !== "y") rl.close();
      migrateData();
  }).on('close',function(){
      process.exit(0);
  });
}

if (process.argv.length > 2) {
  if (process.argv.length === 3) {
      years = [process.argv[2]];
      if (years.toString() === '/?') {
        printUsage();
        process.exit(0);
      }
      if (years.toString() === 'all') {
        years = range.range(2014, 2018);
      }
  }

  if (process.argv.length === 4) {
      years = [process.argv[2]];
      months = [process.argv[3]];
  }

  if (process.argv.length === 5) {
      years = [process.argv[2]];
      months = [process.argv[3]];
      runSingleDay = process.argv[4];
  }

  migrateData();
}


function migrateData() {
  var processedFile = 'done/_processed.txt';
  return fs.readFileAsync(processedFile)
    .catch(function() {
      return [];
    })
    .then(function(processed) {
      var processes = [];

      years.reverse().forEach(function(year) {
        months.reverse().forEach(function(month) {

          var startDay = 1;
          var numDays = utils.getDaysInMonth(month, year);
          if (runSingleDay) {
            startDay = numDays = runSingleDay;
          }

  if (debug) console.log('\033[0;32m', 'days: ' , startDay, numDays , '\033[0m' );

          for (var day = startDay; day <= numDays; day++) {
            var migrateDataForDay = function(month, day, year) {
              return function() {

                // console.log('\033[0;32m', utils.getTimestamp(), 'Processing: ' , utils.formatDate(month, day, year) , '\033[0m' );
                process.stdout.write('\n\033[0;32m');
                process.stdout.write(utils.getTimestamp() +  ' Processing: ' + utils.formatDate(month, day, year) + ' : exporting...');
                process.stdout.write('\033[0m' );

                var file = 'out/' + utils.pad(year) + utils.pad(month) + utils.pad(day) + '.json';
                var doneFile = file.replace('.json', '.log').replace('out/', 'done/');

                if (~processed.indexOf(file)) {
                  console.log('\033[0;33m', '>>>> Already processed:' , utils.formatDate(month, day, year), 'skipping...'  , '\033[0m' );
                  return;
                }

                var exportCmd = 'curl https://data.mixpanel.com/api/2.0/export/ -u "' + mpInfo.alpineMobileApi + '" -d from_date="' + utils.formatDate(month, day, year) + '" -d to_date="' + utils.formatDate(month, day, year) + '" > ' + file;
                var cleanupCmd = 'rm -f ' + file;

  // if (debug) console.log(' >>>> exportCmd ', exportCmd);

                return utils.execAsync(exportCmd)
                  .then(function(res) {
                    fs.appendFileSync(doneFile, 'Export Stats:\n' + res + '\n');
                  })
                  .then(function() {
                    return importEvents(file);
                  })
                  .then(function(err) {
                    // if (!err)
                      fs.appendFileSync(processedFile, file + '\n');
                  })
                  .then(function() {
                    return utils.execAsync(cleanupCmd)
                  });
              };
            }
            processes.push(migrateDataForDay(month, day, year));
          }
        })
    });

    return processes.reduce(function(current, next) {
      return current.then(function() {
        return next();
      });
    }, Promise.resolve())
    .then(function() {
      console.log('\033[0;32m', '\n' + utils.getTimestamp(), '>>>> DONE '  , '\033[0m' );
    });

  });
}

function importEvents(file) {
  var errorFile = file.replace('.json', '.log').replace('out/', 'err/');
  var doneFile = file.replace('.json', '.log').replace('out/', 'done/');
  var errorInfo = '';

  return fs.readFileAsync(file)
    .then(function(data) {

      if (!data) {
        console.log('\033[0;33m', '>>>>  data file was empty ', file  , '\033[0m' );
        fs.writeFileSync(errorFile.replace('err/', 'empty/'), 'data file was empty');
        return utils.ERRORS.EMPTY;
      }

      var events = data.split(/\r?\n/);
      var numEvents = events.length;
      if (events[0] === 'Date range exceeds 1825 days into the past' || events[0] === '') {
        console.log('\033[0;33m', '>>>>  NO DATA or data too old ', file  , '\033[0m' );
        fs.writeFileSync(errorFile.replace('err/', 'empty/'), 'NO DATA or data too old: ' + events[0]);
        return utils.ERRORS.TOO_OLD;
      }

if (debug) console.log('\033[0;36m', '>>>> events: ', file, events.length, (events.length/50)  , '\033[0m' );

// var first = true;
      var batches = [];
      while (events.length) {
        batches.push(events.splice(0, 50)
          .map(function(item) {
            try {
              var event = JSON.parse(item);
              // {
              //     "event": "Sync Duration",
              //     "properties": {
              //         "time": 1385972209,
              //         "company": null,
              //         "duration": 13479,
              //         "mp_lib": "node",
              //         "username": "Bob Field"
              //     }
              // }

              // "time" is in project timezone, convert back to UTC (+6 hours)
              // https://mixpanel.com/help/reference/exporting-raw-data
              event.properties.time = event.properties.time + (6 * 60 * 60);
              // https://mixpanel.com/help/reference/importing-old-events
              event.properties.token = mpInfo.backOfficeToken;

// if (first && event.event === 'TicketAddedToJob') {
//   console.log("event: ", event);
//   console.log("event formatted: ", btoa(JSON.stringify(event)));
//   first = false;
//   // process.exit(0);
// }

              return event;
            }
            catch(err) {
              console.log('\033[0;36m', '>>>> Error parsing JSON: '  , '\033[0m' );
              console.log(item);
              errorInfo = item;
              throw err;
            }
          }));
      }

if (debug) console.log('\033[0;36m', '>>>> batches: ', file, batches.length  , '\033[0m' );
if (debug) console.log('\033[0;36m', '>>>> first batch: '  , '\033[0m' );
if (debug) console.log(batches[0][0]);
if (debug) console.log('\033[0;36m', '>>>> last batch: '  , '\033[0m' );
if (debug) console.log(batches[batches.length - 1][batches[batches.length - 1].length-1]);

      var importBatches = batches.map(function(batchedData, idx) {
        var json = JSON.stringify(batchedData);
        var data = btoa(json);
        var importCmd = 'curl https://api.mixpanel.com/import/ -u "' + mpInfo.backOfficeApi + '" -d data=' + data + ' -d verbose=1';

// !!! testing - no import
// importCmd = 'echo ' + importCmd;

        return function() {
          return utils.execAsync(importCmd)
          .then(function(res) {
            fs.appendFileSync(doneFile, 'Import Stats [idx: ' + idx + ' | events:' + batchedData.length + ']\n' + res);
            fs.appendFileSync(doneFile, '--------------------------------------------------------------------------------\n');

            // for(var x=0;  x >= 0 && x < (idx-1).toString().length; x++) {
            //   process.stdout.write("\b");
            // }
            // process.stdout.write((idx).toString());
            utils.showProgress(idx);
          })
          .catch(function(err) {
            console.log('\033[0;31m', '>>>> ERROR: ', file, idx, err, '\033[0m' );
            var batchFile = errorFile + '.' + idx;
            fs.writeFileSync(batchFile, 'ERROR:' + JSON.stringify(err) + '\n');
            fs.appendFileSync(batchFile, 'CMD:' + '\n' + importCmd + '\n');
            fs.appendFileSync(batchFile, 'DATA:' + '\n' + data + '\n');
            fs.appendFileSync(batchFile, 'JSON:' + '\n' + json + '\n');
          });
        }
      });

      fs.appendFileSync(doneFile, '================================================================================\n');
      fs.appendFileSync(doneFile, 'Importing: ' + numEvents + ' events / ' + batches.length + ' batches\n');
      fs.appendFileSync(doneFile, '================================================================================\n');

      process.stdout.write('\b\b\b\b\b\b\b\b\b\b\b\b            \b\b\b\b\b\b\b\b\b\b\b\b'); // clear "exporting..." text
      process.stdout.write(' ' + batches.length + '/');

      // return Promise.all(importBatches);
      return importBatches.reduce(function(current, next) {
        return current.then(function() {
          return next();
        });
      }, Promise.resolve());

    })
    .catch(function(err) {
      console.log(' >>>> ERROR ', file, err);
      fs.writeFileSync(errorFile, err);
      if (errorInfo) fs.appendFileSync(errorFile, errorInfo);
      return utils.ERRORS.UNKNOWN;
    });
};
