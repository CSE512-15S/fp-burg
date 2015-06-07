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

WK.TestResultsOverviewController = function() {
    WK.Object.call(this);

    // First, set up data sources.
    this._builderHistoryDataSource = new WK.BuilderHistoryDataSource(this, "https://webkit-test-results.appspot.com/");
    this._builderListDataSource = new WK.BuilderListDataSource("./Legacy/builders.jsonp");
    this._builderListDataSource.loadBuilders()
        .then(this._buildersListLoaded.bind(this));

    this._testIndex = new WK.TestResultIndex();

    this._maxTestRuns = 0;

    // Build the UI skeleton.
    this.element = document.getElementById("content");
    var headerElement = document.createElement("h1");
    headerElement.textContent = "Test Results History";
    this.element.appendChild(headerElement);

    this._headerIntervalLabelElement = document.createElement("span");
    this._headerIntervalLabelElement.textContent = "(loading)";
    headerElement.appendChild(this._headerIntervalLabelElement);

    var settingsContainer = this.settingsContainerElement = document.createElement("div");
    this.settingsContainerElement.className = "settings-container";
    this.element.appendChild(this.settingsContainerElement);

    var resultTypes = [
        new WK.ScopeBarItem("any-result", "Any", true),
        new WK.ScopeBarItem("pass", "Pass"),
        new WK.ScopeBarItem("fail", "Fail"),
        new WK.ScopeBarItem("crash", "Crash"),
        new WK.ScopeBarItem("timeout", "Timeout")
    ];
    this._resultTypeFilter = new WK.ScopeBar("test-result-type", resultTypes, resultTypes[0]);

   var problemTypes = [
        new WK.ScopeBarItem("any-problem", "Any", true),
        new WK.ScopeBarItem("flaky", "Flaky"),
        new WK.ScopeBarItem("slow", "Slow"),
        new WK.ScopeBarItem("wrong-result", "Unexpected"),
    ];
    this._problemTypeFilter = new WK.ScopeBar("problem-type", problemTypes, problemTypes[0]);

    this._filterConfigs = [
        {label: "Result", filter: this._resultTypeFilter},
        {label: "Problem", filter: this._problemTypeFilter}
    ];

    function createRowForFilter(config) {
        var row = document.createElement("div");
        row.className = "filter-setting row";
        var label = document.createElement("span");
        label.className = "row-label";
        label.textContent = config.label;
        row.appendChild(label);
        row.appendChild(config.filter.element);
        return row;
    }

    _.chain(this._filterConfigs)
     .map(createRowForFilter)
     .each(function(row) { settingsContainer.appendChild(row); });

    var suppressIncrementalSearch = true;
    this._searchBar = new WK.SearchBar("filter-test-name", "Search Tests", this, suppressIncrementalSearch);
    this._searchBar.addEventListener(WK.SearchBar.Event.TextChanged, this._searchBarTextChanged, this);

    this._gridView = new WK.BuilderHistoryGridView(this);
    this._gridView.cornerElement.appendChild(this._searchBar.element);
    this.element.appendChild(this._gridView.element);

    // Set up initial view state.
}

WK.TestResultsOverviewController.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.TestResultsOverviewController,

    // Public
    get testIndex()
    {
        return this._testIndex;
    },

    // Protected delegates

    searchBarDidActivate: function()
    {
        this._searchBarTextChanged();
    },

    // Private

    _searchBarTextChanged: function()
    {
        this._populateResultsGrid();
    },

    _descriptionForActiveFilters: function()
    {
        function descriptionForSingleFilter(scopeBar) {
            return _.map(scopeBar.selectedItems, function(item){
                return item.label;
            }).join("+");
        }

        return _.map(this._filterConfigs, function(config) {
            return config.label + ": " + descriptionForSingleFilter(config.filter);
        }).join(", ");
    },

    _buildersListLoaded: function(builders)
    {
        this._builders = builders;

        // FIXME: more intelligent show/hide of platforms, builders, configurations.
        var buildersToDisplay = builders.slice(0, 6);
        this._gridView.builders = buildersToDisplay;

        var histories = _.map(buildersToDisplay, function(builder) {
            return this._builderHistoryDataSource.fetchHistoryForBuilder(builder)
                .then(this._updateTestIndicesFromHistory.bind(this));
        }, this);

        Promise.all(histories).then(this._populateResultsGrid.bind(this));
    },

    _populateResultsGrid: function()
    {
        var testsToDisplay = [];
        var searchString = this._searchBar.text;
        if (searchString.length)
            testsToDisplay = this._testIndex.testsMatchingSearchString(searchString);
        else
            testsToDisplay = this._testIndex.allTests;

        testsToDisplay = _.sortBy(testsToDisplay, "fullName");

        // TODO: more filters go here.
        this._gridView.tests = testsToDisplay;
    },

    _updateTestIndicesFromHistory: function(history)
    {
        console.assert(history instanceof WK.BuilderHistory, history);

        history.resultsByTest.forEach(function(result, test) {
            this._testIndex.findResultsForTest(test).set(history.builder, result);
        }, this);

        this._maxTestRuns = Math.max(this._maxTestRuns, history.runs.length);
        this._headerIntervalLabelElement.textContent = "(Last " + this._maxTestRuns + " Runs)";
    }
};
