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

WK.TestHistoryOverview = function(testIndex) {
    WK.DashboardView.call(this, testIndex);

    this._testIndex = testIndex;

    this._descriptionElement = document.createElement("div");
    this._descriptionElement.textContent = "Showing: ";

    var resultTypes = [
        new WK.ScopeBarItem("any-result", "Any", true),
        new WK.ScopeBarItem(WK.TestResult.AggregateOutcome.Pass, "Pass"),
        new WK.ScopeBarItem(WK.TestResult.AggregateOutcome.Fail, "Fail"),
        new WK.ScopeBarItem(WK.TestResult.AggregateOutcome.Crash, "Crash"),
        new WK.ScopeBarItem(WK.TestResult.AggregateOutcome.Timeout, "Timeout")
    ];
    this._resultTypeFilter = new WK.ScopeBar("test-result-type", resultTypes, resultTypes[0]);
    this._resultTypeFilter.addEventListener(WK.ScopeBar.Event.SelectionChanged, this._filtersChanged, this);

    var problemTypes = [
        new WK.ScopeBarItem("any-problem", "Any", true),
        new WK.ScopeBarItem("flaky", "Flaky"),
        new WK.ScopeBarItem("slow", "Slow"),
        new WK.ScopeBarItem("wrong-result", "Unexpected"),
    ];
    this._problemTypeFilter = new WK.ScopeBar("problem-type", problemTypes, problemTypes[0]);
    this._problemTypeFilter.addEventListener(WK.ScopeBar.Event.SelectionChanged, this._filtersChanged, this);

    this._filterConfigs = [
        // FIXME: Didn't have time to port the code necessary to classify flakes, slow, etc. based
        // on test expectations. Change the visibility CSS rule to make it show again.
        {label: "Problem", filter: this._problemTypeFilter},
        {label: "Result", filter: this._resultTypeFilter},
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

    var settingsContainer = this._settingsElement = document.createElement("div");
    this._settingsElement.className = "settings-container";
    this.element.appendChild(this._settingsElement);

    _.chain(this._filterConfigs)
     .map(createRowForFilter)
     .each(function(row) { settingsContainer.appendChild(row); });

    var suppressIncrementalSearch = true;
    this._searchBar = new WK.SearchBar("filter-test-name", "Search Tests", this, suppressIncrementalSearch);
    this._searchBar.addEventListener(WK.SearchBar.Event.TextChanged, this._searchBarTextChanged, this);

    this._gridView = new WK.TestHistoryOverviewGrid(this._testIndex);
    this._gridView.cornerElement.appendChild(this._searchBar.element);
    this.element.appendChild(this._gridView.element);

    this._testIndex.addEventListener(WK.TestResultIndex.Event.BuildersChanged, this._buildersChanged, this);

    // Set up initial view state.
    this._buildersChanged();
    this._filtersChanged();
}

WK.TestHistoryOverview.prototype = {
    __proto__: WK.DashboardView.prototype,
    constructor: WK.TestHistoryOverview,

    // Public

    refresh: function()
    {
        var testsToDisplay = [];
        var searchString = this._searchBar.text;
        if (searchString.length)
            testsToDisplay = this._testIndex.testsMatchingSearchString(searchString);
        else
            testsToDisplay = this._testIndex.allTests;

        testsToDisplay = _.filter(testsToDisplay, function(test) {
            var testResults = this._testIndex.findResultsForTest(test);
            var allowedOutcomes = this._resultTypeFilter.selectedItems;

            for (var testHistory of testResults.values()) {
                for (var outcome of allowedOutcomes) {
                    if (outcome.label === "Any" || testHistory.containsOutcome(outcome.id))
                        return true;
                }
            }

            return false;
        }, this);

        // TODO: more filters go here.

        testsToDisplay = _.sortBy(testsToDisplay, "fullName");

        this._gridView.tests = testsToDisplay;
    },

    // Overrides

    get settingsElement()
    {
        return this._settingsElement;
    },

    get descriptionElement()
    {
        return this._descriptionElement;
    },

    // Protected delegates

    searchBarDidActivate: function()
    {
        this._searchBarTextChanged();
    },

    // Private

    _searchBarTextChanged: function()
    {
        this.refresh();
    },

    _descriptionForActiveFilters: function()
    {
        var fragments = [];

        _.each(this._filterConfigs, function(config, i, configs) {
            var selectedItems = config.filter.selectedItems;
            if (selectedItems.length === 1 && selectedItems[0].isExclusive)
                fragments.push(document.createTextNode("Any " + config.label));
            else {
                fragments.push(document.createTextNode(config.label + ": "));

                _.each(config.filter.selectedItems, function(item, j, items) {
                    var span = document.createElement("span");
                    span.textContent = item.label;
                    span.className = "filter-value " + item.id;
                    fragments.push(span);
                    if (j < items.length - 1)
                        fragments.push(document.createTextNode(" | "));
                });
            }

            if (i < configs.length - 1)
                fragments.push(document.createTextNode(", "));
        });

        var description = document.createElement("span");
        for (var i = 0; i < fragments.length; ++i)
            description.appendChild(fragments[i]);

        return description;
    },

    _filtersChanged: function(event)
    {
        event = event || {};

        if (event.target instanceof WK.ScopeBar) {
            var filter = event.target;
            if (filter.selectedItems.length === filter.items.length - 1) {
                filter.items[0].selected = true;
                return;
            }
        }
        this._descriptionElement.removeChildren();
        this._descriptionElement.appendChild(this._descriptionForActiveFilters());

        this.refresh();
    },

    _buildersChanged: function(event)
    {
        this._gridView.builders = this._testIndex.builders;
        this.refresh();
    }
};
