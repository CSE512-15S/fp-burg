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

WK.TestHistoryView = function(test, testIndex) {
    WK.DashboardView.call(this, test, testIndex);

    this._test = test;
    this._testIndex = testIndex;

    this._descriptionElement = document.createElement("div");
    this._descriptionElement.textContent = "All Results for " + test.fullName;

    this._tableElement = document.createElement("table");
    this._tableElement.className = "test-history-grid";
    this.element.appendChild(this._tableElement);

    this._graphs = [];

    WK.TestResultHistoryGraphView.addEventListener(WK.TestResultHistoryGraphView.Event.RunSelectionChanged, this._runSelectionChanged, this);

    this.render();
}

WK.TestHistoryView.prototype = {
    __proto__: WK.DashboardView.prototype,
    constructor: WK.TestHistoryView,

    // Overrides

    get descriptionElement()
    {
        return this._descriptionElement;
    },

    render: function()
    {
        this._tableElement.removeChildren();
        this._graphs = [];

        var colgroup = document.createElement("colgroup");
        colgroup.appendChild(document.createElement("col"));
        colgroup.appendChild(document.createElement("col"));
        this._tableElement.appendChild(colgroup);

        var tbody = this.tbodyElement = document.createElement("tbody");
        this._tableElement.appendChild(tbody);

        var testResults = this._testIndex.findResultsForTest(this._test);
        _.each(this._testIndex.builders, function(builder) {
            var builderResult = testResults.get(builder);
            var tr = document.createElement("tr");
            tr.representedResult = builderResult;
            var tdbuilder = document.createElement("td");
            tdbuilder.textContent = builder.name;
            tr.appendChild(tdbuilder);
            var cell = document.createElement("td");
            if (builderResult) {
                var graph = new WK.TestResultHistoryGraphView(builderResult);
                this._graphs.push(graph);
                cell.appendChild(graph.element);
            } else {
                cell.textContent = "PASS / SKIP";
            }

            tr.appendChild(cell);
            this.tbodyElement.appendChild(tr);
        }, this);
    },

    // Private

    _runSelectionChanged: function(event) {
        if (this._graphs.indexOf(event.target) === -1)
            return;

        var payload = event.data;
        var ordinal = payload.ordinal;
        for (var i = 0; i < this._graphs.length; ++i)
            this._graphs[i].selectedRunOrdinal = ordinal;
    }
};
