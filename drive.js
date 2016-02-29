var fs         = require('fs');
var readline   = require('readline');
var google     = require('googleapis');
var googleAuth = require('google-auth-library');
var colors     = require('colors');
var path       = require('path');

var SCOPES    = ['https://www.googleapis.com/auth/drive'];
var TOKEN_DIR = __dirname + '/.credentials/';
var TOKEN_PATH;
var CLIENT_SECRET_PATH;

var setConfig = function (config, domain) {
    TOKEN_PATH = TOKEN_DIR + domain + '.json';
    CLIENT_SECRET_PATH = config.client_secret;
};

function run(callback) {
    if(!CLIENT_SECRET_PATH){
        console.log('CLIENT_SECRET_PATH not found'.red);
        return;
    }
    fs.readFile(CLIENT_SECRET_PATH,
        function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            authorize(JSON.parse(content), callback);
        });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId     = credentials.installed.client_id;
    var redirectUrl  = credentials.installed.redirect_uris[0];
    var auth         = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Get driver info
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * */
var driverInfo = function () {
    run(function(auth){
        var drive = google.drive({version: 'v2', auth: auth});
        drive.about.get({}, function (err, data) {
            console.log('****************** Drive Info ******************'.green);
            if (err) {
                console.log("Get drive info error".bgRed);
                console.log(JSON.stringify(err).red);
            } else {
                console.log('Display name:\t' + data.user.displayName.green);
                console.log('Email:\t\t' + data.user.emailAddress.green);
                console.log('Drive type\t' + data.quotaType.yellow);
                console.log('Storage: used ' + convertSize(data.quotaBytesUsed).yellow + ' of ' + convertSize(data.quotaBytesTotal).green);
                console.log('Trash: ' + convertSize(data.quotaBytesUsedInTrash).red);
            }
            console.log("****************** End Drive Info ******************".green);
        });
    });
};

/**
 * Upload file.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param filePath file path
 */
var uploadFile = function (filePath, folderId, title, callback) {
    run(function(auth){
        var drive  = google.drive({version: 'v2', auth: auth});
        var mime   = require('mime-types');
        var params = {
            resource: {
                title: title,
                mimeType: mime.lookup(filePath)
            },
            media: {
                mimeType: mime.lookup(filePath),
                body: fs.createReadStream(filePath)
            }
        };
        if (folderId) {
            params.resource.parents = [{id: folderId}]
        }
        if (!title) {
            params.resource.title = path.basename(filePath)
        }
        drive.files.insert(params, function (err, result) {
            console.log("*************** Upload %s ***************".green, filePath);
            if (err) {
                console.log("Upload file %s error".bgRed, filePath);
                console.log(JSON.stringify(err).red);
            } else {
                console.log("Upload file %s successful. File ID: %s".green, filePath, result.id);
            }
            if(typeof callback === 'function'){
                callback(result.id);
            }
        });
    });
};
var deleteFile = function (fileId, callback) {
    run(function(auth){
        var drive = google.drive({version: 'v2', auth: auth});
        drive.files.delete({
            fileId: fileId
        }, function (err, result) {
            console.log("*************** Delete file %s ***************".green, fileId);
            if (err) {
                console.log("Delete file %s error".bgRed, fileId);
                console.log(JSON.stringify(err).red);
            } else {
                console.log("Delete file %s successful".green, fileId);
            }
            if(typeof callback === 'function'){
                callback();
            }
        });
    });
};
var emptyTrash = function (callback) {
    run(function(auth){
        var drive = google.drive({version: 'v2', auth: auth});
        drive.files.emptyTrash({}, function (err) {
            if (err) {
                console.log("Empty trash error".bgRed);
                console.log(JSON.stringify(err).red);
            }
            if(typeof callback === 'function'){
                callback();
            }
        });
    });
};

/**
 * Convert size
 * @param value [byte]
 * */
function convertSize(value) {
    var symbol = 'byte';
    if (value > 1024) {
        value  = value / 1024;
        symbol = 'Kb';
    }
    if (value > 1024) {
        value  = value / 1024;
        symbol = 'Mb';
    }
    if (value > 1024) {
        value  = value / 1024;
        symbol = 'Gb';
    }
    return typeof value === 'number' ? value.toFixed(2) : value + ' ' + symbol;
}

module.exports = {
    setConfig: setConfig,
    info: driverInfo,
    uploadFile: uploadFile,
    deleteFile: deleteFile,
    emptyTrash: emptyTrash
};