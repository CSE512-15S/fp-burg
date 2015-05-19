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

WK.BuildAttemptTableView = function(delegate) {
    WK.Object.call(this);

    // NOTE: use this to obtain a WK.Patch object by its id:
    //     this._delegate.getPatchById(...);
    this._delegate = delegate;

    var columns = [
        {key: "try", label: "Try #"},
        {key: "result", label: "Result"},
        {key: "patch", label: "Patch"},
        {key: "waitDuration", label: "Wait Time"},
        {key: "duration", label: "Processing Time"},
    ];

    var table = this.element = document.createElement("table");
    table.className = "build-attempts";
    var thead = document.createElement("thead");
    table.appendChild(thead);
    var tr = document.createElement("tr");
    columns.forEach(function(column) {
        var th = document.createElement("th");
        th.textContent = column.label;
        tr.appendChild(th);
    });
    this._tbodyElement = document.createElement("tbody");
    table.appendChild(this._tbodyElement);

    // Set up initial state.
    this.attempts = [];
    this.dummyAttempts = [];
}

WK.BuildAttemptTableView.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.BuildAttemptTableView,

    get attempts()
    {
        return this._attempts.slice();
    },

    set attempts(value)
    {
        if (!_.isArray(value))
            return;

        this._attempts = value;
        this.render();
    },

    get dummyAttempts()
    {
        return this._dummyAttempts.slice();
    },

    set dummyAttempts(value)
    {
        if (!_.isArray(value))
            return;

        this._dummyAttempts = value;
        //this.render();
    },

    render: function()
    {
        this._tbodyElement.removeChildren();

        // FIXME: not sorted?
        var recentAttempts = this._attempts.slice(0, 50);

        recentAttempts.forEach(function(attempt) {
            var $row = $(WK.ViewTemplates.buildAttemptTableRow(attempt));
            this._tbodyElement.appendChild($row[0]);
        }, this);
    }
};
