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

WK.PipelineViewController = function() {
    WK.Object.call(this);

    // First, set up data sources.
    this._tracDataSource = new WK.TracDataSource("https://trac.webkit.org/");
    this._tracDataSource.addEventListener(WK.TracDataSource.Event.CommitsUpdated, this._commitDataUpdated, this);

    this._patchQueueDataSource = new WK.PatchQueueDataSource("https://webkit-queues.appspot.com/");

    this.macQueue = this._patchQueueDataSource.queues["mac-wk2-ews"];
    this.iosQueue = this._patchQueueDataSource.queues["ios-ews"];

    this.queues = new Map;
    this.queues.set(this.macQueue.id, this.macQueue);
    this.queues.set(this.iosQueue.id, this.iosQueue);

    this.allPatches = new Map;

    this.macQueueDiagramView = new WK.QueueDiagramView(this.macQueue);
    this.iosQueueDiagramView = new WK.QueueDiagramView(this.iosQueue);

    this.histogramView = new WK.OutcomeHistogramsView(this);
    this.attemptsTableView = new WK.BuildAttemptTableView(this);

    this.diagrams = [
        this.macQueueDiagramView,
        this.iosQueueDiagramView,
    ];

    var pickerElement = this._pickerElement = document.createElement("span");
    pickerElement.id = "range-picker";
    pickerElement.size = 40;
    pickerElement.textContent = "Please select a date range";
    $(".date-selection").append(pickerElement);

    $("#range-picker")
    .dateRangePicker({
        startOfWeek: navigator.language === "en-us" ? "sunday" : "monday",
        endDate: new Date(),
        showShortcuts: false,
        getValue: function() { return this.textContent; },
        setValue: function(value) { this.textContent = value; }
    })
    .on('datepicker-apply', function(event, picker) {
        // This message is dispatched even when range hasn't been selected (or only one endpoint was),
        // in which case the actual range hasn't changed, and there is nothing to do.
        if (isNaN(picker.date1) || isNaN(picker.date2))
            return;

        var endDate = new Date(new Date(picker.date2).setDate(picker.date2.getDate() + 1));
        this._dateRangeChanged(picker.date1, endDate)
    }.bind(this));

    this._queueContainerElement = document.getElementsByClassName("queue-container")[0];
    this._queueContainerElement.classList.add("hidden"); // Start off with nothing.
    var queueListElement = this._queueListElement = document.createElement("ul");
    queueListElement.className = "queue-diagrams";
    queueListElement.appendChild(this.macQueueDiagramView.element);
    queueListElement.appendChild(this.iosQueueDiagramView.element);
    this._queueContainerElement.appendChild(queueListElement);

    WK.QueueDiagramView.addEventListener(WK.QueueDiagramView.Event.SelectionChanged, this._queueDiagramSelectionChanged, this);
    WK.QueueDiagramView.addEventListener(WK.QueueDiagramView.Event.SelectionCleared, this._queueDiagramSelectionCleared, this);

    var detailsSectionElement = this._detailsSectionElement= document.getElementsByClassName("details")[0];
    detailsSectionElement.classList.add("hidden");
    detailsSectionElement.appendChild(this.histogramView.element);
    var tableHeading = document.createElement("h2");
    tableHeading.textContent = "Most Recent Build Attempts";
    detailsSectionElement.appendChild(tableHeading);
    detailsSectionElement.appendChild(document.createElement("hr"));
    detailsSectionElement.appendChild(this.attemptsTableView.element);

    this.element = document.getElementById("content");
    this.element.appendChild(detailsSectionElement);

    var messageContainer = document.getElementsByClassName("status-messages")[0];
    function addMessage(text, className) {
        var li = document.createElement("li");
        li.className = className;
        li.textContent = text;
        messageContainer.appendChild(li);
    }
    addMessage("Loading commit metadata...", "loading-commits");
    addMessage("Loading patch queue data...", "loading-patches");

    // Set up initial state.

    this._selectedDiagram = null;

    // This is synced with the current time selection, but not any other filters.
    this._selectedPatches = [];
}

WK.PipelineViewController.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.PipelineViewController,

    // Public

    setDateRange: function(startDate, endDate)
    {
        $(this._pickerElement).data('dateRangePicker').setDateRange(startDate, endDate);
        this._dateRangeChanged(startDate, endDate);
    },

    get selectedDiagram()
    {
        return this._selectedDiagram;
    },

    set selectedDiagram(value)
    {
        console.assert(!value || value instanceof WK.QueueDiagramView, value);

        _.each(this.diagrams, function(diagram) {
            if (diagram !== value)
                diagram.clearSelection();
        });

        this._selectedDiagram = value;

        if (value)
            this.histogramView.queueMetrics = value.queueMetrics;

        var hasAnySelection = value && (value.selectedOutcome !== null || value.selectedAttemptCount !== null);
        this._detailsSectionElement.classList.toggle("hidden", !hasAnySelection);
    },

    get selectedPatches()
    {
        return this._selectedPatches;
    },

    set selectedPatches(value)
    {
        if (!_.isArray(value))
            return;

        console.log("Selected patches changed: ", value);

        this._selectedPatches = value;
        this._recomputePatchAttempts();
    },

    get allAttempts()
    {
        return this._allAttempts || [];
    },

    get selectedAttempts()
    {
        return this._selectedAttempts;
    },

    set selectedAttempts(value)
    {
        if (!_.isArray(value))
            return;

        console.log("Selected attempts changed: ", value);

        this._selectedAttempts = value;
        this._recomputePatchMetrics();

    },

    getPatchForId: function(patchId)
    {
        if (!this.allPatches.has(patchId))
            this.allPatches.set(patchId, new WK.Patch(patchId));

        return this.allPatches.get(patchId);
    },

    // Private

    _dateRangeChanged: function(startDate, endDate)
    {
        if (this._startDate === startDate && this._endDate === endDate)
            return;

        this._startDate = startDate;
        this._endDate = endDate;

        // This isn't being used, so disable for now.
        //this._tracDataSource.fetchCommitsForDateRange(this._startDate, this._endDate);
        //this.element.classList.add("loading-commits");

        this._patchQueueDataSource.fetchPatchResultsForDateRange(this._startDate, this._endDate, this._patchResultsReceived.bind(this));
        this.element.classList.add("loading-patches");

        if (this.selectedDiagram)
            this.selectedDiagram.clearSelection();
    },

    _commitDataUpdated: function()
    {
        console.log("Fetched commits from trac: ", this._tracDataSource.recordedCommits);

        this.element.classList.remove("loading-commits");
    },

    _patchResultsReceived: function(patchResults)
    {
        console.log("Fetched patchResults from queue server: ", patchResults);

        this.element.classList.remove("loading-patches");

        var selectedPatches = [];
        _.each(patchResults, function(result) {
            var patch = this.getPatchForId(result.patchId);
            patch.results = result;
            selectedPatches.push(patch);
        }, this);

        this.selectedPatches = selectedPatches;
    },

    _queueDiagramSelectionCleared: function(event)
    {
        if (this.selectedDiagram === event.target)
            this.selectedDiagram = null;
    },

    _queueDiagramSelectionChanged: function(event)
    {
        var diagram = event.target;
        this.selectedDiagram = diagram;
        console.log("Selection changed:", diagram, diagram.selectedAttemptCount, diagram.selectedOutcome);
    },

    _recomputePatchAttempts: function()
    {
        var filters = [];

/*
        if (this.selectedDiagram) {
            filters.push(function(attempt) {

            })
            attempt.XXX === this.selectedDiagram.selectedAttemptCount &&
            attempt.XXX === this.selectedDiagram.selectedOutcome
        }
*/

        var composedFilters = _.compose.apply(filters);
        var allAttempts = [];
        var selectedAttempts = [];
        _.each(this.selectedPatches, function(patch) {
            if (!patch.results)
                return;

            for (var i = 0; i < patch.results.attempts.length; ++i) {
                var attempt = patch.results.attempts[i];
                allAttempts.push(attempt);

                if (filters.length && composedFilters(attempt))
                    continue;

                selectedAttempts.push(attempt);
            }
        }, this);

        this._allAttempts = allAttempts;
        this.selectedAttempts = selectedAttempts;
    },

    _recomputePatchMetrics: function()
    {
        this.attemptsTableView.attempts = this.selectedAttempts;

        this._queueContainerElement.classList.remove("hidden");

        this.macQueueDiagramView.queueMetrics = new WK.PatchQueueMetrics(this.macQueue, this.selectedPatches, this.allAttempts);
        this.iosQueueDiagramView.queueMetrics = new WK.PatchQueueMetrics(this.iosQueue, this.selectedPatches, this.allAttempts);
    },
};
