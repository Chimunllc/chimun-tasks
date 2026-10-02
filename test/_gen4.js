const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'run.js'),'utf8');
const marker = src.indexOf('ТЕСТҮҮД');
console.error('marker at', marker);
const head=src.slice(0, src.lastIndexOf('\n', marker));
try {
  const fn = vm.runInThisContext('(function(require,__dirname,module,exports,SEED,OUT){'+head+'\nvm.runInContext(SEED, sandbox);\nOUT(vm.runInContext("renderSalary()", sandbox));\nprocess.exit(0);\n})');
  fn(require, __dirname, {}, {}, fs.readFileSync('/tmp/seed.js','utf8'), h=>fs.writeFileSync('/tmp/pc.frag.html', h));
} catch (e) { console.error('ERR:', e.message); }
