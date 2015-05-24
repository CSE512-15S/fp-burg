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

WK.BuilderHistoryGridView = function(delegate) {
    WK.Object.call(this);

    console.assert(delegate);

    this._delegate = delegate;

    this._builders = [];
    this._tests = [];

    this.element = document.createElement("table");
    this.element.className = "builder-history-grid";

    this._boundRenderFunction = this.render.bind(this);
};

WK.BuilderHistoryGridView.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.BuilderHistoryGridView,

    // Public

    get builders()
    {
        return this._builders.slice();
    },

    set builders(value)
    {
        this._builders = value;
        this.renderSoon();
    },

    get tests()
    {
        return this._tests.slice();
    },

    set tests(value)
    {
        this._tests = value;
        this.renderSoon();
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

        if (!this._tests.length || !this._builders.length)
            return;

        console.log("rendering");

        this.element.removeChildren();

        var colgroup = document.createElement("colgroup");
        for (var i = -1; i < this._builders.length; ++i)
            colgroup.appendChild(document.createElement("col"));
        this.element.appendChild(colgroup);

        var thead = document.createElement("thead");
        var trhead = document.createElement("tr");
        thead.appendChild(trhead);
        var thleftcorner = this.cornerElement = document.createElement("th");
        trhead.appendChild(thleftcorner);

        _.each(this._builders, function(builder) {
            var th = document.createElement("th");
            th.textContent = builder.name;
            trhead.appendChild(th);
        });

        this.element.appendChild(thead);
        var tbody = document.createElement("tbody");
        _.each(this._tests, function(test) {
            var testResults = this._delegate.testIndex.findResultsForTest(test);

            var tr = document.createElement("tr");
            var tdtest = document.createElement("td");
            tdtest.textContent = test.trimmedName(65);
            tr.appendChild(tdtest);
            _.each(this._builders, function(builder) {
                var cell = document.createElement("td");

                var builderResult = testResults.get(builder);
                if (builderResult) {
                    var sparkline = new WK.TestResultHistorySparklineView(builderResult);
                    cell.appendChild(sparkline.element);
                } else {
                    cell.textContent = "PASS / SKIP";
                }

                tr.appendChild(cell);
            }, this);
            tbody.appendChild(tr);
        }, this);
        this.element.appendChild(tbody);
    }
};
