/*
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

var WK = WK || {};

WK.TestResultHistory = function(runs, results, resultsCounts) {
    this._runs = runs;
    this._results = results;
    this._resultsCounts = resultsCounts;
}

WK.TestResultHistory.prototype = {
    __proto__: WK.Object,
    constructor: WK.TestResultHistory,

    get runs()
    {
        return this._runs;
    },

    forEachSingleResult: function(callback) {
        // Invokes callback for every single result, including repeats.
        this.forEachRepeatGroup(function(runs, result) {
            for (var i = 0; i < runs.length; ++i)
                callback(runs[i], result);
        });

    },

    forEachRepeatGroup: function(callback) {
        // Invokes callback for every result, excluding repeated results.
        var run_i = 0;
        for (var i = 0; i < this._results.length; ++i) {
            var repeatCount = this._resultsCounts[i];
            var runs = this._runs.slice(run_i, repeatCount);
            callback(runs, this._results[i]);
            run_i += repeatCount;
        }
    }
}

WK.TestResultHistory.fromPayload = function(payload, runs) {
    var zippedResults = [];
    var zippedResultsCounts = [];

    var results = payload.results;
    var times = payload.times;

    var result_i = 0, result_j = 0;
    var time_i = 0, time_j = 0;
    var repeatCount = 0;

    for (var run_i = 0; run_i < runs.length; ++run_i) {
        var shouldFlush = false;
        result_j += 1;
        time_j += 1;

        // If we need to get the next chunk, move indices and flush.
        if (result_j === results[result_i][0]) {
            result_i += 1;
            result_j = 0;
            shouldFlush = true;
        }

        if (time_j === times[time_i][0]) {
            time_i += 1;
            time_j = 0;
            shouldFlush = true;
        }

        // But don't flush if there are no more chunks. This should be the end.

        // FIXME: it should be the case that these end at the same time, but
        // there is a bug in the backend's code to truncate results to a max
        // number of builds. It only truncates later run-length-encoded entries,
        // but does not adjust the last entry even if it would sum to greater
        // than the max number of builds. I think the faulty code is here:
        //
        // Tools/Scripts/TestResultServer/model/jsonresults.py#_remove_items_over_max_number_of_builds
        if (result_i === results.length || time_i === times.length)
            break;

        if (shouldFlush) {
            var time = times[time_i][1];
            var outcome = WK.TestResult.Outcome.fromCharacter(results[result_i][1]);
            zippedResults.push(new WK.TestResult(time, outcome));
            zippedResultsCounts.push(repeatCount + 1);
            repeatCount = 0;
        } else
            repeatCount += 1;
    }

    return new WK.TestResultHistory(runs, zippedResults, zippedResultsCounts);
}
