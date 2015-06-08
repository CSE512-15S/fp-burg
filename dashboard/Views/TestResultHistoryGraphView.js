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

    this.precomputeData();

    this._boundRenderFunction = this.render.bind(this);
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

    precomputeData: function()
    {
        var maxDuration = this.maxDuration;
        var resultCount = 0;
        var timingData = this._timingData = [];
        this._results.forEachRepeatGroup(function(repeatedRuns, result) {
            timingData.push({
                begin: resultCount,
                repeat: repeatedRuns.length,
                outcome: result.outcome,
                duration: Math.min(result.duration, maxDuration)
            });

            resultCount += repeatedRuns.length;
        })

        var missingResultCount = this._missingResultCount = this._results.runs.length - resultCount;
        var base = this._missingResultCount, repeat = 0;
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

        this._repeatData = repeatData;
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
        var missingResultCount = this._missingResultCount;

        // For rect fills, don't round because it can cause see-through gaps.
        // It's more acceptable to have some blurred edges. For lines, always
        // use the rounded version otherwise everything will be a smudgy mess.
        var x = this._x = d3.scale.linear()
            .domain([0, runs.length])
            .range([0, width]);
        var roundX = this._roundX = x.copy()
            .rangeRound(x.range());

        var y = this._y = d3.scale.linear()
            .domain([0, maxDuration])
            .rangeRound([1, graphHeight - 1]);
        var roundY = y.copy()
            .rangeRound(y.range());

        var svg = this._svgElement = d3.select(this.element).append("svg")
            .attr("width", totalWidth)
            .attr("height", totalHeight);

        svg.selectAll(".repeat-block")
        .data(this._repeatData).enter()
            .append("rect")
            .attr("class", function(d) { return "repeat-block " + d.outcome; })
            .attr("x", function(d) { return x(d.begin); })
            .attr("width", function(d) { return x(d.repeat); })
            .attr("y", 1 + gutterHeight + roundY(0))
            .attr("height", roundY(maxDuration));

            console.log(this._timingData);

        svg.selectAll(".repeat-lines")
        .data(this._timingData).enter()
            .append("line")
            .attr("class", function(d) { return "repeat-lines " + d.outcome; })
            .attr("x1", function(d) { return roundX(d.begin + missingResultCount); })
            .attr("y1", function(d) { return 1 + gutterHeight + roundY(maxDuration - d.duration); })
            .attr("x2", function(d) { return roundX(d.begin + d.repeat + missingResultCount); })
            .attr("y2", function(d) { return 1 + gutterHeight + roundY(maxDuration - d.duration); });

        var overlay = this._overlayElement = svg.append("rect")
            .attr("class", "selection-overlay")
            .attr("opacity", 0)
            .attr("x", 0)
            .attr("y", 1 + gutterHeight + roundY(0))
            .attr("width", x(1))
            .attr("height", roundY(maxDuration));

        var widget = this;

        svg
        .on("mouseleave", this._mouseleaveGraph.bind(this))
        .on("mouseenter", this._mouseenterGraph.bind(this))
        .on("mousemove", function() {
            var mouseX = d3.mouse(this)[0];
            if (mouseX < x.range()[0] || mouseX > x.range()[1]) {
                this._mouseleaveGraph();
                return;
            }

            var runOrdinal = Math.floor(x.invert(mouseX));
            widget.dispatchEventToListeners(WK.TestResultHistoryGraphView.Event.RunSelectionChanged, {ordinal: runOrdinal});
        });
    },

    set selectedRunOrdinal(ordinal)
    {
        if (ordinal === null || ordinal < 0 || ordinal > this._results.runs.length - 1) {
            this._mouseleaveGraph();
            return;
        }

        // Find our repeat data for this run.
        var data = null;
        for (var i = 0; i < this._repeatData.length; ++i) {
            if (this._repeatData[i].begin + this._repeatData[i].repeat > ordinal) {
                data = this._repeatData[i];
                break;
            }
        }

        if (!data)
            return;

        this._mouseenterGraph();
        this._overlayElement.attr("x", this._roundX(ordinal));
    },

    // Private

    _mouseleaveGraph: function()
    {
        this._overlayElement.attr("opacity", 0);
        this.dispatchEventToListeners(WK.TestResultHistoryGraphView.Event.RunSelectionChanged, {ordinal: null});
    },

    _mouseenterGraph: function()
    {
        this._overlayElement.attr("opacity", 1);
    },
};
