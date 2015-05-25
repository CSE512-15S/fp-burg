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

WK.TestResultHistorySparklineView = function(testResults) {
    WK.Object.call(this);

    console.assert(testResults instanceof WK.TestResultHistory, testResults);

    this._results = testResults;

    this.element = document.createElement("div");
    this.element.className = "test-results-sparkline";

    this.element.addEventListener("click", this._sparklineClicked.bind(this));

    this._boundRenderFunction = this.render.bind(this);
    this.renderSoon();
};

WK.TestResultHistorySparklineView.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.TestResultHistorySparklineView,

    // Public

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

        var width = 150;
        var height = 25;

        var x = d3.scale.linear()
            .domain([0, runs.length])
            .rangeRound([0, width]);

        var y = d3.scale.linear()
            .domain([0, 30])
            .range([0, height]);

        var svg = d3.select(this.element).append("svg")
            .attr("width", width)
            .attr("height", height);

        var resultCount = 0;
        var timingData = [];
        this._results.forEachRepeatGroup(function(repeatedRuns, result) {
            timingData.push({
                begin: resultCount,
                repeat: repeatedRuns.length,
                outcome: result.outcome,
                duration: result.duration
            });

            resultCount += repeatedRuns.length;
        })

        var base = runs.length - resultCount, repeat = 0;
        var repeatData = [];
        var currentOutcome = timingData[0].outcome;
        function addRepeatedOutcome() {
            repeatData.push({
                begin: base,
                repeat: repeat,
                outcome: currentOutcome
            });
        }

        for (var i = 0; i < timingData.length; ++i) {
            if (timingData[i].outcome !== currentOutcome) {
                addRepeatedOutcome();
                currentOutcome = timingData[i].outcome;
                base += repeat;
                repeat = 0;
            }
            repeat += timingData[i].repeat;
        }
        addRepeatedOutcome();

        svg.selectAll(".repeat-block")
        .data(repeatData)
        .enter()
            .append("rect")
            .attr("class", function(d) { return "repeat-block " + d.outcome; })
            .attr("x", function(d) { return x(d.begin); })
            .attr("width", function(d) { return x(d.repeat); })
    },

    // Private

    _sparklineClicked: function(event)
    {
        console.log("relevant data: ", this._results);
    }
};
