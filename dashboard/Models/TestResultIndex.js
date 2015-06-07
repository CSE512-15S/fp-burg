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

var WK = WK || {};

WK.TestResultIndex = function()
{
    WK.Object.call(this);

    this.testsByName = new Map;
    this._allTests = [];
    this._allBuilders = [];

    // Allows lookup by Test and Builder:
    // Map(Test -> Map(Builder -> TestResultHistory))
    this.resultsByTest = new Map;

    this._maxTestRuns = 0;
}

WK.TestResultIndex.Event = {
    BuildersChanged: "test-index-builders-changed",
}

WK.TestResultIndex.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.TestResultIndex,

    // Public

    get allTests()
    {
        return this._allTests;
    },

    get maxTestRuns()
    {
        return this._maxTestRuns;
    },

    get builders()
    {
        return this._allBuilders.slice();
    },

    set builders(value)
    {
        if (this._allBuilders === value)
            return;

        this._allBuilders = value || [];
        this.dispatchEventToListeners(WK.TestResultIndex.Event.BuildersChanged);
    },

    // Maybe when a decent fuzzy matching library comes out, we can use it.
    // I tried two (fuzzyset.js and fuse.js) and the results are worthless.
    testsMatchingSearchString: function(searchString)
    {
        return this.allTests.filter(function(test) {
            return test.fullName.indexOf(searchString) !== -1;
        });
    },

    findTest: function(name)
    {
        console.assert(typeof name === "string", name);

        if (!this.testsByName.has(name)) {
            var test = new WK.Test(name);
            this._allTests.push(test);
            this.testsByName.set(name, test);
            return test;
        }

        return this.testsByName.get(name);
    },

    addBuilderResultsForTest: function(test, history, result)
    {
        this._maxTestRuns = Math.max(this._maxTestRuns, history.runs.length);
        this.findResultsForTest(test).set(history.builder, result);
    },

    findResultsForTest: function(testOrName)
    {
        var test = testOrName;
        if (!(testOrName instanceof WK.Test))
            test = this.findTest(testOrName);

        if (!this.resultsByTest.has(test)) {
            var map = new Map;
            this.resultsByTest.set(test, map);
            return map;
        }

        return this.resultsByTest.get(test);
    },
}
