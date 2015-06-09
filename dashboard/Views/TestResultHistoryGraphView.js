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

WK.TestResultHistoryGraphView = function(testResults) {
    WK.Object.call(this);

    console.assert(testResults instanceof WK.TestResultHistory, testResults);

    this._results = this.representedObject = testResults;

    this.element = document.createElement("div");
    this.element.className = "test-results-graph";

    this.maxDuration = 30;

    this._boundRenderFunction = this.render.bind(this);

    this.precomputeData();
    this.renderSoon();
};

WK.Object.addConstructorFunctions(WK.TestResultHistoryGraphView);

WK.TestResultHistoryGraphView.Event = {
    RunSelectionChanged: "graph-view-run-selection-changed"
}

WK.TestResultHistoryGraphView.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.TestResultHistoryGraphView,

    // Public

    get selectedRuns()
    {
        return this._selectedRuns;
    },

    set selectedRuns(value)
    {
        if (Object.shallowEqual(this._selectedRuns, value))
            return;

        if (!(value instanceof Array))
            value = [value];

        this._selectedRuns = value;
        this.renderSoon();
    },

    precomputeData: function()
    {
        var maxDuration = this.maxDuration;
        var resultCount = 0;
        var timingData = [];
        this._results.forEachRepeatGroup(function(repeatedRuns, result) {
            timingData.push({
                begin: resultCount,
                repeat: repeatedRuns.length,
                outcome: result.outcome,
                duration: Math.min(result.duration, maxDuration)
            });

            resultCount += repeatedRuns.length;
        })

        var missingResultCount = this._results.runs.length - resultCount;
        var base = missingResultCount, repeat = 0;
        var repeatData = [];
        var currentOutcome = timingData[0].outcome;
        var currentDuration = timingData[0].duration;
        function addRepeatedOutcome() {
            repeatData.push({
                begin: base,
                repeat: repeat,
                outcome: currentOutcome,
                duration: currentDuration
            });
        }

        for (var i = 0; i < timingData.length; ++i) {
            if (timingData[i].outcome !== currentOutcome) {
                addRepeatedOutcome();
                currentOutcome = timingData[i].outcome;
                currentDuration = timingData[i].duration;
                base += repeat;
                repeat = 0;
            }
            repeat += timingData[i].repeat;
        }
        addRepeatedOutcome();

        this._aggregates = {
            repeatData: repeatData,
            timingData: timingData,
            missingResultCount: missingResultCount,
        };
    },

    renderSoon: function()
    {
        if (this._requestAnimationFrameToken)
            return;

        this._requestAnimationFrameToken = window.requestAnimationFrame(this._boundRenderFunction) || true;
    },

    render: function()
    {
        if (this._requestAnimationFrameToken)
            this._requestAnimationFrameToken = undefined;

        var runs = this._results.runs;

        var availWidth = 780;
        var padding = 2;
        var width = availWidth - 2 * padding;
        var totalWidth = width;

        var totalHeight = 72;
        var gutterHeight = 16;
        var graphHeight = totalHeight - (2 * gutterHeight);
        var maxDuration = this.maxDuration;
        var missingResultCount = this._aggregates.missingResultCount;

        // For rect fills, don't round because it can cause see-through gaps.
        // It's more acceptable to have some blurred edges. For lines, always
        // use the rounded version otherwise everything will be a smudgy mess.
        var x = d3.scale.linear()
            .domain([0, runs.length])
            .range([0, width]);
        var roundX = x.copy()
            .rangeRound(x.range());

        var y =  d3.scale.linear()
            .domain([0, maxDuration])
            .rangeRound([1, graphHeight - 1]);
        var roundY = y.copy()
            .rangeRound(y.range());

        if (!this.svg) {
            this.svg = d3.select(this.element).append("svg")
                .attr("width", totalWidth)
                .attr("height", totalHeight);
        }

        var svg = this.svg;

        svg.selectAll(".repeat-block")
        .data(this._aggregates.repeatData).enter()
            .append("rect")
            .attr("class", function(d) { return "repeat-block " + d.outcome; })
            .attr("x", function(d) { return x(d.begin); })
            .attr("width", function(d) { return x(d.repeat); })
            .attr("y", 1 + gutterHeight + roundY(0))
            .attr("height", roundY(maxDuration));

            console.log(this._timingData);

        svg.selectAll(".repeat-lines")
        .data(this._aggregates.timingData).enter()
            .append("line")
            .attr("class", function(d) { return "repeat-lines " + d.outcome; })
            .attr("x1", function(d) { return roundX(d.begin + missingResultCount); })
            .attr("y1", function(d) { return 1 + gutterHeight + roundY(maxDuration - d.duration); })
            .attr("x2", function(d) { return roundX(d.begin + d.repeat + missingResultCount); })
            .attr("y2", function(d) { return 1 + gutterHeight + roundY(maxDuration - d.duration); });

        var circleRadius = 3;

        svg.selectAll(".critical-bubbles")
        .data(this._aggregates.repeatData).enter()
            .append("circle")
            .attr("class", function(d) { return "critical-bubbles " + d.outcome; })
            .attr("cx", function(d) { return roundX(d.begin) + circleRadius; })
            .attr("cy", 1 + gutterHeight / 2)
            .attr("r", circleRadius);


        var widget = this;

         function textLabelForRun(run) {
            switch (run.data.outcome) {
            case WK.TestResult.Outcome.Pass:
                return run.data.duration + "s";
            case WK.TestResult.Outcome.FailText:
            case WK.TestResult.Outcome.FailImage:
            case WK.TestResult.Outcome.FailAudio:
                return "FAIL";
            case WK.TestResult.Outcome.Timeout:
                return "TIMEOUT";
            case WK.TestResult.Outcome.Crash:
                return "CRASH";
            case WK.TestResult.Outcome.Skip:
            case WK.TestResult.Outcome.Missing:
            case WK.TestResult.Outcome.NoData:
            default:
                return "UNKNOWN";
            }
        }

        // Find our repeat data for this run.
        var timingData = this._aggregates.timingData;
        var selectedRunsData = _.map(this.selectedRuns, function(runOrdinal) {
            for (var i = 0; i < timingData.length; ++i) {
                if (timingData[i].begin + timingData[i].repeat > runOrdinal) {
                    return {ordinal: runOrdinal, data: timingData[i]};
                }
            }
            return null;
        }, this);

        function keyForRunData(run) { return run.ordinal; }

        var overlay = svg.selectAll(".selection-overlay").data(selectedRunsData, keyForRunData);
        overlay.enter()
            .append("rect")
            .attr("class", function(d) { return "selection-overlay " + d.data.outcome; })
            .attr("opacity", 1)
            .attr("x", function(d) { return roundX(d.ordinal); })
            .attr("y", 1 + gutterHeight + roundY(0))
            .attr("width", x(1))
            .attr("height", roundY(maxDuration))
        overlay.exit()
            .remove();

        var label = svg.selectAll(".selection-text").data(selectedRunsData, keyForRunData);
        label.enter()
            .append("text")
            .attr("class", function(d) { return "selection-text " + d.data.outcome; })
            .attr("opacity", 1)
            .attr("x", function(d) { return roundX(d.ordinal + 0.5); })
            .attr("y", 1 + gutterHeight + roundY(maxDuration) + gutterHeight)
            .attr("height", gutterHeight)
            .attr("text-anchor", "middle")
            .text(textLabelForRun)
        label.exit()
            .remove();

        function mouseleave() {
            this.dispatchEventToListeners(WK.TestResultHistoryGraphView.Event.RunSelectionChanged, {ordinals: []});
        }

        svg
        .on("mouseleave", mouseleave.bind(this))
        .on("mousemove", function() {
            var mouseX = d3.mouse(this)[0];
            if (mouseX < x.range()[0] || mouseX > x.range()[1]) {
                mouseleave.call(this);
                return;
            }

            var runOrdinal = Math.floor(x.invert(mouseX));
            widget.dispatchEventToListeners(WK.TestResultHistoryGraphView.Event.RunSelectionChanged, {ordinals: [runOrdinal]});
        });
    },
};
