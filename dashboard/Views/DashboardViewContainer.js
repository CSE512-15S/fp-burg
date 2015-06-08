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

WK.DashboardViewContainer = function(element, testIndex) {
    this._backForwardList = [];
    this._currentIndex = -1;

    this._testIndex = testIndex;

    this._element = element || document.createElement("div");
    this._element.classList.add(WK.DashboardViewContainer.StyleClassName);

    var headerContainer = document.createElement("div");
    headerContainer.className = "header-container";
    element.appendChild(headerContainer);

    var headerElement = document.createElement("h1");
    headerElement.textContent = "Test Results History";
    headerContainer.appendChild(headerElement);

    this._headerIntervalLabelElement = document.createElement("span");
    this._headerIntervalLabelElement.textContent = "(loading)";
    headerElement.appendChild(this._headerIntervalLabelElement);

    this.descriptionOutletElement = document.createElement("div");
    this.descriptionOutletElement.className = "description-outlet";
    headerContainer.appendChild(this.descriptionOutletElement);

    var settingsContainer = this.settingsOutletElement = document.createElement("div");
    this.settingsOutletElement.className = "settings-outlet";
    element.appendChild(this.settingsOutletElement);

    window.addEventListener("popstate", this._didPopState.bind(this));
}

WK.DashboardViewContainer.StyleClassName = "dashboard-view-container";

WK.DashboardViewContainer.Event = {
    CurrentDashboardViewDidChange: "current-dashboard-view-did-change"
};

WK.DashboardViewContainer.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.DashboardViewContainer,

    // Public

    get element()
    {
        return this._element;
    },

    get currentIndex()
    {
        return this._currentIndex;
    },

    get backForwardList()
    {
        return this._backForwardList;
    },

    get currentDashboardView()
    {
        if (this._currentIndex < 0 || this._currentIndex > this._backForwardList.length - 1)
            return null;
        return this._backForwardList[this._currentIndex].dashboardView;
    },

    get currentBackForwardEntry()
    {
        if (this._currentIndex < 0 || this._currentIndex > this._backForwardList.length - 1)
            return null;
        return this._backForwardList[this._currentIndex];
    },

    updateLayout: function()
    {
        var currentDashboardView = this.currentDashboardView;
        if (currentDashboardView)
            currentDashboardView.updateLayout();
    },

    dashboardViewForRepresentedObject: function(representedObject, onlyExisting, extraArguments)
    {
        console.assert(representedObject);
        if (!representedObject)
            return null;

        // Iterate over all the known dashboard views for the representedObject (if any) and find one that doesn't
        // have a parent container or has this container as its parent.
        var dashboardView = null;
        for (var i = 0; representedObject.__dashboardViews && i < representedObject.__dashboardViews.length; ++i) {
            var currentDashboardView = representedObject.__dashboardViews[i];
            if (!currentDashboardView._parentContainer || currentDashboardView._parentContainer === this) {
                dashboardView = currentDashboardView;
                break;
            }
        }

        console.assert(!dashboardView || dashboardView instanceof WK.DashboardView);
        if (dashboardView instanceof WK.DashboardView)
            return dashboardView;

        // Return early to avoid creating a new dashboard view when onlyExisting is true.
        if (onlyExisting)
            return null;

        // No existing dashboard view found, make a new one.
        dashboardView = new WK.DashboardView(representedObject, extraArguments);

        console.assert(dashboardView, "Unknown representedObject", representedObject);
        if (!dashboardView)
            return null;

        // The representedObject can change in the constructor for dashboardView. Remember the
        // dashboardViews on the real representedObject and not the one originally supplied.
        // The main case for this is a Frame being passed in and the main Resource being used.
        representedObject = dashboardView.representedObject;

        // Remember this dashboard view for future calls.
        if (!representedObject.__dashboardViews)
            representedObject.__dashboardViews = [];
        representedObject.__dashboardViews.push(dashboardView);

        return dashboardView;
    },

    showDashboardViewForRepresentedObject: function(representedObject, extraArguments)
    {
        var dashboardView = this.dashboardViewForRepresentedObject(representedObject, false, extraArguments);
        if (!dashboardView)
            return null;

        this.showDashboardView(dashboardView);

        return dashboardView;
    },

    showDashboardView: function(dashboardView, cookie)
    {
        console.assert(dashboardView instanceof WK.DashboardView);
        if (!(dashboardView instanceof WK.DashboardView))
            return null;

        // Don't allow showing a dashboard view that is already associated with another container.
        // Showing a dashboard view that is already associated with this container is allowed.
        console.assert(!dashboardView.parentContainer || dashboardView.parentContainer === this);
        if (dashboardView.parentContainer && dashboardView.parentContainer !== this)
            return null;

        var currentEntry = this.currentBackForwardEntry;
        var provisionalEntry = new WK.BackForwardEntry(dashboardView, cookie);
        // Don't do anything if we would have added an identical back/forward list entry.
        if (currentEntry && currentEntry.dashboardView === dashboardView && Object.shallowEqual(provisionalEntry.cookie, currentEntry.cookie)) {
            const shouldCallShown = false;
            currentEntry.prepareToShow(shouldCallShown);
            return currentEntry.dashboardView;
        }

        // Showing a dashboard view will truncate the back/forward list after the current index and insert the dashboard view
        // at the end of the list. Finally, the current index will be updated to point to the end of the back/forward list.

        // Increment the current index to where we will insert the dashboard view.
        var newIndex = this._currentIndex + 1;

        // Insert the dashboard view at the new index. This will remove any dashboard views greater than or equal to the index.
        var removedEntries = this._backForwardList.splice(newIndex, this._backForwardList.length - newIndex, provisionalEntry);

        console.assert(newIndex === this._backForwardList.length - 1);
        console.assert(this._backForwardList[newIndex] === provisionalEntry);

        // Disassociate with the removed dashboard views.
        for (var i = 0; i < removedEntries.length; ++i) {
            // Skip disassociation if this dashboard view is still in the back/forward list.
            var shouldDissociateDashboardView = !this._backForwardList.some(function(existingEntry) {
                return existingEntry.dashboardView === removedEntries[i].dashboardView;
            });

            if (shouldDissociateDashboardView)
                this._disassociateFromDashboardView(removedEntries[i].dashboardView);
        }

        // Associate with the new dashboard view.
        dashboardView._parentContainer = this;

        window.history.pushState({index: newIndex});

        this.showBackForwardEntryForIndex(newIndex);

        return dashboardView;
    },

    showBackForwardEntryForIndex: function(index)
    {
        console.assert(index >= 0 && index <= this._backForwardList.length - 1);
        if (index < 0 || index > this._backForwardList.length - 1)
            return;

        if (this._currentIndex === index)
            return;

        var previousEntry = this.currentBackForwardEntry;
        this._currentIndex = index;
        var currentEntry = this.currentBackForwardEntry;
        console.assert(currentEntry);

        var isNewDashboardView = !previousEntry || !currentEntry.dashboardView.visible;
        if (isNewDashboardView) {
            // Hide the currently visible dashboard view.
            if (previousEntry)
                this._hideEntry(previousEntry);
            this._showEntry(currentEntry, true);
        } else
            this._showEntry(currentEntry, false);

        this.dispatchEventToListeners(WK.DashboardViewContainer.Event.CurrentDashboardViewDidChange);
    },

    replaceDashboardView: function(oldDashboardView, newDashboardView)
    {
        console.assert(oldDashboardView instanceof WK.DashboardView);
        if (!(oldDashboardView instanceof WK.DashboardView))
            return;

        console.assert(newDashboardView instanceof WK.DashboardView);
        if (!(newDashboardView instanceof WK.DashboardView))
            return;

        console.assert(oldDashboardView.parentContainer === this);
        if (oldDashboardView.parentContainer !== this)
            return;

        console.assert(!newDashboardView.parentContainer || newDashboardView.parentContainer === this);
        if (newDashboardView.parentContainer && newDashboardView.parentContainer !== this)
            return;

        var currentlyShowing = (this.currentDashboardView === oldDashboardView);
        if (currentlyShowing)
            this._hideEntry(this.currentBackForwardEntry);

        // Disassociate with the old dashboard view.
        this._disassociateFromDashboardView(oldDashboardView);

        // Associate with the new dashboard view.
        newDashboardView._parentContainer = this;

        // Replace all occurrences of oldDashboardView with newDashboardView in the back/forward list.
        for (var i = 0; i < this._backForwardList.length; ++i) {
            if (this._backForwardList[i].dashboardView === oldDashboardView)
                this._backForwardList[i].dashboardView = newDashboardView;
        }

        // Re-show the current entry, because its dashboard view instance was replaced.
        if (currentlyShowing) {
            this._showEntry(this.currentBackForwardEntry, true);
            this.dispatchEventToListeners(WK.DashboardViewContainer.Event.CurrentDashboardViewDidChange);
        }
    },

    closeAllDashboardViewsOfPrototype: function(constructor)
    {
        if (!this._backForwardList.length) {
            console.assert(this._currentIndex === -1);
            return;
        }

        // Do a check to see if all the dashboard views are instances of this prototype.
        // If they all are we can use the quicker closeAllDashboardViews method.
        var allSamePrototype = true;
        for (var i = this._backForwardList.length - 1; i >= 0; --i) {
            if (!(this._backForwardList[i].dashboardView instanceof constructor)) {
                allSamePrototype = false;
                break;
            }
        }

        if (allSamePrototype) {
            this.closeAllDashboardViews();
            return;
        }

        var oldCurrentDashboardView = this.currentDashboardView;

        var backForwardListDidChange = false;
        // Hide and disassociate with all the dashboard views that are instances of the constructor.
        for (var i = this._backForwardList.length - 1; i >= 0; --i) {
            var entry = this._backForwardList[i];
            if (!(entry.dashboardView instanceof constructor))
                continue;

            if (entry.dashboardView === oldCurrentDashboardView)
                this._hideEntry(entry);

            if (this._currentIndex >= i) {
                // Decrement the currentIndex since we will remove an item in the back/forward array
                // that it the current index or comes before it.
                --this._currentIndex;
            }

            this._disassociateFromDashboardView(entry.dashboardView);

            // Remove the item from the back/forward list.
            this._backForwardList.splice(i, 1);
            backForwardListDidChange = true;
        }

        var currentEntry = this.currentBackForwardEntry;
        console.assert(currentEntry || (!currentEntry && this._currentIndex === -1));

        if (currentEntry && currentEntry.dashboardView !== oldCurrentDashboardView || backForwardListDidChange) {
            this._showEntry(currentEntry, true);
            this.dispatchEventToListeners(WK.DashboardViewContainer.Event.CurrentDashboardViewDidChange);
        }
    },

    closeDashboardView: function(dashboardViewToClose)
    {
        if (!this._backForwardList.length) {
            console.assert(this._currentIndex === -1);
            return;
        }

        // Do a check to see if all the dashboard views are instances of this prototype.
        // If they all are we can use the quicker closeAllDashboardViews method.
        var allSameDashboardView = true;
        for (var i = this._backForwardList.length - 1; i >= 0; --i) {
            if (this._backForwardList[i].dashboardView !== dashboardViewToClose) {
                allSameDashboardView = false;
                break;
            }
        }

        if (allSameDashboardView) {
            this.closeAllDashboardViews();
            return;
        }

        var oldCurrentDashboardView = this.currentDashboardView;

        var backForwardListDidChange = false;
        // Hide and disassociate with all the dashboard views that are the same as dashboardViewToClose.
        for (var i = this._backForwardList.length - 1; i >= 0; --i) {
            var entry = this._backForwardList[i];
            if (entry.dashboardView !== dashboardViewToClose)
                continue;

            if (entry.dashboardView === oldCurrentDashboardView)
                this._hideEntry(entry);

            if (this._currentIndex >= i) {
                // Decrement the currentIndex since we will remove an item in the back/forward array
                // that it the current index or comes before it.
                --this._currentIndex;
            }

            this._disassociateFromDashboardView(entry.dashboardView);

            // Remove the item from the back/forward list.
            this._backForwardList.splice(i, 1);
            backForwardListDidChange = true;
        }

        var currentEntry = this.currentBackForwardEntry;
        console.assert(currentEntry || (!currentEntry && this._currentIndex === -1));

        if (currentEntry && currentEntry.dashboardView !== oldCurrentDashboardView || backForwardListDidChange) {
            this._showEntry(currentEntry, true);
            this.dispatchEventToListeners(WK.DashboardViewContainer.Event.CurrentDashboardViewDidChange);
        }
    },

    closeAllDashboardViews: function()
    {
        if (!this._backForwardList.length) {
            console.assert(this._currentIndex === -1);
            return;
        }

        // Hide and disassociate with all the dashboard views.
        for (var i = 0; i < this._backForwardList.length; ++i) {
            var entry = this._backForwardList[i];
            if (i === this._currentIndex)
                this._hideEntry(entry);
            this._disassociateFromDashboardView(entry.dashboardView);
        }

        this._backForwardList = [];
        this._currentIndex = -1;

        this.dispatchEventToListeners(WK.DashboardViewContainer.Event.CurrentDashboardViewDidChange);
    },

    canGoBack: function()
    {
        return this._currentIndex > 0;
    },

    canGoForward: function()
    {
        return this._currentIndex < this._backForwardList.length - 1;
    },

    goBack: function()
    {
        if (!this.canGoBack())
            return;
        this.showBackForwardEntryForIndex(this._currentIndex - 1);
    },

    goForward: function()
    {
        if (!this.canGoForward())
            return;
        this.showBackForwardEntryForIndex(this._currentIndex + 1);
    },

    shown: function()
    {
        var currentEntry = this.currentBackForwardEntry;
        if (!currentEntry)
            return;

        this._showEntry(currentEntry, true);
    },

    hidden: function()
    {
        var currentEntry = this.currentBackForwardEntry;
        if (!currentEntry)
            return;

        this._hideEntry(currentEntry);
    },

    // Private

    // Private
    _updateHistoryCount: function()
    {
        this._headerIntervalLabelElement.textContent = "(Last " + this._testIndex.maxTestRuns + " Runs)";
    },

    _didPopState: function(event)
    {
        console.log("did pop state", event.state);
        this.goBack();
    },

    _addDashboardViewElement: function(dashboardView)
    {
        if (dashboardView.element.parentNode === this._element)
            return;

        this._element.appendChild(dashboardView.element);

        var description = dashboardView.descriptionElement;
        if (description)
            this.descriptionOutletElement.appendChild(description);

        var settings = dashboardView.settingsElement;
        if (settings)
            this.settingsOutletElement.appendChild(settings);

        this._updateHistoryCount();
    },

    _removeDashboardViewElement: function(dashboardView)
    {
        if (!dashboardView.element.parentNode)
            return;

        dashboardView.element.parentNode.removeChild(dashboardView.element);

        this.descriptionOutletElement.removeChildren();
        this.settingsOutletElement.removeChildren();
    },

    _disassociateFromDashboardView: function(dashboardView)
    {
        console.assert(!dashboardView.visible);

        dashboardView._parentContainer = null;

        var representedObject = dashboardView.representedObject;
        if (representedObject && representedObject.__dashboardViews)
            representedObject.__dashboardViews.remove(dashboardView);

        dashboardView.closed();
    },

    _showEntry: function(entry, shouldCallShown)
    {
        console.assert(entry instanceof WK.BackForwardEntry);

        this._addDashboardViewElement(entry.dashboardView);
        entry.prepareToShow(shouldCallShown);
    },

    _hideEntry: function(entry)
    {
        console.assert(entry instanceof WK.BackForwardEntry);

        entry.prepareToHide();
        this._removeDashboardViewElement(entry.dashboardView);
    }
};
