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

WK.QueueDiagramView = function(queue) {
    WK.Object.call(this);

    console.assert(queue instanceof WK.PatchQueue, queue);
    this.queue = queue;

    this.element = document.createElement("li");
    this.element.className = "queue";

    this.queueMetrics = new WK.PatchQueueMetrics(queue, {'attempts': []}); // Start with nothing.
}

WK.Object.addConstructorFunctions(WK.QueueDiagramView);

WK.QueueDiagramView.Event = {
    SelectionCleared: "selection-cleared",
    SelectionChanged: "selection-changed"
};

WK.QueueDiagramView.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.QueueDiagramView,

    get name()
    {
        return this.queue.shortName;
    },

    get queueMetrics()
    {
        return this._metrics;
    },

    set queueMetrics(value)
    {
        console.assert(value instanceof WK.PatchQueueMetrics, value);
        console.log("got metrics", value);
        this._metrics = value;
        this.render();
    },

    clearSelection: function()
    {
        if (this._selectedAttemptCount === null && this._selectedOutcome === null)
            return;

        this._selectedAttemptCount = null;
        this._selectedOutcome = null;

        this._clearSelectionClasses();
        this._updateEmptyOutcomesVisibility();
        this.dispatchEventToListeners(WK.QueueDiagramView.Event.SelectionCleared);
    },

    setSelection: function(ordinal, outcome)
    {
        console.assert(ordinal >= 0);
        console.assert(outcome);

        ordinal = Math.min(ordinal, 3);

        // Re-selecting with cmd+click should clear.
        if (ordinal === this._selectedAttemptCount && outcome === this._selectedOutcome) {
            if (event.metaKey)
                this.clearSelection();
            return;
        }

        this._selectedAttemptCount = ordinal;
        this._selectedOutcome = outcome;

        // Update styles.
        this._clearSelectionClasses();
        this._updateEmptyOutcomesVisibility();

        var selectedAttemptClassName = null;
        if (outcome === WK.PatchAttempt.Outcome.Pass)
            selectedAttemptClassName = "selected-pass";
        else if (outcome === WK.PatchAttempt.Outcome.Fail)
            selectedAttemptClassName = "selected-fail";
        else if (outcome === WK.PatchAttempt.Outcome.Abort)
            selectedAttemptClassName = "selected-abort";
        else if (outcome === WK.PatchAttempt.Outcome.Retry)
            selectedAttemptClassName = "selected-attempt";
        else
            console.error("unknown outcome: ", outcome);

        for (var i = 0; i < this._attemptElements.length; ++i) {
            var attempt = this._attemptElements[i];
            if (i < ordinal)
                attempt.classList.add("selected-through");
            else if (i === ordinal)
                attempt.classList.add(selectedAttemptClassName);
            else if (outcome !== WK.PatchAttempt.Outcome.Retry)
                attempt.classList.add("selected-ignore");
        }

        this.dispatchEventToListeners(WK.QueueDiagramView.Event.SelectionChanged);
    },

    get selectedOutcome()
    {
        return this._selectedOutcome;
    },

    get selectedAttemptCount()
    {
        return this._selectedAttemptCount;
    },

    render: function()
    {
        this.element.removeChildren();

        this._startElement = $(WK.ViewTemplates.queueDiagramStart(this)).get(0);
        this._startElement.addEventListener("click", this._diagramSegmentClicked.bind(this));
        this.element.appendChild(this._startElement);

        this._attemptElements = [];
        for (var i = 1; i <= 3; ++i) {
            var summary = this.queueMetrics.getSummaryForAttempt(i);
            console.log("summary", summary);
            var attemptElement = $(WK.ViewTemplates.queueDiagramAttempt(summary)).get(0);
            attemptElement.addEventListener("click", this._diagramSegmentClicked.bind(this));
            this._attemptElements.push(attemptElement);
            this.element.appendChild(attemptElement);
        }

        this._updateEmptyOutcomesVisibility();
    },

    // Private

    _diagramSegmentClicked: function(event)
    {
        var target = event.target;
        if (this._startElement === target.enclosingNodeOrSelfWithClass("queue-start")) {
            this.clearSelection();
            return;
        }
        var enclosingSegment = target.enclosingNodeOrSelfWithClass("queue-attempt");
        if (!enclosingSegment)
            return;

        var ordinal = this._attemptElements.indexOf(enclosingSegment);
        if (ordinal === -1)
            return;

        var enclosingCircle = target.enclosingNodeOrSelfWithClass("attempt-circle");
        if (enclosingCircle) {
            this.setSelection(ordinal, WK.PatchAttempt.Outcome.Retry);
            return;
        }

        var enclosingArrowOrLabel = target.enclosingNodeOrSelfWithClass("outcome");
        if (!enclosingArrowOrLabel)
            return;

        var outcome = null;
        if (enclosingArrowOrLabel.classList.contains("pass"))
            outcome = WK.PatchAttempt.Outcome.Pass;
        else if (enclosingArrowOrLabel.classList.contains("fail"))
            outcome = WK.PatchAttempt.Outcome.Fail;
        else if (enclosingArrowOrLabel.classList.contains("abort"))
            outcome = WK.PatchAttempt.Outcome.Abort;
        else if (enclosingArrowOrLabel.classList.contains("attempt"))
            outcome = WK.PatchAttempt.Outcome.Retry;

        if (!outcome)
            return;

        this.setSelection(ordinal, outcome);
    },

    _updateEmptyOutcomesVisibility: function()
    {
        _.each(this._attemptElements, function(attempt, i) {
            var metricsByOutcome = {};
            var totalCount = 0;
            for (var key in WK.PatchAttempt.Outcome) {
                var outcome = WK.PatchAttempt.Outcome[key];
                metricsByOutcome[outcome] = this._metrics.getData(i + 1, outcome);
                totalCount += metricsByOutcome[outcome].count;
            }
            attempt.classList.toggle("empty-pass", metricsByOutcome[WK.PatchAttempt.Outcome.Pass].count === 0);
            attempt.classList.toggle("empty-fail", metricsByOutcome[WK.PatchAttempt.Outcome.Fail].count === 0);
            attempt.classList.toggle("empty-abort", metricsByOutcome[WK.PatchAttempt.Outcome.Abort].count === 0);
            attempt.classList.toggle("empty-retry", metricsByOutcome[WK.PatchAttempt.Outcome.Retry].count === 0);
            attempt.classList.toggle("empty-attempt", i > 1 && totalCount === 0);
        }, this);
    },

    _clearSelectionClasses: function()
    {
        function clearClasses(element) {
            element.classList.remove("selected-pass");
            element.classList.remove("selected-fail");
            element.classList.remove("selected-abort");
            element.classList.remove("selected-attempt");
            element.classList.remove("selected-through");
            element.classList.remove("selected-ignore");
            element.classList.remove("empty-pass");
            element.classList.remove("empty-fail");
            element.classList.remove("empty-abort");
            element.classList.remove("empty-attempt");
        }

        clearClasses(this._startElement);
        _.map(this._attemptElements, clearClasses);
    }
};
