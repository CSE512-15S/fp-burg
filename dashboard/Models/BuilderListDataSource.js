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

WK.BuilderListDataSource = function(builderListURL)
{
    console.assert(builderListURL);

    this._builderListURL = builderListURL;
}

WK.BuilderListDataSource.prototype = {

    loadBuilders: function() {
        if (this._buildersPromise)
            return this._buildersPromise;

        this._buildersPromise = new Promise(function(resolve, reject) {
            console.log("Loading list of active builders...");

            var options = {"jsonpCallbackName": "LOAD_BUILDBOT_DATA"};
            JSON.load(this._builderListURL, resolve, reject, options);
        }.bind(this))
        .then(function(data) {
            // Returns JSON object like so:
            //[{
            //  "name": "webkit.org",
            //  "url": "https://build.webkit.org"
            //  "tests": {
            //      "layout-tests": {
            //          "builders": [ "Apple Mavericks Debug WK1 (Tests)", ... ]
            //      }
            //  }
            //}]

            console.assert(data);
            var tests = data[0].tests;
            var layoutTests = tests['layout-tests'];
            var builderNames = layoutTests.builders;

            return builderNames.map(function(name) { return new WK.Builder(name); });
        });

        return this._buildersPromise;
    }
};
