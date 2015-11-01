'use strict';

var https = require('https');
var Promise = require('promise');
var fs = require('fs');
var request = require('request');

var TestOnPageRestApiHost = 'qaapi.onpage.com'; // Test environment host name for OnPage API
var ProdOnPageRestApiHost = 'api.onpage.com'; // Production environment host name for OnPage API

// Test environment upload attachment URL
var TestOnPageUploadUrl = 'https://qanps.onpage.com/onpage-gateway/rest/attachment/';
// Production environment upload attachment URL
var ProdOnPageUploadUrl = 'https://qanps.onpage.com/onpage-gateway/rest/attachment/';

function OnPageRestApiClient() {
    this.production = true;
}

/**
 * Set environment to TEST or PRODUCTION
 * @param testEnvironmentFlag set true tp switch to TEST environment or false to switch to PRODUCTION
 */
OnPageRestApiClient.prototype.setTestEnvironment = function (testEnvironmentFlag) {
    this.production = !testEnvironmentFlag;
    return this;
};

OnPageRestApiClient.prototype.getOnPageRestApiHostName = function () {
    if (this.production) {
        return ProdOnPageRestApiHost;
    } else {
        return TestOnPageRestApiHost;
    }
};

OnPageRestApiClient.prototype.getOnPageUploadUrl = function () {
    if (this.production) {
        return ProdOnPageUploadUrl;
    } else {
        return TestOnPageUploadUrl;
    }
};

OnPageRestApiClient.prototype.uploadAttachment = function uploadAttachment(token, fileName) {
    return new Promise(function (resolve, reject) {
        var url = OnPageRestApiClient.prototype.getOnPageUploadUrl();
        var filePath = fileName;
        var headers= {};
        if (token) {
            headers['x-onpage-access-token'] = token;
        }
        var r = request.post({
            url: url,
            strictSSL: false,
            headers: headers
        }, function (err, res, data) {
            if (err) {
                console.error(err);
                return reject({success: false, message: err});
            }

            try {
                var json = JSON.parse(data);
                if (!json.success) {
                    return reject({success: false, message: json.message});
                } else {
                    return resolve('' + json.id);
                }
            } catch (e) {
                console.error(e);
                return reject({success: false, message: e});
            }
        });
        var form = r.form();
        form.append('file', fs.createReadStream(filePath));
    });
};

/**
 * Make HTTPS POST connection to web server
 * @param host server host name to connect to
 * @param path path part of the URL to connect to
 * @param data data to be transferred to server
 * @param token OnPage Access Token
 * @returns {Promise} response content from server
 */
function doHttps(host, path, data, token) {
    return new Promise(function (resolve, reject) {
        var headers = {'content-type': 'application/json'};
        if (token) {
            headers['x-onpage-access-token'] = token;
        }
        var req = https.request({
                hostname: host,
                port: 443,
                path: path,
                method: 'POST',
                headers: headers
            },
            function (res) {
                var body = '';
                res.on('data', function (chunk) {
                    body += chunk;
                });
                res.on('end', function () {
                    resolve(body);
                });
                res.on('error', function (error) {
                    console.error('Error in doHttps()', error);
                    reject(error);
                });
            });

        req.write(new Buffer(JSON.stringify(data)));
        req.end();
        req.on('error', function (error) {
            console.error('Error in doHttps()', error);
            reject(error);
        });
    });
}

/**
 * Get OnPage Access Token
 * @param name customer user name
 * @param password customer password
 * @returns {Promise} OnPage Access Token
 */
OnPageRestApiClient.prototype.getToken = function getToken(name, password) {
    return new Promise(function (resolve, reject) {
        doHttps(
            OnPageRestApiClient.prototype.getOnPageRestApiHostName(),
            '/authenticate',
            {
                "name": name,
                "token": password
            }).then(function (json) {
                var data = JSON.parse(json);
                if (data.success) {
                    resolve(data.token);
                } else {
                    reject(data.message);
                }
            }).then(null, function (error) {
                console.log(' Error in receiving Token', error);
                reject(error);
            });
    });
};

/**
 * Send message to OnPage Pager
 * @param token OnPage Access Token (getToken())
 * @param messageId customer internal message ID
 * @param subject message subject
 * @param body message body
 * @param recipients array of recipients
 * @param priority HIGH or LOW message priority
 * @param attachments array of attachments
 * @param callbackUri URL to push status update callbacks. NULL either you do not have status update callback service
 * or if you do not want receive status updates for this message
 * @returns {Promise} JSON response from OnPage server
 */
OnPageRestApiClient.prototype.sendPage =
    function sendPage(token, messageId, recipients, subject, body, priority, attachments, callbackUri) {
        return new Promise(function (resolve, reject) {
            var messageData = {
                "messageId": messageId,
                "subject": subject,
                "body": body,
                "recipients": recipients,
                "priority": priority
            };
            if(attachments) {
                messageData.attachments = attachments;
            }
            if(callbackUri) {
                messageData.callbackUri = callbackUri;
            }
            return doHttps(
                OnPageRestApiClient.prototype.getOnPageRestApiHostName(),
                '/api/page',
                messageData,
                token)
                .then(function (json) {
                    var data = JSON.parse(json);
                    resolve(data);
                }).then(null, function (error) {
                    console.log(' Error in Sending Page', error);
                    reject(error);
                }
            );
        });
    };

module.exports = OnPageRestApiClient;
