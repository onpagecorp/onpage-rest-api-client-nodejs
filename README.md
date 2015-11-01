Node.js onpage-rest-api-client module allows to use new OnPage REST API to send message to OnPage customers.

Basic usage:

```nodejs
'use strict';

var Promise = require('promise');
var crypto = require('crypto');
var async = require('async');

var OnPageRestApiClient = require('onpage-rest-api-client');
var onPageRestApiClient = new OnPageRestApiClient();

// REMOVE THIS FOR PRODUCTION ENVIRONMENT
onPageRestApiClient.setTestEnvironment(true);

// UPDATE THESE USER NAME AND PASSWORD WITH YOUR CREDENTIALS.
// CONTACT ONPAGE SUPPORT TO GET THEM IF YOU ARE NEW CUSTOMER
var restApiUser = 'user';
var restApiPassword = 'password';

/**
 * Generate unique ID used as internal message ID
 * @returns {string|String|*}
 */
function generateMessageId() {
    return crypto.randomBytes(Math.ceil(16)).toString('hex');
}

/**
 * Call OnPage REST API Client sendPage method and proceed response
 * @param token OnPage REST API Access token
 * @param messageId internal message ID
 * @param recipients array of message recipients
 * @param subject message subject
 * @param body message body
 * @param priority message priority HIGH/LOW
 * @param attachments array of attachment IDs (see uploadattachment method inAPI)
 * @param callbackUri URL to get status update callbacks. Leave NULL if yiu do not have status update callback
 * service or do not want receive status update callback for this message
 * @returns {Promise} OnPage message ID
 */
var sendPage = function (token, messageId, recipients, subject, body, priority, attachments, callbackUri) {
    return new Promise(function (resolve, reject) {
        return onPageRestApiClient.sendPage(
            token,
            messageId,// message ID
            recipients,// array of the recipients
            subject,
            body,
            priority,// priority: HIGH/LOW
            attachments,
            callbackUri
        ).then(function processResponse(data) {
                if (data) {
                    var nonExistingRecipients = data.nonExistingRecipients;
                    if (nonExistingRecipients) {
                        var length = nonExistingRecipients.length;
                        if (nonExistingRecipients && length > 0) {
                            console.log('Non existing recipients:');
                            for (var i = 0; i < length; i++) {
                                console.log('   %s', nonExistingRecipients[i]);
                            }
                        }
                    }
                    if (data.success) {
                        resolve(data.messageId);
                    } else {
                        reject("Page wasn't sent. Error message is '" + data.message + "'");
                    }
                } else {
                    reject("Page wasn't send. Not recognized response from OnPage server.");
                }
            }, function (error) {
                console.error(error);
                reject(error);
            }
        );
    });
};

(function main() {
    console.log('Started...');

    console.log(' Getting Token...');

    var recipients = [array_of_recipients];

    return onPageRestApiClient
        .getToken(restApiUser, restApiPassword)
        .then(function (token) {
            console.log(' Token is: ' + token);

            return new Promise(function (resolve, reject) {
                async.parallel(
                    {
                        sendSimpleMessageHighPriority: function sendSimpleMessageHighPriority(callback) {
                            var internalMessageId = generateMessageId();
                            return sendPage(
                                token,
                                internalMessageId,
                                recipients,
                                "HIGH priority message",
                                "This is body of the HIGH priority message",
                                'HIGH',
                                null, // no attachments
                                null // no status update callbacks
                            ).then(function (onPageMessageId) {
                                    console.log('sendSimpleMessageHighPriority() SENT: OnPage message ID: ' +
                                        onPageMessageId);
                                    callback(null, {success: true, messageId: onPageMessageId});
                                }, function (error) {
                                    console.log('sendSimpleMessageHighPriority() ERROR: ' + error);
                                    callback(null, {success: false, error: error});
                                });
                        },
                        sendSimpleMessageLowPriority: function sendSimpleMessageLowPriority(callback) {
                            var internalMessageId = generateMessageId();
                            return sendPage(
                                token,
                                internalMessageId,
                                recipients,
                                "LOW priority message",
                                "This is body of the LOW priority message",
                                'LOW',
                                null, // no attachments
                                null // no status update callbacks
                            ).then(function (onPageMessageId) {
                                    console.log('sendSimpleMessageLowPriority() SENT: OnPage message ID: ' +
                                        onPageMessageId);
                                    callback(null, {success: true, messageId: onPageMessageId});
                                }, function (error) {
                                    console.log('sendSimpleMessageLowPriority() ERROR: ' + error);
                                    callback(null, {success: false, error: error});
                                });
                        },
                        sendMessageWithAttachment: function sendMessageWithAttachment(callback) {
                            var internalMessageId = generateMessageId();
                            return onPageRestApiClient.uploadAttachment(
                                token,
                                './image.jpg'
                            ).then(function (onPageAttachmentId) {
                                    console.log('sendMessageWithAttachment() UPLOADED: OnPage Attachment ID: ' +
                                        onPageAttachmentId);
                                    var attachments = [onPageAttachmentId];
                                    return sendPage(
                                        token,
                                        internalMessageId,
                                        recipients,
                                        "Message with attachment",
                                        "This is body of the message with attachment",
                                        "HIGH",
                                        attachments,
                                        null
                                    ).then(function (onPageMessageId) {
                                            console.log('sendMessageWithAttachment() SENT: OnPage message ID: ' +
                                                onPageMessageId);
                                            callback(null,
                                                {
                                                    success: true,
                                                    attachmentId: onPageAttachmentId,
                                                    messageId: onPageMessageId
                                                });
                                        }, function (error) {
                                            console.log('sendSimpleMessageLowPriority() ERROR: ' + error);
                                            callback(null, {success: false, error: error});
                                        });

                                }, function (error) {
                                    callback(null, {success: false, error: error});
                                });
                        }
                    },
                    function final(error, result) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );
            });
        }).then(function (result) {
            console.log('\nREPORT');
            console.log('=====================================');
            console.log(result);
            console.log('=====================================');
        }, function (error) {
            console.error('Error in sending simple page: ' + error);
        });
})();
```
