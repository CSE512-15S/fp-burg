/*
 * Copyright (C) 2013, 2014 Apple Inc. All rights reserved.
 * Copyright (C) 2015 University of Washington.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS ``AS IS''
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

WK.PatchQueueDataSource = function(baseURL)
{
    const queueInfo = {
        //"commit-queue": {platform: WK.Platform.MacOSXMavericks, shortName: "commit", title: "Commit Queue"},
        //"style-queue": {shortName: "style", title: "Style Checker Queue"},
        //"gtk-wk2-ews": {platform: WK.Platform.LinuxGTK, shortName: "gtk-wk2", title: "WebKit2\xa0Release\xa0Build\xa0EWS"},
        "ios-ews": {platform: WK.Platform.iOS8Device, shortName: "ios", title: "WebKit\xa0Release\xa0Build\xa0EWS"},
        //"mac-ews": {platform: WK.Platform.MacOSXMavericks, shortName: "mac", title: "WebKit1\xa0Release\xa0Tests\xa0EWS"},
        "mac-wk2-ews": {platform: WK.Platform.MacOSXMavericks, shortName: "mac-wk2", title: "WebKit2\xa0Release\xa0Tests\xa0EWS"},
        //"win-ews": {platform: WK.Platform.Windows7, shortName: "win", title: "WebKit1\xa0Release\xa0Build\xa0EWS"},
        //"efl-wk2-ews": {platform: WK.Platform.LinuxEFL, shortName: "efl-wk2", title: "WebKit2\xa0Release\xa0Build\xa0EWS"}
    };

    WK.Object.call(this);

    this.baseURL = baseURL;
    this.queues = {};

    for (var id in queueInfo)
        this.queues[id] = new WK.PatchQueue(this, id, queueInfo[id]);
};

WK.Object.addConstructorFunctions(WK.PatchQueueDataSource);

WK.PatchQueueDataSource.prototype = {
    constructor: WK.PatchQueueDataSource,
    __proto__: WK.Object.prototype,

    jsonQueueLengthURLForQueue: function(queue)
    {
        console.assert(queue instanceof WK.PatchQueue, queue);
        return this.baseURL + "queue-length-json/" + encodeURIComponent(queue.id);
    },

    jsonQueueStatusURLForQueue: function(queue)
    {
        console.assert(queue instanceof WK.PatchQueue, queue);
        return this.baseURL + "queue-status-json/" + encodeURIComponent(queue.id);
    },

    jsonProcessingTimesURLForDateRange: function(fromTime, toTime)
    {
        return this.baseURL + "processing-times-json/" + [fromTime.getUTCFullYear(), fromTime.getUTCMonth() + 1, fromTime.getUTCDate(), fromTime.getUTCHours(), fromTime.getUTCMinutes(), fromTime.getUTCSeconds()].join("-")
            + "-" + [toTime.getUTCFullYear(), toTime.getUTCMonth() + 1, toTime.getUTCDate(), toTime.getUTCHours(), toTime.getUTCMinutes(), toTime.getUTCSeconds()].join("-");
    },

    queueStatusURLforQueue: function(queue)
    {
        console.assert(queue instanceof WK.PatchQueue, queue);
        return this.baseURL + "queue-status/" + encodeURIComponent(queue.id);
    },

    // Retrieves information about all patches that were submitted in the time range:
    // {
    //     patch_id_1: {
    //         queue_name_1: {
    //             date: <date/time when the patch was submitted to the queue>,
    //             retry_count: <number of times a bot had to bail out and drop the lock, for another bot to start from scratch>,
    //             wait_duration: <how long it took before a bot first locked the patch for processing>,
    //             process_duration: <how long it took from end of wait to finish, only valid for finished patches. Includes wait time between retries>
    //             final_message: <(pass|fail|not processed|could not apply|internal error|in progress)>
    //         },
    //         ...
    //     },
    //     ...
    // }
    fetchPatchResultsForDateRange: function(fromTime, toTime, callback)
    {
        JSON.load(this.jsonProcessingTimesURLForDateRange(fromTime, toTime), function(payload) {
            var patchResults = [];
            for (patchId in payload) {
                var resultData = payload[patchId];
                for (queueId in resultData) {
                    var queue = resultData[queueId];
                    queue.date = new Date(queue.date);
                }

                patchResults.push(new WK.PatchResult(parseInt(patchId), resultData))
            }
            callback(patchResults, fromTime, toTime);
        }.bind(this));
    },
};
