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

WK.TestNameFilterSearchBox = function(testIndex) {
    WK.Object.call(this);

    console.assert(testIndex instanceof WK.TestResultIndex, testIndex);

    this.element = document.createElement("input");
    this.element.setAttribute("type", "search");
    this.element.setAttribute("spellcheck", false);
    this.element.setAttribute("placeholder", "Filter by Name");
    this.element.setAttribute("autosave", "dashboard-test-name");
    this.element.setAttribute("results", 5);
    this.element.className = "test-name-filter";
};

WK.TestNameFilterSearchBox.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.TestNameFilterSearchBox,

    // Public

    refresh: function()
    {
        // TODO: rebuild the index.
    },

    filterTestResults: function(testResults)
    {
        //var searchText = (this.element.value || "").trim();
        //if (!searchText.length)

        return testResults;
    },
};
