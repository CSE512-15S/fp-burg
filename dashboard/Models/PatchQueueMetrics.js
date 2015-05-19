/*
 * Copyright (C) 2014 Apple Inc. All rights reserved.
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

WK.PatchQueueMetrics = function(patchQueue, relevantPatches, allAttempts)
{
    WK.Object.call(this);

    console.assert(patchQueue instanceof WK.PatchQueue, patchQueue);
    this.queue = patchQueue;
    this._patches = relevantPatches; // Is this needed?
    this._attempts = _.filter(allAttempts, function(attempt) {
        return attempt.queueId === patchQueue.id;
    });
};

WK.PatchQueueMetrics.prototype = {
    constructor: WK.PatchQueueMetrics,
    __proto__: WK.Object.prototype,

    get attemptCount() { return this.metrics["all"].count; },

    get metrics() {
        if (!this._metrics)
            this._metrics = this._computeMetrics();

        return this._metrics;
    },

    getData: function(ordinal, outcome)
    {
        var metrics = this.metrics;
        var label = this._labelForOutcome(ordinal, outcome);
        return metrics[label];
    },

    getSummaryForOutcome: function(outcome)
    {
        var durations = [];
        for (var i = 1; i <= 3; ++i) {
            var data = this.getData(i, outcome);
            durations = durations.concat(data.processing_times);
        }

        console.log(durations);

        return {
            process_times: durations,
            process_avg: durations.average(),
            process_med: durations.median(),
            process_max: _.max(durations),
            count: durations.length,
        };
    },

    getSummaryForAttempt: function(ordinal)
    {
        var totalData = this.metrics["all"];

        function computeSummary(ordinal, outcome) {
            var data = this.getData(ordinal, outcome);

            var adjustedCount = data.count;
            if (outcome === WK.PatchAttempt.Outcome.Retry) {
                for (var i = ordinal; i <= 3; ++i) {
                    for (var key in WK.PatchAttempt.Outcome) {
                        adjustedCount += this.getData(i, WK.PatchAttempt.Outcome[key]).count;
                    }
                }
            }

            return {
                percentString: (adjustedCount / totalData.count * 100).toFixed(1) + '%',
                count: adjustedCount,

                wait_med: data.wait_times.median(),
                wait_avg: data.wait_times.average(),
                wait_min: _.min(data.wait_times),
                wait_max: _.max(data.wait_times),

                process_med: data.processing_times.median(),
                process_avg: data.processing_times.average(),
                process_min: _.min(data.processing_times),
                process_max: _.max(data.processing_times),
            }
        }

        return {
            "pass": computeSummary.call(this, ordinal, WK.PatchAttempt.Outcome.Pass),
            "fail": computeSummary.call(this, ordinal, WK.PatchAttempt.Outcome.Fail),
            "abort": computeSummary.call(this, ordinal, WK.PatchAttempt.Outcome.Abort),
            "retry": computeSummary.call(this, ordinal, WK.PatchAttempt.Outcome.Retry),

            "ordinalString": ordinal >= 3 ? "3+" : ordinal,
        }
    },

    // Private

    _labelForOutcome: function(ordinal, outcome)
    {
        if (!ordinal)
            return "work-queue";

        ordinal = Math.min(ordinal, 3);

        return "attempt-" + ordinal + "-" + outcome;
    },

    _computeMetrics: function()
    {
        function tabulateAttempt(attempt, bin) {
            bin.count += 1;
            bin.wait_times.push(attempt.waitDuration);
            bin.processing_times.push(attempt.processDuration);
        }

        var binLabels = [
            "work-queue",
            "attempt-1-outcome-pass",
            "attempt-1-outcome-fail",
            "attempt-1-outcome-retry",
            "attempt-1-outcome-abort",
            "attempt-1-outcome-error",
            "attempt-1-outcome-pending",
            "attempt-2-outcome-pass",
            "attempt-2-outcome-fail",
            "attempt-2-outcome-retry",
            "attempt-2-outcome-abort",
            "attempt-2-outcome-error",
            "attempt-2-outcome-pending",
            "attempt-3-outcome-pass",
            "attempt-3-outcome-fail",
            "attempt-3-outcome-retry",
            "attempt-3-outcome-abort",
            "attempt-3-outcome-error",
            "attempt-3-outcome-pending",
            "all"
        ];

        var bins = {};

        _.each(binLabels, function(label) {
            bins[label] = {
                count: 0,
                wait_times: [],
                processing_times: [],
            };
        });

        _.each(this._attempts, function(attempt) {
            var label = this._labelForOutcome(attempt.ordinal, attempt.outcome);
            tabulateAttempt(attempt, bins[label]);
            tabulateAttempt(attempt, bins["all"]);
        }, this);

        return bins;
    }
};
