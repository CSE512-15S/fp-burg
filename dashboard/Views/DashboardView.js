/*
 * Copyright (C) 2013 Apple Inc. All rights reserved.
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

WK.DashboardView = function(representedObject, extraArguments)
{
    if (this.constructor === WK.DashboardView) {
        // When instantiated directly return an instance of a type-based concrete subclass.

        console.assert(representedObject);

        if (representedObject instanceof WK.Test)
            return new WK.TestHistoryView(representedObject, extraArguments);

        if (representedObject instanceof WK.TestResultIndex)
            return new WK.TestHistoryOverview(representedObject, extraArguments);

        if (representedObject instanceof WK.TestResultHistory)
            return new WK.TestHistoryResultView(representedObject, extraArguments);

        console.assert(!WK.DashboardView.isViewable(representedObject));

        throw "Can't make a DashboardView for an unknown representedObject.";
    }

    // Concrete object instantiation.
    console.assert(this.constructor !== WK.DashboardView && this instanceof WK.DashboardView);
    console.assert(!representedObject || WK.DashboardView.isViewable(representedObject));

    WK.Object.call(this);

    this._representedObject = representedObject;

    this._element = document.createElement("div");
    this._element.classList.add(WK.DashboardView.StyleClassName);

    this._parentContainer = null;
};

WK.Object.addConstructorFunctions(WK.DashboardView);

WK.DashboardView.isViewable = function(representedObject)
{
    if (representedObject instanceof WK.Test)
        return true;
    if (representedObject instanceof WK.TestResultIndex)
        return true;
    if (representedObject instanceof WK.TestResultHistory)
        return true;
    return false;
};

WK.DashboardView.StyleClassName = "dashboard-view";

WK.DashboardView.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.DashboardView,

    // Public

    get representedObject()
    {
        return this._representedObject;
    },

    get element()
    {
        return this._element;
    },

    get settingsElement()
    {
        // Implemented by subclasses.
        return null;
    },

    get descriptionElement()
    {
        // Implemented by subclasses.
        return null;
    },

    get visible()
    {
        return this._visible;
    },

    set visible(flag)
    {
        this._visible = flag;
    },

    get parentContainer()
    {
        return this._parentContainer;
    },

    updateLayout: function()
    {
        // Implemented by subclasses.
    },

    shown: function()
    {
        // Implemented by subclasses.
    },

    hidden: function()
    {
        // Implemented by subclasses.
    },

    closed: function()
    {
        // Implemented by subclasses.
    },

    saveToCookie: function(cookie)
    {
        // Implemented by subclasses.
    },

    restoreFromCookie: function(cookie)
    {
        // Implemented by subclasses.
    },
};
