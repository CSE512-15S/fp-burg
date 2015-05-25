/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 * Copyright (C) 2012 Zan Dobersek <zandobersek@gmail.com>
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

WK.BuilderHistoryDataSource = function(delegate, serverURL)
{
    console.assert(serverURL);

    this._serverURL = serverURL;
    this._resultsCache = new Map;
    this._delegate = delegate; // Used to get the testIndex.
}

WK.BuilderHistoryDataSource.prototype = {

    // Public

    fetchHistoryForBuilder: function(builder)
    {
        console.assert(builder instanceof WK.Builder, builder);

        if (this._resultsCache.has(builder))
            return this._resultsCache.get(builder);

        var result = new Promise(function(resolve, reject) {
            JSON.load(this.resultsURLForBuilder(builder), resolve, reject);
        }.bind(this))
        .then(this._processResultsPayloadForBuilder.bind(this, builder));

        this._resultsCache.set(builder, result);
        return result;
    },

    resultsURLForBuilder: function(builder)
    {
        console.assert(builder instanceof WK.Builder, builder);

        const magicMasterString = "webkit.org";
        const magicTestTypeString = "layout-tests";
        const resultsFilename = "results-small.json"; // results.json?

        return this._serverURL + 'testfile' +
               '?builder=' + builder.name +
               '&master=' + magicMasterString +
               '&testtype=' + magicTestTypeString +
               '&name=' + resultsFilename;
    },

    // Private

    _processResultsPayloadForBuilder: function(builder, payload)
    {
        recursivelyFlattenObjectTrie = function(objectTrie, prefix) {
            var resultsByTestName = new Map;
            for (var part in objectTrie) {
                var fullName = prefix ? prefix + "/" + part : part;
                var data = objectTrie[part];

                if ("results" in data) {
                    resultsByTestName.set(fullName, data);
                    continue;
                }

                recursivelyFlattenObjectTrie(data, fullName)
                    .forEach(function(value, key) {
                        resultsByTestName.set(key, value);
                    });
            }
            return resultsByTestName;
        }

        console.log(payload);

        if (!_.has(payload, builder.name)) {
            console.error("Mismatch between builder and payload: ", builder, payload);
            throw new Error("Mismatch between builder and payload.");
        }

        if (!_.has(payload, "version") || parseInt(payload.version) < 4) {
            console.error("Missing or unknown payload version: ", payload.version);
            throw new Error("Missing or unknown payload version.");
        }

        var builderPayload = payload[builder.name];
        var buildCount = builderPayload.buildNumbers.length;

        builderRuns = [];
        for (var i = 0; i < buildCount; ++i) {
            var timestamp = builderPayload.secondsSinceEpoch[i];
            var buildNumber = builderPayload.buildNumbers[i];
            var revision = builderPayload.webkitRevision[i];
            builderRuns.push(new WK.BuilderRun(builder, buildNumber, revision, timestamp));
        }
        // The data is returned as newest-first, but this is awkward for our
        // time-series style visualizations. Reverse this and take care to reverse
        // any congruent arrays.
        builderRuns.reverse();
        var testResults = recursivelyFlattenObjectTrie(builderPayload.tests);
        return WK.BuilderHistory.fromPayload(builder, builderRuns, this._delegate.testIndex, testResults);
    },

};

(function() {

loader = {}; // Kill me.
loader.Loader = function() {} // now.

loader.Loader.prototype = {
    _processResultsJSONData: function(builderName, fileData)
    {
        var builds = JSON.parse(fileData);

        var json_version = builds['version'];
        for (var builderName in builds) {
            if (builderName == 'version')
                continue;

            // If a test suite stops being run on a given builder, we don't want to show it.
            // Assume any builder without a run in two weeks for a given test suite isn't
            // running that suite anymore.
            // FIXME: Grab which bots run which tests directly from the buildbot JSON instead.
            var lastRunSeconds = builds[builderName].secondsSinceEpoch[0];
            if ((Date.now() / 1000) - lastRunSeconds > ONE_WEEK_SECONDS)
                continue;

            if ((Date.now() / 1000) - lastRunSeconds > ONE_DAY_SECONDS)
                this._staleBuilders.push(builderName);

            if (json_version >= 4)
                builds[builderName][TESTS_KEY] = loader.Loader._flattenTrie(builds[builderName][TESTS_KEY]);
            g_resultsByBuilder[builderName] = builds[builderName];
        }
    },

    _loadExpectationsFiles: function()
    {
        if (!isFlakinessDashboard() && !this._history.crossDashboardState.useTestData) {
            this._loadNext();
            return;
        }

        var expectationsFilesToRequest = {};
        traversePlatformsTree(function(platform, platformName) {
            if (platform.fallbackPlatforms)
                platform.fallbackPlatforms.forEach(function(fallbackPlatform) {
                    var fallbackPlatformObject = platformObjectForName(fallbackPlatform);
                    if (fallbackPlatformObject.expectationsDirectory && !(fallbackPlatform in expectationsFilesToRequest))
                        expectationsFilesToRequest[fallbackPlatform] = EXPECTATIONS_URL_BASE_PATH + fallbackPlatformObject.expectationsDirectory + '/TestExpectations';
                });

            if (platform.expectationsDirectory)
                expectationsFilesToRequest[platformName] = EXPECTATIONS_URL_BASE_PATH + platform.expectationsDirectory + '/TestExpectations';
        });

        for (platformWithExpectations in expectationsFilesToRequest)
            loader.request(expectationsFilesToRequest[platformWithExpectations],
                    partial(function(loader, platformName, xhr) {
                        g_expectationsByPlatform[platformName] = getParsedExpectations(xhr.responseText);

                        delete expectationsFilesToRequest[platformName];
                        if (!Object.keys(expectationsFilesToRequest).length)
                            loader._loadNext();
                    }, this, platformWithExpectations),
                    partial(function(platformName, xhr) {
                        console.error('Could not load expectations file for ' + platformName);
                    }, platformWithExpectations));
    },
}

})();
