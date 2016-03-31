var fs         = require('fs');
var colors     = require('colors');
var drive      = require('./drive.js');
var exec       = require('child_process').exec;
var moment     = require('moment');
var nodemailer = require('nodemailer');


if (typeof process.argv[2] !== 'undefined') {
    var domain  = process.argv[2];
    var setting = JSON.parse(fs.readFileSync(__dirname + '/configs/setting.json', 'utf8'));
    process.env.TZ = setting.timezone;
    var data    = setting.domain[domain];
    if (typeof data === 'object') {
        drive.setConfig(setting.domain[domain], domain);
        var history, i, files = [], fileNew = [], uploading = {db: true, file: true};

        if (!fs.existsSync(__dirname + '/configs/' + domain + '.json')) {
            console.log('***************** Create file logs *****************'.green);
            history = {
                last_backup: moment().format('YYYY-MM-DD HH:mm:ss'),
                files: [],
                database: []
            };
            fs.writeFileSync(__dirname + '/configs/' + domain + '.json', JSON.stringify(history), 'utf-8');

        }
        history = JSON.parse(fs.readFileSync(__dirname + '/configs/' + domain + '.json'));
        history.last_backup = moment().format('YYYY-MM-DD HH:mm:ss');

        var sqlFile = moment().format('YYYY-MM-DD_HH-mm-ss') + '_' + domain + '.sql';
        exec('cd tmp && mysqldump -u ' + data.database.user + ' -p ' + data.database.name + ' --password=' + data.database.password + ' --skip-lock-tables --force > ' + sqlFile,
            function (error, stdout, stderr) {
                console.log('***************** Backup database *****************'.green);
                sqlFile = 'tmp/' + sqlFile;
                if (error) {
                    console.log(JSON.stringify(error).red);
                }

                console.log(stdout);
                if (stderr) {
                    console.log(JSON.stringify(stderr).red);
                    removeFile(sqlFile);
                } else {
                    drive.uploadFile(sqlFile, data.folderId, null, function(fileId){
                        removeFile(sqlFile);
                        uploading.db = false;
                        history.database.push(fileId);
                        if(data.database.max_file_backup < history.database.length ){
                            drive.deleteFile(history.database.shift());
                        }
                        if(!uploading.file){
                            fs.writeFile(__dirname + '/configs/' + domain + '.json', JSON.stringify(history), 'utf-8');
                        }
                    });
                }
            });

        for (i = 0; i < data.path.length; i++) {
            files = getFiles(data.path[i], files)
        }

        for (i = 0; i < files.length; i++) {
            if (history.files.indexOf(files[i]) === -1) {
                fileNew.push(files[i]);
                history.files.push(files[i]);
            }
        }
        if (fileNew.length > 0) {
            var zipFile = moment().format('YYYY-MM-DD_HH-mm-ss') + '_uploads.zip';
            exec('cd tmp && zip ' + zipFile + ' ' + fileNew.join(' '), function (error, stdout, stderr) {
                console.log('*****************Zip file *****************'.green);
                zipFile = 'tmp/' + zipFile;
                if (error) {
                    console.log(JSON.stringify(error).red);
                }
                console.log(stdout);
                if (stderr) {
                    console.log(JSON.stringify(stderr).red);
                    removeFile(zipFile);
                } else {
                    drive.uploadFile(zipFile, data.folderId, null, function(){
                        removeFile(zipFile);
                        uploading.file = false;
                        if(!uploading.db){
                            fs.writeFile(__dirname + '/configs/' + domain + '.json', JSON.stringify(history), 'utf-8');
                        }
                    });
                }
            });
        }else{
            uploading.file = false;
            if(!uploading.db){
                fs.writeFile(__dirname + '/configs/' + domain + '.json', JSON.stringify(history), 'utf-8');
            }
        }
        drive.info();
    } else {
        console.log('Domain not found.'.red);
    }
}
function getFiles(dir, _files) {
    _files    = _files || [];
    var files = fs.readdirSync(dir);
    for (var i in files) {
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, _files);
        } else {
            _files.push(name);
        }
    }
    return _files;
}
function removeFile(file){
    fs.exists(file, function(exists) {
        if(exists) {
            console.log("Delete file %s".green, file);
            fs.unlink(file);
        } else {
            console.log("File %s not found, so not deleting.".red, file);
        }
    });
}
function sendMail(config) {
    //var transporter = nodemailer.createTransport(transport[, defaults])
}