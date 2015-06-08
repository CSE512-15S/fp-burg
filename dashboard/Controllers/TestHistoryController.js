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

WK.TestHistoryController = function() {
    WK.Object.call(this);

    // First, set up data sources.
    this._builderHistoryDataSource = new WK.BuilderHistoryDataSource(this, "https://webkit-test-results.appspot.com/");
    this._builderListDataSource = new WK.BuilderListDataSource("./Legacy/builders.jsonp");
    this._builderListDataSource.loadBuilders()
        .then(this._buildersListLoaded.bind(this));

    this._testIndex = new WK.TestResultIndex();

    var contentElement = document.getElementById("content");
    this._viewContainer = new WK.DashboardViewContainer(contentElement, this._testIndex);
}

WK.TestHistoryController.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.TestHistoryController,

    // Public

    get testIndex()
    {
        return this._testIndex;
    },

    showOverview: function()
    {
        this._viewContainer.showDashboardViewForRepresentedObject(this._testIndex);
    },

    showDetailsForTest: function(test)
    {
        this._viewContainer.showDashboardViewForRepresentedObject(test, this._testIndex);
    },

    showDetailsForTestResult: function(testResult)
    {
        this._viewContainer.showDashboardViewForRepresentedObject(testResult);
    },

    // Private

    _buildersListLoaded: function(builders)
    {
        // FIXME: more intelligent show/hide of platforms, builders, configurations.
        this._testIndex.builders = builders.slice(0, 6);

        var histories = _.map(this._testIndex.builders, function(builder) {
            return this._builderHistoryDataSource.fetchHistoryForBuilder(builder)
                .then(this._updateTestIndicesFromHistory.bind(this));
        }, this);

        Promise.all(histories).then(this._allResultsLoaded.bind(this));
    },

    _allResultsLoaded: function()
    {
        this.showOverview();
    },

    _updateTestIndicesFromHistory: function(history)
    {
        console.assert(history instanceof WK.BuilderHistory, history);

        history.resultsByTest.forEach(function(result, test) {
            this._testIndex.addBuilderResultsForTest(test, history, result);
        }, this);
    }
};
