/*
 * Copyright (C) 2013, 2014 Apple Inc. All rights reserved.
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

WK.TracDataSource = function(baseURL, options)
{
    WK.Object.call(this);

    console.assert(baseURL);

    this.baseURL = baseURL;
    this._needsAuthentication = (typeof options === "object") && options[Trac.NeedsAuthentication] === true;

    this.recordedCommits = []; // Will be sorted in ascending order.
};

WK.Object.addConstructorFunctions(WK.TracDataSource);

WK.TracDataSource.NeedsAuthentication = "needsAuthentication";
WK.TracDataSource.UpdateInterval = 45000; // 45 seconds

WK.TracDataSource.Event = {
    CommitsUpdated: "commits-updated",
};

WK.TracDataSource.prototype = {
    constructor: WK.TracDataSource,
    __proto__: WK.Object.prototype,

    // Public

    get oldestRecordedRevisionNumber()
    {
        if (!this.recordedCommits.length)
            return undefined;
        return _.first(this.recordedCommits).revisionNumber;
    },

    get latestRecordedRevisionNumber()
    {
        if (!this.recordedCommits.length)
            return undefined;
        return _.last(this.recordedCommits).revisionNumber;
    },

    commitsForBranch: function(branch, predicate)
    {
        return _.chain(this.recordedCommits)
                .filter(function(commit) { return !commit.containsBranchLocation || commit.branch === branch; })
                .filter(predicate)
                .value();
    },

    urlForRevision: function(revision)
    {
        return this.baseURL + "changeset/" + encodeURIComponent(revision);
    },

    /* The main entry point, it takes two Date instances. */
    fetchCommitsForDateRange: function(fromDate, toDate)
    {
        loadXML(this._xmlTimelineURLForDateRange(fromDate, toDate), function(dataDocument) {
            this._processTimelineData(dataDocument);
        }.bind(this), this._needsAuthentication ? {withCredentials: true} : {});
    },

    startPeriodicUpdates: function()
    {
        console.assert(!this._oldestHistoricalDate);

        var today = new Date();

        this._oldestHistoricalDate = this._latestLoadedDate = today;

        this._loadingHistoricalData = true;
        loadXML(this._xmlTimelineURLForDateRange(today, today), function(dataDocument) {
            this._loadingHistoricalData = false;
            this._processTimelineData(dataDocument);
        }.bind(this), this._needsAuthentication ? {withCredentials: true} : {});

        this.updateTimer = setInterval(this._update.bind(this), WK.TracDataSource.UpdateInterval);
    },

    loadMoreHistoricalData: function()
    {
        console.assert(this._oldestHistoricalDate);

        if (this._loadingHistoricalData)
            return;

        // Load one more day of historical data.
        var fromDate = new Date(this._oldestHistoricalDate);
        fromDate.setDate(fromDate.getDate() - 1);
        var toDate = new Date(fromDate);

        this._oldestHistoricalDate = fromDate;

        this._loadingHistoricalData = true;
        loadXML(this._xmlTimelineURLForDateRange(fromDate, toDate), function(dataDocument) {
            this._loadingHistoricalData = false;
            this._processTimelineData(dataDocument);
        }.bind(this), this._needsAuthentication ? {withCredentials: true} : {});
    },

    // Private

    _xmlTimelineURLForDateRange: function(fromDate, toDate)
    {
        console.assert(fromDate <= toDate);

        var fromDay = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
        var toDay = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

        return this.baseURL + "timeline?changeset=on&format=rss&max=0" +
            "&from=" +  (toDay.getMonth() + 1) + "%2F" + toDay.getDate() + "%2F" + (toDay.getFullYear() % 100) +
            "&daysback=" + ((toDay - fromDay) / 1000 / 60 / 60 / 24);
    },

    _convertCommitInfoElementToObject: function(doc, commitElement)
    {
        var link = doc.evaluate("./link", commitElement, null, XPathResult.STRING_TYPE).stringValue;
        var revisionNumber = parseInt(/\d+$/.exec(link))

        function tracNSResolver(prefix) {
            if (prefix === "dc")
                return "http://purl.org/dc/elements/1.1/";
            return null;
        }

        var author = doc.evaluate("./author|dc:creator", commitElement, tracNSResolver, XPathResult.STRING_TYPE).stringValue;
        var date = doc.evaluate("./pubDate", commitElement, null, XPathResult.STRING_TYPE).stringValue;
        date = new Date(Date.parse(date));
        var description = doc.evaluate("./description", commitElement, null, XPathResult.STRING_TYPE).stringValue;

        var parsedDescription = document.createElement("div");
        parsedDescription.innerHTML = description;

        var location = "";
        if (parsedDescription.firstChild && parsedDescription.firstChild.className === "changes") {
            // We can extract branch information when trac.ini contains "changeset_show_files=location".
            location = doc.evaluate("//strong", parsedDescription.firstChild, null, XPathResult.STRING_TYPE).stringValue
            parsedDescription.removeChild(parsedDescription.firstChild);
        }

        // The feed contains a <title>, but it's not parsed as well as what we are getting from description.
        var title = document.createElement("div");
        var node = parsedDescription.firstChild ? parsedDescription.firstChild.firstChild : null;
        while (node && node.tagName !== "BR") {
            title.appendChild(node.cloneNode(true));
            node = node.nextSibling;
        }

        // For some reason, trac titles start with a newline. Delete it.
        if (title.firstChild && title.firstChild.nodeType === Node.TEXT_NODE && title.firstChild.textContent.length > 0 && title.firstChild.textContent[0] == "\n")
            title.firstChild.textContent = title.firstChild.textContent.substring(1);

        var result = {
            revisionNumber: revisionNumber,
            link: link,
            title: title,
            author: author,
            date: date,
            description: parsedDescription.innerHTML,
            containsBranchLocation: location !== ""
        };

        if (result.containsBranchLocation) {
            console.assert(location[location.length - 1] !== "/");
            location = location += "/";
            if (location.startsWith("tags/"))
                result.tag = location.substr(5, location.indexOf("/", 5) - 5);
            else if (location.startsWith("branches/"))
                result.branch = location.substr(9, location.indexOf("/", 9) - 9);
            else if (location.startsWith("releases/"))
                result.release = location.substr(9, location.indexOf("/", 9) - 9);
            else if (location.startsWith("trunk/"))
                result.branch = "trunk";
            else if (location.startsWith("submissions/"))
                ; // These changes are never relevant to the dashboard.
            else {
                // result.containsBranchLocation remains true, because this commit does
                // not match any explicitly specified branches.
                console.assert(false);
            }
        }

        return result;
    },

    _processTimelineData: function(dataDocument)
    {
        if (!dataDocument)
            return;

        var recordedRevisionNumbers = {};
        _.each(this.recordedCommits, function(commit) {
            recordedRevisionNumbers[commit.revisionNumber] = commit;
        });

        var knownCommitsWereUpdated = false;
        var newCommits = [];

        var commitInfoElements = dataDocument.evaluate("/rss/channel/item", dataDocument, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE);
        var commitInfoElement;
        while (commitInfoElement = commitInfoElements.iterateNext()) {
            var commit = this._convertCommitInfoElementToObject(dataDocument, commitInfoElement);
            if (commit.revisionNumber in recordedRevisionNumbers) {
                // Author could have changed, as commit queue replaces it after the fact.
                console.assert(recordedRevisionNumbers[commit.revisionNumber].revisionNumber === commit.revisionNumber);
                if (recordedRevisionNumbers[commit.revisionNumber].author != commit.author) {
                    recordedRevisionNumbers[commit.revisionNumber].author = commit.author;
                    knownCommitWasUpdated = true;
                }
            } else
                newCommits.push(commit);
        }

        if (newCommits.length)
            this.recordedCommits = newCommits.concat(this.recordedCommits).sort(function(a, b) { return a.revisionNumber - b.revisionNumber; });

        if (newCommits.length || knownCommitsWereUpdated)
            this.dispatchEventToListeners(WK.TracDataSource.Event.CommitsUpdated, null);
    },

    _update: function()
    {
        var fromDate = new Date(this._latestLoadedDate);
        var toDate = new Date();

        this._latestLoadedDate = toDate;

        loadXML(this._xmlTimelineURLForDateRange(fromDate, toDate), this._processTimelineData.bind(this), this._needsAuthentication ? {withCredentials: true} : {});
    },
};
