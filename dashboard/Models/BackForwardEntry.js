/*
 *  Copyright (C) 2013 University of Washington. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

WK.BackForwardEntry = function(dashboardView, cookie)
{
    WK.Object.call(this);

    console.assert(dashboardView instanceof WK.DashboardView, dashboardView);

    this._dashboardView = dashboardView;

    // Cookies are compared with Object.shallowEqual, so should not store objects or arrays.
    this._cookie = cookie || {};

    dashboardView.saveToCookie(this._cookie);
}

WK.BackForwardEntry.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.BackForwardEntry,

    // Public

    get dashboardView()
    {
        return this._dashboardView;
    },

    get cookie()
    {
        // Cookies are immutable; they represent a specific navigation action.
        return Object.shallowCopy(this._cookie);
    },

    prepareToShow: function(shouldCallShown)
    {
        this._restoreFromCookie();

        this.dashboardView.visible = true;
        if (shouldCallShown)
            this.dashboardView.shown();
        this.dashboardView.updateLayout();
    },

    prepareToHide: function()
    {
        this.dashboardView.visible = false;
        this.dashboardView.hidden();
    },

    // Private

    _restoreFromCookie: function()
    {
        this.dashboardView.restoreFromCookie(this.cookie);
    },

};
