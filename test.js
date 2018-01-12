#!/usr/local/bin/node

//console.log('\033[0;32m');
process.stdout.write('\n\033[0;32m');
process.stdout.write("foo ");
process.stdout.write(".");
process.stdout.write(".");
process.stdout.write(".");
process.stdout.write(".");
process.stdout.write(".");
process.stdout.write('\033[0m' );
//console.log('\033[0m' );

var print = require('util').print;
var count = 0;
//print("\r" + 256);
process.stdout.write("\n[500/");

var i = setInterval(function () {
  if (count === 500) clearInterval(i);
  process.stdout.write((count).toString());
  for(var x=0; x < (count).toString().length; x++) {
    process.stdout.write("\b");
  }
  count++;
}, 300);


